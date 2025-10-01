/**
 * ATOMIC PAYMENT CONTROLLER
 * 
 * This replaces the complex payment flow with a simple, atomic approach:
 * 1. Create order in DRAFT state (no stock deduction)
 * 2. Process payment
 * 3. On payment success -> atomically deduct stock and confirm order
 * 4. No reservations, workers, or race conditions
 */

import mongoose from 'mongoose';
import crypto from 'crypto';
import orderModel from '../models/orderModel.js';
import PaymentSession from '../models/paymentSessionModel.js';
import userModel from '../models/userModel.js';
import { atomicStockManager } from '../utils/atomicStockManager.js';
import { paymentOperationBreaker, orderCreationBreaker } from '../utils/circuitBreaker.js';
import { 
  PaymentError, 
  BusinessLogicError, 
  SystemError, 
  ValidationError,
  globalErrorHandler,
  asyncHandler,
  createSuccessResponse 
} from '../utils/errorHandler.js';

// PhonePe SDK imports
let PhonePeSDK;
try {
  const phonePeModule = await import('../sdk/phonepe.js');
  PhonePeSDK = phonePeModule.PhonePeSDK;
} catch (error) {
  console.error('Failed to import PhonePe SDK:', error);
}

/**
 * ATOMIC: Create payment session and draft order
 * Stock validation only - no reservations
 */
export const createAtomicPaymentSession = asyncHandler(async (req, res) => {
  const correlationId = req.headers['x-request-id'] || `atomic_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  console.log(`[${correlationId}] Starting atomic payment session creation`);

  await orderCreationBreaker.execute(async () => {
    const session = await mongoose.startSession();
    
    try {
      await session.withTransaction(async () => {
        const {
          items,
          customerDetails,
          shippingDetails,
          totalAmount,
          paymentMethod,
          source = 'web'
        } = req.body;

        // 1. Validate input
        if (!items || !Array.isArray(items) || items.length === 0) {
          throw new ValidationError('Cart items are required', { correlationId });
        }

        if (!customerDetails?.email || !customerDetails?.phone) {
          throw new ValidationError('Customer email and phone are required', { correlationId });
        }

        if (!totalAmount || totalAmount <= 0) {
          throw new ValidationError('Valid total amount is required', { correlationId });
        }

        // 2. Validate stock availability (but don't reserve)
        console.log(`[${correlationId}] Validating stock for ${items.length} items`);
        const stockValidation = await atomicStockManager.validateCartStock(items, { correlationId });
        
        if (!stockValidation.valid) {
          throw new BusinessLogicError(`Stock validation failed: ${stockValidation.errors.join(', ')}`, {
            stockErrors: stockValidation.errors,
            correlationId
          });
        }

        // 3. Create draft order (no stock deduction)
        const orderId = `SHITH${Date.now()}${Math.floor(Math.random() * 1000)}`;
        const phonepeTransactionId = `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        const orderData = {
          orderId,
          phonepeTransactionId,
          userId: req.userId || null,
          customerDetails,
          shippingDetails,
          items: items.map(item => ({
            productId: item.productId || item._id,
            name: item.name,
            size: item.size,
            quantity: item.quantity,
            price: item.price,
            image: item.image
          })),
          totalAmount,
          paymentMethod: paymentMethod || 'phonepe',
          status: 'DRAFT', // CRITICAL: Order starts as DRAFT
          paymentStatus: 'PENDING',
          stockConfirmed: false, // Stock not yet deducted
          source,
          createdAt: new Date(),
          updatedAt: new Date()
        };

        const order = new orderModel(orderData);
        await order.save({ session });

        console.log(`[${correlationId}] Created draft order: ${orderId}`);

        // 4. Initialize PhonePe payment
        if (!PhonePeSDK) {
          throw new SystemError('PhonePe SDK not available', { correlationId });
        }

        const phonePeClient = new PhonePeSDK(process.env.PHONEPE_ENVIRONMENT || 'UAT');
        const totalAmountPaisa = Math.round(totalAmount * 100);

        const paymentRequest = {
          merchantTransactionId: phonepeTransactionId,
          amount: totalAmountPaisa,
          callbackUrl: `${process.env.BACKEND_URL}/api/payment/phonepe/callback`,
          merchantUserId: req.userId || `guest_${Date.now()}`,
          redirectUrl: `${process.env.FRONTEND_URL}/order-confirmation`,
          paymentInstrument: {
            type: 'PAY_PAGE'
          }
        };

        console.log(`[${correlationId}] Creating PhonePe payment request:`, paymentRequest);
        const paymentResponse = await phonePeClient.pay(paymentRequest);

        if (!paymentResponse.success || !paymentResponse.data?.instrumentResponse?.redirectInfo?.url) {
          throw new PaymentError('Failed to create PhonePe payment session', {
            phonepeResponse: paymentResponse,
            correlationId
          });
        }

        // 5. Create payment session record
        const paymentSession = new PaymentSession({
          sessionId: phonepeTransactionId,
          orderId: order._id,
          phonepeTransactionId,
          amount: totalAmount,
          status: 'created',
          phonepeResponse: paymentResponse.data,
          expiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes
          correlationId,
          createdAt: new Date()
        });

        await paymentSession.save({ session });

        console.log(`[${correlationId}] Payment session created successfully`);

        return res.json(createSuccessResponse({
          orderId: order._id,
          orderNumber: orderId,
          phonepeTransactionId,
          paymentUrl: paymentResponse.data.instrumentResponse.redirectInfo.url,
          totalAmount,
          expiresAt: paymentSession.expiresAt
        }, 'Payment session created successfully'));
      });

    } catch (error) {
      const appError = globalErrorHandler.handleError(error, {
        operation: 'createAtomicPaymentSession',
        correlationId,
        body: req.body
      });
      throw appError;
    } finally {
      await session.endSession();
    }
  });
});

/**
 * ATOMIC: PhonePe Callback Handler
 * On payment success -> atomically deduct stock and confirm order
 */
export const handleAtomicPaymentCallback = asyncHandler(async (req, res) => {
  const correlationId = req.headers['x-request-id'] || `callback_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  console.log(`[${correlationId}] Processing atomic payment callback`);

  await paymentOperationBreaker.execute(async () => {
    const session = await mongoose.startSession();

    try {
      await session.withTransaction(async () => {
        // 1. Extract PhonePe response
        const phonepeResponse = req.body;
        const merchantTransactionId = phonepeResponse.transactionId || phonepeResponse.merchantTransactionId;

        if (!merchantTransactionId) {
          throw new ValidationError('Missing transaction ID in PhonePe callback', {
            phonepeResponse,
            correlationId
          });
        }

        console.log(`[${correlationId}] Processing callback for transaction: ${merchantTransactionId}`);

        // 2. Find draft order
        const order = await orderModel.findOne({
          phonepeTransactionId: merchantTransactionId,
          status: 'DRAFT'
        }).session(session);

        if (!order) {
          console.log(`[${correlationId}] No draft order found for transaction: ${merchantTransactionId}`);
          return res.json({ success: true, message: 'Order not found or already processed' });
        }

        // 3. Verify payment status
        const paymentSuccessful = phonepeResponse.code === 'PAYMENT_SUCCESS' || 
                                 phonepeResponse.state === 'COMPLETED' ||
                                 phonepeResponse.status === 'SUCCESS';

        if (paymentSuccessful) {
          console.log(`[${correlationId}] Payment successful for order: ${order.orderId}`);

          // 4. ATOMIC: Deduct stock and confirm order
          try {
            const stockResult = await atomicStockManager.confirmAndDeductStock(
              order.items,
              { session, correlationId }
            );

            console.log(`[${correlationId}] Stock deducted successfully:`, stockResult);

            // 5. Update order to CONFIRMED
            await orderModel.findByIdAndUpdate(
              order._id,
              {
                status: 'CONFIRMED',
                paymentStatus: 'PAID',
                stockConfirmed: true,
                stockConfirmedAt: new Date(),
                confirmedAt: new Date(),
                paidAt: new Date(),
                phonepeResponse: phonepeResponse,
                updatedAt: new Date()
              },
              { session }
            );

            // 6. Update payment session
            await PaymentSession.findOneAndUpdate(
              { phonepeTransactionId: merchantTransactionId },
              {
                status: 'success',
                processedAt: new Date(),
                phonepeResponse: phonepeResponse
              },
              { session }
            );

            // 7. Clear user cart (if applicable)
            if (order.userId) {
              try {
                await userModel.findByIdAndUpdate(
                  order.userId,
                  { cartData: {} },
                  { session }
                );
                console.log(`[${correlationId}] User cart cleared for user: ${order.userId}`);
              } catch (cartError) {
                console.error(`[${correlationId}] Failed to clear cart:`, cartError);
                // Don't fail the transaction for cart clearing
              }
            }

            console.log(`[${correlationId}] Order ${order.orderId} confirmed successfully`);

          } catch (stockError) {
            console.error(`[${correlationId}] Stock deduction failed:`, stockError);

            // Stock deduction failed - mark order as failed
            await orderModel.findByIdAndUpdate(
              order._id,
              {
                status: 'FAILED',
                paymentStatus: 'PAID_BUT_FAILED',
                failureReason: `Stock deduction failed: ${stockError.message}`,
                failedAt: new Date(),
                phonepeResponse: phonepeResponse,
                updatedAt: new Date()
              },
              { session }
            );

            // This will be handled manually - payment succeeded but stock failed
            console.error(`[${correlationId}] ⚠️ MANUAL INTERVENTION REQUIRED: Payment successful but stock deduction failed for order ${order.orderId}`);
            
            throw new SystemError('Payment successful but order processing failed. Manual review required.', {
              orderId: order._id,
              orderNumber: order.orderId,
              correlationId,
              phonepeTransactionId: merchantTransactionId,
              stockError: stockError.message
            });
          }

        } else {
          console.log(`[${correlationId}] Payment failed for order: ${order.orderId}`);

          // Payment failed - cancel draft order
          await orderModel.findByIdAndUpdate(
            order._id,
            {
              status: 'CANCELLED',
              paymentStatus: 'FAILED',
              cancelledAt: new Date(),
              cancellationReason: `Payment failed: ${phonepeResponse.code || phonepeResponse.state}`,
              phonepeResponse: phonepeResponse,
              updatedAt: new Date()
            },
            { session }
          );

          await PaymentSession.findOneAndUpdate(
            { phonepeTransactionId: merchantTransactionId },
            {
              status: 'failed',
              processedAt: new Date(),
              phonepeResponse: phonepeResponse
            },
            { session }
          );

          console.log(`[${correlationId}] Order ${order.orderId} cancelled due to payment failure`);
        }

        return res.json({ success: true, message: 'Callback processed successfully' });
      });

    } catch (error) {
      const appError = globalErrorHandler.handleError(error, {
        operation: 'handleAtomicPaymentCallback',
        correlationId,
        phonepeResponse: req.body
      });
      throw appError;
    } finally {
      await session.endSession();
    }
  });
});

/**
 * ATOMIC: Verify Payment Status
 * Used by frontend to check payment result
 */
export const verifyAtomicPayment = asyncHandler(async (req, res) => {
  const { transactionId } = req.params;
  const correlationId = req.headers['x-request-id'] || `verify_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  await paymentOperationBreaker.execute(async () => {
    try {
      // Find order by transaction ID
      const order = await orderModel.findOne({
        phonepeTransactionId: transactionId
      });

      if (!order) {
        throw new BusinessLogicError('Order not found', {
          transactionId,
          correlationId
        });
      }

      // If order is still DRAFT, try to verify payment status with PhonePe
      if (order.status === 'DRAFT' && PhonePeSDK) {
        try {
          const phonePeClient = new PhonePeSDK(process.env.PHONEPE_ENVIRONMENT || 'UAT');
          const paymentStatus = await phonePeClient.checkStatus(transactionId);

          if (paymentStatus.success && paymentStatus.data?.state === 'COMPLETED') {
            // Payment is successful but callback might have failed
            // Trigger callback processing manually
            console.log(`[${correlationId}] Found completed payment for DRAFT order, processing...`);
            
            const mockCallbackData = {
              transactionId: transactionId,
              state: 'COMPLETED',
              code: 'PAYMENT_SUCCESS',
              merchantTransactionId: transactionId
            };

            // Process the callback manually
            req.body = mockCallbackData;
            return await handleAtomicPaymentCallback(req, res);
          }
        } catch (verifyError) {
          console.error(`[${correlationId}] PhonePe verification failed:`, verifyError);
        }
      }

      // Return current order status
      return res.json(createSuccessResponse({
        orderId: order._id,
        orderNumber: order.orderId,
        status: order.status,
        paymentStatus: order.paymentStatus,
        stockConfirmed: order.stockConfirmed,
        totalAmount: order.totalAmount,
        createdAt: order.createdAt,
        confirmedAt: order.confirmedAt,
        transactionId: order.phonepeTransactionId
      }, 'Payment status retrieved successfully'));

    } catch (error) {
      const appError = globalErrorHandler.handleError(error, {
        operation: 'verifyAtomicPayment',
        transactionId,
        correlationId
      });
      throw appError;
    }
  });
});

/**
 * ATOMIC: Cancel Order (before payment)
 * Used if user abandons payment
 */
export const cancelAtomicOrder = asyncHandler(async (req, res) => {
  const { orderId } = req.params;
  const correlationId = req.headers['x-request-id'] || `cancel_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  try {
    const order = await orderModel.findById(orderId);

    if (!order) {
      throw new BusinessLogicError('Order not found', {
        orderId,
        correlationId
      });
    }

    if (order.status !== 'DRAFT') {
      throw new BusinessLogicError('Only draft orders can be cancelled', {
        orderId,
        currentStatus: order.status,
        correlationId
      });
    }

    // Cancel the draft order (no stock to restore since it was never deducted)
    await orderModel.findByIdAndUpdate(orderId, {
      status: 'CANCELLED',
      paymentStatus: 'CANCELLED',
      cancelledAt: new Date(),
      cancellationReason: 'User cancelled',
      updatedAt: new Date()
    });

    console.log(`[${correlationId}] Draft order ${order.orderId} cancelled by user`);

    return res.json(createSuccessResponse({
      orderId,
      orderNumber: order.orderId,
      status: 'CANCELLED'
    }, 'Order cancelled successfully'));

  } catch (error) {
    const appError = globalErrorHandler.handleError(error, {
      operation: 'cancelAtomicOrder',
      orderId,
      correlationId
    });
    throw appError;
  }
});

/**
 * Health check for atomic payment system
 */
export const getAtomicPaymentHealth = asyncHandler(async (req, res) => {
  try {
    const health = {
      paymentSystem: 'healthy',
      circuitBreakers: {
        paymentOperations: paymentOperationBreaker.getStatus(),
        orderCreation: orderCreationBreaker.getStatus()
      },
      stockSystem: await atomicStockManager.getStockHealthReport(),
      timestamp: new Date()
    };

    const unhealthyBreakers = Object.values(health.circuitBreakers)
      .filter(breaker => breaker.state !== 'CLOSED');

    if (unhealthyBreakers.length > 0) {
      health.paymentSystem = 'degraded';
      health.issues = unhealthyBreakers.map(b => `Circuit breaker ${b.name} is ${b.state}`);
    }

    return res.json(createSuccessResponse(health, 'Payment system health check'));

  } catch (error) {
    const appError = globalErrorHandler.handleError(error, {
      operation: 'getAtomicPaymentHealth'
    });
    throw appError;
  }
});

export default {
  createAtomicPaymentSession,
  handleAtomicPaymentCallback,
  verifyAtomicPayment,
  cancelAtomicOrder,
  getAtomicPaymentHealth
};
