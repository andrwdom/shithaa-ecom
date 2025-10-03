import orderModel from "../models/orderModel.js";
import userModel from "../models/userModel.js";
import productModel from "../models/productModel.js";
import PaymentSession from "../models/paymentSessionModel.js";
import CheckoutSession from "../models/CheckoutSession.js";
import Payment from "../models/Payment.js";
import PaymentEvent from "../models/PaymentEvent.js";
import { successResponse, errorResponse } from '../utils/response.js';
import { getUniqueOrderId } from './orderController.js';
import { trackPayment } from '../utils/monitoring.js';
import { StandardCheckoutClient, Env, StandardCheckoutPayRequest } from 'pg-sdk-node';
import { randomUUID } from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { generateInvoiceBuffer, sendInvoiceEmail } from '../utils/invoiceGenerator.js';
import { releaseStockReservation, reserveStock, confirmStockReservation } from '../utils/stock.js';
import { config } from '../config.js';
import mongoose from 'mongoose';
import Logger from '../utils/logger.js';
import EnhancedLogger from '../utils/enhancedLogger.js';

// Helper function to get user email for orders
const getOrderUserEmail = (req, email) => {
    return req.user?.email || email || `guest@${process.env.BASE_URL?.replace('https://', '').replace('http://', '') || 'shithaa.in'}`;
};

// Enhanced UPI decline handling for Indian market
const handleUPIDecline = (phonepeResponse, correlationId) => {
  const { code, message } = phonepeResponse;
  
  // Map PhonePe error codes to user-friendly messages
  const declineMessages = {
    'INSUFFICIENT_FUNDS': {
      title: 'Insufficient Balance',
      message: 'Add money to your UPI account and try again',
      action: 'Add Money & Retry',
      retryable: true
    },
    'BANK_ERROR': {
      title: 'Bank Server Error',
      message: 'Your bank is temporarily unavailable. Please try again in 2-3 minutes',
      action: 'Retry Payment',
      retryable: true
    },
    'UPI_PIN_INCORRECT': {
      title: 'Incorrect UPI PIN',
      message: 'Please enter the correct UPI PIN',
      action: 'Try Again',
      retryable: true
    },
    'TRANSACTION_DECLINED': {
      title: 'Transaction Declined',
      message: 'Your bank declined this transaction. Contact your bank if this continues',
      action: 'Contact Bank',
      retryable: false
    },
    'NETWORK_ERROR': {
      title: 'Network Issue',
      message: 'Poor internet connection. Please check your network and try again',
      action: 'Retry Payment',
      retryable: true
    },
    'TIMEOUT': {
      title: 'Payment Timeout',
      message: 'Payment took too long. Please try again',
      action: 'Retry Payment',
      retryable: true
    },
    'INVALID_UPI_ID': {
      title: 'Invalid UPI ID',
      message: 'Please check your UPI ID and try again',
      action: 'Check UPI ID',
      retryable: true
    }
  };
  
  const declineInfo = declineMessages[code] || {
    title: 'Payment Failed',
    message: message || 'Something went wrong. Please try again',
    action: 'Retry Payment',
    retryable: true
  };
  
  console.log(`[${correlationId}] UPI decline handled:`, {
    code,
    originalMessage: message,
    userFriendlyMessage: declineInfo.message,
    retryable: declineInfo.retryable
  });
  
  return {
    success: false,
    error: 'PAYMENT_DECLINED',
    declineInfo,
    originalCode: code,
    originalMessage: message
  };
};

// Enhanced atomic rollback with transaction support
const releaseStockOnPaymentFailure = async (paymentSession, correlationId) => {
  const checkoutSessionId = paymentSession.sessionId;
  
  if (!checkoutSessionId) {
    console.log(`[${correlationId}] No checkout session ID found, skipping stock release`);
    return;
  }

  const session = await mongoose.startSession();
  
  try {
    await session.withTransaction(async () => {
      console.log(`[${correlationId}] Starting atomic rollback for failed payment: ${checkoutSessionId}`);
      
      // Find the checkout session
      const checkoutSession = await CheckoutSession.findOne({ sessionId: checkoutSessionId }).session(session);
      
      if (!checkoutSession) {
        console.log(`[${correlationId}] Checkout session not found: ${checkoutSessionId}`);
        return;
      }
      
      if (!checkoutSession.stockReserved) {
        console.log(`[${correlationId}] No stock reserved for session: ${checkoutSessionId}`);
        return;
      }
      
      // Atomic stock release for all items
      const stockOperations = [];
      for (const item of checkoutSession.items) {
        try {
          // Use atomic stock release with session
          const result = await productModel.updateOne(
            { 
              _id: item.productId,
              'sizes.size': item.size
            },
            { 
              $inc: { 
                'sizes.$.reserved': -item.quantity,
                'sizes.$.available': item.quantity
              }
            },
            { session }
          );
          
          if (result.modifiedCount === 0) {
            throw new Error(`Failed to release stock for ${item.name} (${item.size})`);
          }
          
          stockOperations.push({
            productId: item.productId,
            size: item.size,
            quantity: item.quantity,
            success: true
          });
          
          console.log(`[${correlationId}] ✅ Released stock for ${item.name} (${item.size}) x${item.quantity}`);
        } catch (error) {
          stockOperations.push({
            productId: item.productId,
            size: item.size,
            quantity: item.quantity,
            success: false,
            error: error.message
          });
          console.error(`[${correlationId}] ❌ Failed to release stock for ${item.name}:`, error);
        }
      }
      
      // Mark session as failed and release stock flag
      checkoutSession.stockReserved = false;
      checkoutSession.status = 'failed';
      checkoutSession.failedAt = new Date();
      await checkoutSession.save({ session });
      
      // Log rollback results
      const successCount = stockOperations.filter(op => op.success).length;
      const failCount = stockOperations.filter(op => !op.success).length;
      
      console.log(`[${correlationId}] ✅ Atomic rollback completed. Success: ${successCount}, Failed: ${failCount}`);
      
      if (failCount > 0) {
        console.error(`[${correlationId}] ❌ Some stock rollbacks failed:`, stockOperations.filter(op => !op.success));
      }
    });
    
  } catch (error) {
    console.error(`[${correlationId}] ❌ Atomic rollback failed:`, error);
    
    // If atomic rollback fails, try individual rollbacks as fallback
    try {
      const checkoutSession = await CheckoutSession.findOne({ sessionId: checkoutSessionId });
      if (checkoutSession && checkoutSession.stockReserved) {
        for (const item of checkoutSession.items) {
          try {
            await releaseStockReservation(item.productId, item.size, item.quantity);
            console.log(`[${correlationId}] ✅ Fallback stock release for ${item.name}`);
          } catch (fallbackError) {
            console.error(`[${correlationId}] ❌ Fallback stock release failed for ${item.name}:`, fallbackError);
          }
        }
      }
    } catch (fallbackError) {
      console.error(`[${correlationId}] ❌ Complete rollback failure:`, fallbackError);
    }
  } finally {
    await session.endSession();
  }
};

// Fallback function for non-transactional payment processing
const processPaymentWithoutTransaction = async (paymentSession, merchantTransactionId, correlationId, phonepeResponse) => {
  console.log(`[${correlationId}] Processing payment without transaction (fallback mode)`);
  
  try {
    // 1. Check if order already exists (idempotency check)
    const existingOrder = await orderModel.findOne({
      phonepeTransactionId: merchantTransactionId
    });
    
    if (existingOrder) {
      console.log(`[${correlationId}] Order already exists for transaction ${merchantTransactionId}, skipping creation`);
      return existingOrder;
    }

    // 2. Validate payment session data
    const orderPayload = paymentSession.orderPayload;
    if (!orderPayload) {
      throw new Error('Order payload is missing from payment session');
    }

    // 3. Prepare order data
    orderPayload.paymentStatus = 'PAID';
    orderPayload.orderStatus = 'PENDING';
    orderPayload.status = 'Pending';
    orderPayload.paidAt = new Date();
    orderPayload.phonepeResponse = phonepeResponse;
    orderPayload.stockConfirmed = false;

    // 4. Create order
    const order = await orderModel.create(orderPayload);
    const createdOrder = order;
    console.log(`[${correlationId}] Order created (non-transactional):`, createdOrder.orderId);

    // 5. Confirm stock reservation (deduct stock)
    const { confirmStockReservation } = await import('../utils/stock.js');
    const itemsToProcess = createdOrder.cartItems && createdOrder.cartItems.length > 0 
      ? createdOrder.cartItems 
      : createdOrder.items;

    if (!itemsToProcess || itemsToProcess.length === 0) {
      throw new Error('Order has no items to process');
    }

    // Process each item
    for (const item of itemsToProcess) {
      const productId = item.productId || item._id || item.id || item.product;
      
      if (!productId || !item.size || !item.quantity) {
        throw new Error(`Invalid item data: ${JSON.stringify(item)}`);
      }

      console.log(`[${correlationId}] Confirming stock for:`, item.name, 'Product:', productId, 'Size:', item.size, 'Qty:', item.quantity);
      
      const stockConfirmed = await confirmStockReservation(
        productId, 
        item.size, 
        item.quantity
      );
      
      if (!stockConfirmed) {
        throw new Error(`Stock confirmation failed for ${item.name} (${item.size}) - insufficient stock or reservation`);
      }
    }

    // 6. Mark order as stock confirmed
    await orderModel.findByIdAndUpdate(
      createdOrder._id, 
      { 
        stockConfirmed: true,
        stockConfirmedAt: new Date(),
        updatedAt: new Date()
      }
    );

    // 7. Update payment session status
    await PaymentSession.findByIdAndUpdate(
      paymentSession._id,
      {
        status: 'success',
        orderId: createdOrder._id,
        phonepeResponse: phonepeResponse
      }
    );

    console.log(`[${correlationId}] Non-transactional payment processing completed successfully for order:`, createdOrder.orderId);
    return createdOrder;

  } catch (error) {
    console.error(`[${correlationId}] Non-transactional payment processing failed:`, error);
    
    // Try to rollback by releasing stock
    try {
      await releaseStockOnPaymentFailure(paymentSession, correlationId);
    } catch (rollbackError) {
      console.error(`[${correlationId}] Rollback failed:`, rollbackError);
    }
    
    throw error;
  }
};

// Helper function to initialize PhonePe client
const initializePhonePeClient = () => {
    const { phonepe } = config;

    if (!phonepe.merchant_id || !phonepe.api_key) {
        console.error('PhonePe credentials missing, cannot initialize client');
        console.error('Available config:', {
            merchant_id: phonepe.merchant_id ? 'SET' : 'MISSING',
            api_key: phonepe.api_key ? 'SET' : 'MISSING',
            salt_index: phonepe.salt_index,
            env: phonepe.env
        });
        return null;
    }

    try {
        console.log('🔍 DEBUG: Initializing PhonePe client with credentials:', {
            merchant_id: phonepe.merchant_id,
            api_key: phonepe.api_key ? 'SET' : 'MISSING',
            salt_index: phonepe.salt_index,
            env: phonepe.env
        });
        
        // 🔧 CRITICAL FIX: Try to create a fresh client instance each time
        // instead of using getInstance which might be caching a failed authentication
        const client = StandardCheckoutClient.getInstance(
            phonepe.merchant_id,
            phonepe.api_key,
            phonepe.salt_index,
            phonepe.env === 'PRODUCTION' ? Env.PRODUCTION : Env.SANDBOX
        );
        
        console.log('🔍 DEBUG: PhonePe client created:', {
            clientExists: !!client,
            clientType: typeof client,
            clientConstructor: client?.constructor?.name
        });
        
        // 🔧 CRITICAL FIX: Validate client structure - check for both method names
        const hasGetOrderStatus = client && typeof client.getOrderStatus === 'function';
        const hasGetStatus = client && typeof client.getStatus === 'function';
        
        if (!client || (!hasGetOrderStatus && !hasGetStatus)) {
            console.error('PhonePe client initialized but missing required methods:', {
                clientExists: !!client,
                hasGetOrderStatus,
                hasGetStatus,
                clientKeys: client ? Object.keys(client) : 'NO_CLIENT'
            });
            return null;
        }
        
        console.log('PhonePe client initialized successfully with required methods');
        return client;
    } catch (initError) {
        console.error('PhonePe client initialization failed:', initError);
        console.error('Initialization error details:', {
            message: initError.message,
            stack: initError.stack,
            config: {
                merchant_id: phonepe.merchant_id ? 'SET' : 'MISSING',
                api_key: phonepe.api_key ? 'SET' : 'MISSING',
                salt_index: phonepe.salt_index,
                env: phonepe.env
            }
        });
        return null;
    }
};

// Helper function to update product stock (reserve or restore)
const updateProductStock = async (items) => {
    const { batchChangeStock } = await import('../utils/stock.js');
    
    try {
        const operations = items.map(item => ({
            productId: item._id,
            size: item.size,
            quantityChange: -item.quantity
        }));
        
        const results = await batchChangeStock(operations);
        console.log('Stock updated successfully for payment session:', results);
        return results;
    } catch (error) {
        console.error('Stock update failed for payment session:', error);
        throw new Error(`Stock update failed: ${error.message}`);
    }
};

// Helper function to restore product stock (for failed payments)
const restoreProductStock = async (items) => {
    const { batchChangeStock, validateStockForItems } = await import('../utils/stock.js');
    
    try {
        // First validate the items to ensure they exist
        console.log('Validating items before stock restoration:', items);
        const validations = await validateStockForItems(items);
        const invalidItems = validations.filter(v => !v.available);
        
        if (invalidItems.length > 0) {
            console.error('Some items failed validation for stock restoration:', invalidItems);
            throw new Error(`Invalid items for stock restoration: ${invalidItems.map(i => i.error).join(', ')}`);
        }

        // Map items to stock operations
        const operations = items.map(item => {
            const productId = item.productId || item._id; // Handle both formats
            if (!productId) {
                throw new Error(`Missing product ID for item: ${JSON.stringify(item)}`);
            }
            return {
                productId,
                size: item.size,
                quantityChange: item.quantity // Positive for restoration
            };
        });
        
        console.log('Attempting stock restoration with operations:', operations);
        
        const results = await batchChangeStock(operations);
        console.log('Stock restored successfully:', {
            operations,
            results,
            itemCount: items.length,
            totalQuantity: items.reduce((sum, item) => sum + item.quantity, 0)
        });
        
        return results;
    } catch (error) {
        console.error('Stock restoration failed:', {
            error: error.message,
            stack: error.stack,
            items: items.map(item => ({
                productId: item.productId || item._id,
                size: item.size,
                quantity: item.quantity
            }))
        });
        throw new Error(`Stock restoration failed: ${error.message}`);
    }
};

// Helper to clean mobile number for PhonePe (10 digits, no country code)
function cleanMobileNumber(number) {
  if (!number) return '';
  const digits = number.replace(/\D/g, '');
  return digits.slice(-10);
}

// Create PhonePe payment session using SDK with DRAFT ORDER PATTERN
export const createPhonePeSession = async (req, res) => {
  const correlationId = req.headers['x-request-id'] || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const idempotencyKey = req.headers['idempotency-key'] || uuidv4(); // Client sends this, or generate
  
  try {
    const { checkoutSessionId, shipping, cartItems, orderSummary, userId, email, checkoutMode } = req.body;
    
    // Log payment initiation
    Logger.payment(correlationId, 'initiated', {
      checkoutSessionId,
      idempotencyKey,
      userId,
      email,
      amount: orderSummary?.total,
      itemCount: cartItems?.length || 0,
      checkoutMode
    });
    
    console.log(`[${correlationId}] Creating PhonePe payment session with DRAFT ORDER pattern`);
    console.log(`[${correlationId}] Idempotency Key: ${idempotencyKey}`);
    
    if (!checkoutSessionId) {
      Logger.warn('payment_missing_session', { correlationId });
      return res.status(400).json({
        success: false,
        message: 'Checkout session ID is required'
      });
    }
    
    // Get checkout session
    const checkoutSession = await CheckoutSession.findOne({ sessionId: checkoutSessionId });
    if (!checkoutSession) {
      return res.status(404).json({
        success: false,
        message: 'Checkout session not found'
      });
    }
    
    if (checkoutSession.isExpired()) {
      return res.status(410).json({
        success: false,
        message: 'Checkout session has expired'
      });
    }
    
    // 🔑 STEP 1: IDEMPOTENCY CHECK - If same key exists and not failed, reuse
    const existingOrder = await orderModel.findOne({ 
      idempotencyKey, 
      status: { $ne: 'CANCELLED' } // Reuse if not cancelled
    });
    
    if (existingOrder) {
      console.log(`[${correlationId}] Reusing existing order for idempotency key: ${idempotencyKey}`);
      return res.json({
        success: true,
        orderId: existingOrder._id, // Give customer order ref upfront
        phonepeTransactionId: existingOrder.phonepeTransactionId,
        redirectUrl: existingOrder.metadata?.phonepeRedirectUrl,
        message: 'Session reused for safety'
      });
    }
    
    // 🔑 STEP 2: VALIDATE UPFRONT (stock, etc.) - Fail fast, no payment if issues
    console.log(`[${correlationId}] Validating stock and cart data upfront`);
    
    // 🔑 CRITICAL: Check if stock is already reserved
    if (checkoutSession.stockReserved) {
      console.log(`[${correlationId}] ✅ Stock already reserved, proceeding to draft order creation`);
    } else {
      console.log(`[${correlationId}] ⚠️  Stock NOT reserved yet - this should not happen in the new flow!`);
      // Validate stock availability as fallback
      const { checkStockAvailability } = await import('../utils/stock.js');
          
      for (const item of checkoutSession.items) {
        const availability = await checkStockAvailability(item.productId, item.size, item.quantity);
        if (!availability.available) {
          console.error(`[${correlationId}] Stock not available for ${item.name}:`, availability);
          return res.status(409).json({
            success: false,
            message: `Out of stock: ${item.name} (${item.size})`
          });
        }
      }
    }
    
    const userEmail = email || checkoutSession.userEmail;
    
    // 🔑 STEP 3: CREATE DRAFT ORDER IMMEDIATELY (with temp stock reserve)
    console.log(`[${correlationId}] Creating DRAFT order immediately`);
    
    const phonepeTransactionId = randomUUID();
    const orderId = await getUniqueOrderId();
    
    // Start MongoDB transaction for atomicity
    const session = await mongoose.startSession();
    
    try {
      await session.withTransaction(async () => {
        // Create DRAFT order immediately
        const draftOrder = await orderModel.create([{
      orderId,
      userInfo: {
        userId: checkoutSession.userId,
        email: userEmail,
            name: shipping.fullName
      },
      shippingInfo: {
        fullName: shipping.fullName,
        email: userEmail,
        phone: shipping.phone,
        addressLine1: shipping.addressLine1,
        addressLine2: shipping.addressLine2 || '',
        city: shipping.city,
        state: shipping.state,
        postalCode: shipping.postalCode,
        country: shipping.country || 'India'
      },
      cartItems: checkoutSession.items,
      items: checkoutSession.items, // Legacy compatibility
      totalAmount: checkoutSession.total,
          total: checkoutSession.total,
      subtotal: checkoutSession.subtotal,
      shippingCost: checkoutSession.shippingCost || 0,
      offerDetails: checkoutSession.offerDetails || {
        offerApplied: false,
        offerType: null,
        offerDiscount: 0,
        offerDescription: null,
        offerCalculation: {
          completeSets: 0,
          remainingItems: 0,
          originalPrice: 0,
          offerPrice: 0,
          savings: 0
        }
      },
          status: 'DRAFT', // Key: Draft status
          orderStatus: 'DRAFT',
          paymentStatus: 'PENDING',
      paymentMethod: 'PhonePe',
      phonepeTransactionId,
          idempotencyKey, // Critical for idempotency
          stockReserved: false, // Will be set to true after stock reservation
          stockConfirmed: false,
          draftCreatedAt: new Date(),
      metadata: {
        checkoutSessionId,
        correlationId,
            source: checkoutSession.source,
            idempotencyKey
          }
        }], { session });

        const createdDraftOrder = draftOrder[0];
        console.log(`[${correlationId}] DRAFT order created: ${createdDraftOrder.orderId}`);

        // 🔑 Stock is ALREADY reserved in checkout session, just mark the order
        console.log(`[${correlationId}] ✅ Using pre-reserved stock from checkout session`);
        
          await orderModel.findByIdAndUpdate(
            createdDraftOrder._id,
            { stockReserved: true },
            { session }
          );
        
        // Update checkout session status
          checkoutSession.status = 'awaiting_payment';
          await checkoutSession.save({ session });

        console.log(`[${correlationId}] Draft order linked to reserved stock`);
        Logger.info('draft_order_created', {
            correlationId,
            checkoutSessionId,
            orderId: createdDraftOrder.orderId,
          itemCount: checkoutSession.items.length,
          stockAlreadyReserved: true
          });
      });
    } catch (error) {
      console.error(`[${correlationId}] Draft order creation failed:`, error);
      return res.status(500).json({
        success: false,
        message: 'Failed to create draft order',
        error: error.message
      });
    } finally {
      await session.endSession();
    }

    // 🔑 STEP 4: CREATE PHONEPE PAYMENT SESSION
    console.log(`[${correlationId}] Creating PhonePe payment session for draft order`);
    
    // Get the created draft order
    const draftOrder = await orderModel.findOne({ idempotencyKey });
    if (!draftOrder) {
      throw new Error('Draft order not found after creation');
    }

    // Create PhonePe payment request
    const redirectUrl = `${process.env.FRONTEND_URL || 'https://shithaa.in'}/payment/phonepe/callback?merchantTransactionId=${phonepeTransactionId}`;
    
    // Calculate final amount including shipping
    const finalAmount = checkoutSession.total;
    const amountInPaise = Math.round(finalAmount * 100);
    
    console.log(`[${correlationId}] PhonePe payment details:`, {
      merchantOrderId: phonepeTransactionId,
      amount: amountInPaise,
      redirectUrl
    });

    const request = StandardCheckoutPayRequest.builder()
      .merchantOrderId(phonepeTransactionId)
      .amount(amountInPaise)
      .redirectUrl(redirectUrl)
      .build();

    // Get PhonePe client instance
    const phonepeClient = initializePhonePeClient();
    if (!phonepeClient) {
      // If PhonePe fails, cancel the draft order and release stock
      await cancelDraftOrder(draftOrder._id, 'PhonePe client initialization failed');
      return res.status(500).json({
        success: false,
        message: 'Payment service not available',
        error: 'PhonePe client initialization failed'
      });
    }

    try {
      const response = await phonepeClient.pay(request);
      
      if (response && response.redirectUrl) {
        // Update draft order with PhonePe response
        await orderModel.findByIdAndUpdate(draftOrder._id, {
          'metadata.phonepeRedirectUrl': response.redirectUrl,
          'metadata.phonepeResponse': {
            redirectUrl: response.redirectUrl,
            merchantOrderId: phonepeTransactionId,
            responseCode: response.code || 'SUCCESS',
            responseMessage: response.message || 'Payment session created'
          }
        });

        console.log(`[${correlationId}] PhonePe payment session created successfully`);

        return res.json({
          success: true,
          orderId: draftOrder._id, // Customer gets this immediately
          phonepeTransactionId: phonepeTransactionId,
          redirectUrl: response.redirectUrl,
          message: 'Draft order created - proceed to pay'
        });
      } else {
        // Handle PhonePe failure with UPI decline logic
        const declineResult = handleUPIDecline(response, correlationId);
        
        // Cancel draft order and release stock on failure
        await cancelDraftOrder(draftOrder._id, `PhonePe failure: ${declineResult.originalMessage}`);
        
        return res.status(400).json({
          success: false,
          error: declineResult.error,
          declineInfo: declineResult.declineInfo,
          message: declineResult.declineInfo.message,
          retryable: declineResult.declineInfo.retryable,
          originalCode: declineResult.originalCode
        });
      }
    } catch (error) {
      console.error(`[${correlationId}] PhonePe payment creation failed:`, error);
      
      // Cancel draft order and release stock on PhonePe failure
      await cancelDraftOrder(draftOrder._id, `PhonePe API error: ${error.message}`);

      return res.status(500).json({
        success: false,
        message: 'Payment service temporarily unavailable',
        error: error.message
      });
    }
  } catch (error) {
    console.error(`[${correlationId}] === PhonePe SDK Session Creation Error ===`);
    console.error(`[${correlationId}] Error details:`, error);
    console.error(`[${correlationId}] Error stack:`, error.stack);
    console.error(`[${correlationId}] Error message:`, error.message);
    
    res.status(500).json({
      success: false,
      message: 'Payment session creation failed',
      error: error.message
    });
  }
};

// Helper function to cancel draft orders and release stock
async function cancelDraftOrder(orderId, reason) {
  try {
    console.log(`Cancelling draft order ${orderId}: ${reason}`);
    
    const order = await orderModel.findById(orderId);
    if (!order) {
      console.log(`Order ${orderId} not found for cancellation`);
      return;
    }

    // Release stock if it was reserved
    if (order.stockReserved && order.cartItems) {
      for (const item of order.cartItems) {
        try {
          await releaseStockReservation(item.productId, item.size, item.quantity);
          console.log(`Released stock for ${item.name} (${item.size}) x${item.quantity}`);
        } catch (error) {
          console.error(`Failed to release stock for ${item.name}:`, error);
        }
      }
    }

    // Update order status
    await orderModel.findByIdAndUpdate(orderId, {
      status: 'CANCELLED',
      orderStatus: 'CANCELLED',
      paymentStatus: 'FAILED',
      metadata: {
        ...order.metadata,
        cancellationReason: reason,
        cancelledAt: new Date()
      }
    });

    console.log(`Draft order ${orderId} cancelled successfully`);
  } catch (error) {
    console.error(`Failed to cancel draft order ${orderId}:`, error);
  }
}

// PhonePe payment callback using SDK - ATOMIC VERSION
export const phonePeCallback = async (req, res) => {
  const correlationId = req.headers['x-request-id'] || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  try {
    console.log(`[${correlationId}] PhonePe callback received:`, req.body);
    
    const { merchantTransactionId, state, responseCode, responseMessage } = req.body;
    
    if (!merchantTransactionId) {
      return res.status(400).json({
        success: false,
        message: 'Missing merchant transaction ID'
      });
    }

    // Find the payment session by PhonePe transaction ID
    const paymentSession = await PaymentSession.findOne({ phonepeTransactionId: merchantTransactionId });
    
    if (!paymentSession) {
      console.error('Payment session not found for PhonePe transaction:', merchantTransactionId);
      return res.status(404).json({
        success: false,
        message: 'Payment session not found'
      });
    }

    console.log('Found payment session:', paymentSession._id, 'Status:', paymentSession.status);

    // 🔧 CRITICAL FIX: Check for both success and explicit failure states
    const isSuccess = (
      state === 'PAID' ||
      state === 'COMPLETED' ||
      responseCode === 'SUCCESS' ||
      responseCode === '000'
    );
    
    // Check for explicit failure or timeout
    const isFailedOrAbandoned = (
      state === 'FAILED' ||
      state === 'CANCELLED' ||
      state === 'TIMEOUT' ||
      responseCode === 'PAYMENT_ERROR' ||
      responseCode === 'PAYMENT_CANCELLED' ||
      responseCode === 'PAYMENT_TIMEOUT' ||
      // If we get any response and it's not success, treat it as failure
      (!isSuccess && (state || responseCode))
    );

    if (isSuccess) {
      console.log('Payment successful, processing atomic transaction');
      
      // Track successful payment
      trackPayment(true);

      // 🔑 CRITICAL FIX: ATOMIC TRANSACTION - All operations in one transaction
      const session = await mongoose.startSession();
      
      try {
        await session.withTransaction(async () => {
          // 1. Check if order already exists (idempotency check)
          const existingOrder = await orderModel.findOne({ 
            phonepeTransactionId: merchantTransactionId 
          }).session(session);
          
          if (existingOrder) {
            console.log(`[${correlationId}] Order already exists for transaction ${merchantTransactionId}, skipping creation`);
            return existingOrder;
          }

          // 2. Validate payment session data
          const orderPayload = paymentSession.orderPayload;
        if (!orderPayload) {
          throw new Error('Order payload is missing from payment session');
        }
        
          // 3. Prepare order data
        orderPayload.paymentStatus = 'paid';
        orderPayload.orderStatus = 'Pending';
        orderPayload.status = 'Pending';
        orderPayload.paidAt = new Date();
        orderPayload.phonepeResponse = req.body;
          orderPayload.stockConfirmed = false; // Will be set to true after stock confirmation

          // 4. Create order atomically
          const order = await orderModel.create([orderPayload], { session });
          const createdOrder = order[0];
          console.log(`[${correlationId}] Order created atomically:`, createdOrder.orderId);

          // 5. Confirm stock reservation atomically (deduct stock)
          const { confirmStockReservation } = await import('../utils/stock.js');
          const itemsToProcess = createdOrder.cartItems && createdOrder.cartItems.length > 0 
            ? createdOrder.cartItems 
            : createdOrder.items;

          if (!itemsToProcess || itemsToProcess.length === 0) {
            throw new Error('Order has no items to process');
          }

          // Process each item atomically
          for (const item of itemsToProcess) {
            const productId = item.productId || item._id || item.id || item.product;
            
            if (!productId || !item.size || !item.quantity) {
              throw new Error(`Invalid item data: ${JSON.stringify(item)}`);
            }

            console.log(`[${correlationId}] Confirming stock for:`, item.name, 'Product:', productId, 'Size:', item.size, 'Qty:', item.quantity);
            // 🚨 CRITICAL MITIGATION: Add structured logging for stock operations
            console.log(`STOCK:PAYMENT:CONFIRM:START: productId=${productId}, size=${item.size}, quantity=${item.quantity}, correlationId=${correlationId}, timestamp=${new Date().toISOString()}`);
            
            const stockConfirmed = await confirmStockReservation(
              productId, 
              item.size, 
              item.quantity, 
              { session }
            );
            
            if (!stockConfirmed) {
              throw new Error(`Stock confirmation failed for ${item.name} (${item.size}) - insufficient stock or reservation`);
            }
          }

          // 6. Mark order as stock confirmed
          await orderModel.findByIdAndUpdate(
            createdOrder._id, 
            { 
              stockConfirmed: true,
              stockConfirmedAt: new Date(),
              updatedAt: new Date()
            },
            { session }
          );

          // 7. Update payment session status
          await PaymentSession.findByIdAndUpdate(
            paymentSession._id,
            {
              status: 'success',
              orderId: createdOrder._id,
              phonepeResponse: req.body
            },
            { session }
          );

          console.log(`[${correlationId}] Atomic transaction completed successfully for order:`, createdOrder.orderId);
          return createdOrder;
        });

        // Get the created order for response
        const order = await orderModel.findOne({ phonepeTransactionId: merchantTransactionId });
        
        // Clear user's cart (non-blocking - outside transaction)
        if (order.userId) {
          try {
            const { userModel } = await import('../models/userModel.js');
            await userModel.findByIdAndUpdate(order.userId, { cartData: {} });
            // console.log('User cart cleared successfully');
          } catch (cartError) {
            console.error('Failed to clear user cart:', cartError);
          }
        }
        
        // Generate and send invoice PDF via email (non-blocking - outside transaction)
        try {
          const { generateInvoiceBuffer, sendInvoiceEmail } = await import('../utils/invoiceGenerator.js');
          const pdfBuffer = await generateInvoiceBuffer(order);
          await sendInvoiceEmail(order, pdfBuffer);
          console.log('Invoice email sent successfully');
        } catch (err) {
          console.error('Invoice email error:', err);
        }

        // Determine redirect URL for successful payment
        const redirectUrl = `${process.env.FRONTEND_URL || 'https://shithaa.in'}/order-success?orderId=${order.orderId}`;

        res.json({
          success: true,
          message: 'Payment successful',
          orderId: order._id,
          redirectUrl
        });

      } catch (transactionError) {
        console.error(`[${correlationId}] Atomic transaction failed:`, transactionError);
        
        // Check if it's a replica set error
        if (transactionError.message && transactionError.message.includes('Transaction numbers are only allowed on a replica set')) {
          console.log(`[${correlationId}] MongoDB not configured as replica set, falling back to non-transactional approach`);
          await session.endSession();
          
          try {
            // Fallback: Non-transactional approach
            const order = await processPaymentWithoutTransaction(paymentSession, merchantTransactionId, correlationId, req.body);
        
        // Clear user's cart (non-blocking)
        if (order.userId) {
          try {
            const { userModel } = await import('../models/userModel.js');
            await userModel.findByIdAndUpdate(order.userId, { cartData: {} });
            // console.log('User cart cleared successfully');
          } catch (cartError) {
            console.error('Failed to clear user cart:', cartError);
          }
        }
        
        // Generate and send invoice PDF via email (non-blocking)
        try {
          const { generateInvoiceBuffer, sendInvoiceEmail } = await import('../utils/invoiceGenerator.js');
          const pdfBuffer = await generateInvoiceBuffer(order);
          await sendInvoiceEmail(order, pdfBuffer);
          console.log('Invoice email sent successfully');
        } catch (err) {
          console.error('Invoice email error:', err);
        }

        // Determine redirect URL for successful payment
        const redirectUrl = `${process.env.FRONTEND_URL || 'https://shithaa.in'}/order-success?orderId=${order.orderId}`;

            return res.json({
          success: true,
          message: 'Payment successful',
          orderId: order._id,
          redirectUrl
        });

          } catch (fallbackError) {
            console.error(`[${correlationId}] Fallback processing also failed:`, fallbackError);
            
            // Update payment session to failed
            await PaymentSession.findByIdAndUpdate(paymentSession._id, {
              status: 'failed',
              error: fallbackError.message,
              phonepeResponse: req.body
            });
        
        return res.status(500).json({
          success: false,
              message: 'Payment processing failed. Please contact support.',
              error: fallbackError.message
            });
          }
        } else {
          // Other transaction errors - update payment session to failed
          await PaymentSession.findByIdAndUpdate(paymentSession._id, {
            status: 'failed',
            error: transactionError.message,
            phonepeResponse: req.body
          });
          
          return res.status(500).json({
            success: false,
            message: 'Payment processing failed. Please contact support.',
            error: transactionError.message
          });
        }
      } finally {
        await session.endSession();
      }

    } else if (isFailedOrAbandoned) {
      console.log('Payment failed or abandoned, releasing stock');
      
      // Track failed payment
      trackPayment(false);
      
      // Update payment session status to failed
      paymentSession.status = 'failed';
      paymentSession.phonepeResponse = req.body;
      paymentSession.failedAt = new Date();
      await paymentSession.save();
      
      // 🔑 CRITICAL: Release reserved stock on payment failure
      await releaseStockOnPaymentFailure(paymentSession, correlationId);

      // Determine redirect URL for failed payment
      const redirectUrl = `${process.env.FRONTEND_URL || 'https://shithaa.in'}/payment-failed`;

      res.json({
        success: false,
        message: 'Payment failed',
        redirectUrl
      });
    }
  } catch (error) {
    console.error('PhonePe Callback Error:', error);
    res.status(500).json({
      success: false,
      message: 'Callback processing failed',
      error: error.message
    });
  }
};

// Verify PhonePe payment status using SDK - ATOMIC VERSION
export const verifyPhonePePayment = async (req, res) => {
  const correlationId = req.headers['x-request-id'] || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  try {
    const { merchantTransactionId } = req.params;
    
    if (!merchantTransactionId) {
      return res.status(400).json({
        success: false,
        message: 'Merchant transaction ID is required',
        data: null
      });
    }

    console.log('Verifying PhonePe payment for transaction:', merchantTransactionId);

    // Check if order already exists (idempotency check)
    let order = await orderModel.findOne({ phonepeTransactionId: merchantTransactionId });
    
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found for this transaction',
        data: null
      });
    }

    // Initialize PhonePe client
    const phonePeClient = await initializePhonePeClient();
    
    if (!phonePeClient) {
      console.error('PhonePe client initialization failed - cannot verify payment');
      return res.status(500).json({
        success: false,
        message: 'Payment verification service unavailable',
        error: 'PhonePe client not initialized',
        data: null
      });
    }
    
    // Check payment status
    let paymentStatus;
    try {
        if (typeof phonePeClient.getOrderStatus === 'function') {
            paymentStatus = await phonePeClient.getOrderStatus(merchantTransactionId);
        } else if (typeof phonePeClient.getStatus === 'function') {
            paymentStatus = await phonePeClient.getStatus(merchantTransactionId);
        } else {
            console.error('PhonePe client missing both getOrderStatus and getStatus methods');
            return res.status(500).json({
                success: false,
                message: 'Payment verification failed - PhonePe client method not found',
                error: 'Missing getOrderStatus/getStatus method',
                data: null
            });
        }
        
        console.log('PhonePe payment status:', paymentStatus);
        
        if (!paymentStatus) {
            console.error('PhonePe returned null/undefined payment status');
            return res.status(500).json({
                success: false,
                message: 'Payment verification failed - no status received from PhonePe',
                error: 'Null payment status',
                data: null
            });
        }
    } catch (statusError) {
        console.error('PhonePe getOrderStatus/getStatus failed:', statusError);
        return res.status(500).json({
            success: false,
            message: 'Payment verification failed - PhonePe API error',
            error: statusError.message,
            data: null
        });
    }

    const isSuccess = (
      paymentStatus.state === 'PAID' ||
      paymentStatus.state === 'COMPLETED' ||
      paymentStatus.responseCode === 'SUCCESS' ||
      paymentStatus.responseCode === '000'
    );

    // 🔑 CRITICAL FIX: If payment is successful, confirm the DRAFT order
    if (isSuccess) {
      if (order.status === 'DRAFT') {
        console.log(`[${correlationId}] Confirming DRAFT order ${order.orderId} to CONFIRMED status`);
        
        const session = await mongoose.startSession();
        
        try {
          await session.withTransaction(async () => {
            // Update order status to CONFIRMED
            await orderModel.findByIdAndUpdate(order._id, {
              status: 'CONFIRMED',
              orderStatus: 'CONFIRMED', 
              paymentStatus: 'PAID',
              paidAt: new Date(),
              confirmedAt: new Date(),
              phonepeResponse: paymentStatus
            }, { session });

            // Confirm stock reservation atomically
            const { confirmStockReservation } = await import('../utils/stock.js');
            const itemsToProcess = order.cartItems && order.cartItems.length > 0 
              ? order.cartItems 
              : order.items;

            if (!itemsToProcess || itemsToProcess.length === 0) {
              throw new Error('Order has no items to process');
            }

            // Process each item atomically
            for (const item of itemsToProcess) {
              const productId = item.productId || item._id || item.id || item.product;
              
              if (!productId || !item.size || !item.quantity) {
                throw new Error(`Invalid item data: ${JSON.stringify(item)}`);
              }

              let stockConfirmed = await confirmStockReservation(
                productId, 
                item.size, 
                item.quantity, 
                { session }
              );
              
              // 🚨 CRITICAL FIX: With atomic operations, emergency fallback is no longer needed
              // If stock confirmation fails, it means there's a real stock issue that needs investigation
              if (!stockConfirmed) {
                EnhancedLogger.webhookLog('ERROR', 'Stock confirmation failed - no emergency fallback available', {
                  correlationId,
                  productId,
                  size: item.size,
                  quantity: item.quantity,
                  orderId: order._id,
                  reason: 'Emergency deduction removed for safety - investigate stock issue'
                });
                throw new Error(`Stock confirmation failed for ${item.name} (${item.size}) - investigate stock availability`);
              }
            }

            // Mark order as stock confirmed
            await orderModel.findByIdAndUpdate(
              order._id, 
              { 
                stockConfirmed: true,
                stockConfirmedAt: new Date(),
                updatedAt: new Date()
              },
              { session }
            );

            return order;
          });

          // Refresh the order data
          order = await orderModel.findOne({ phonepeTransactionId: merchantTransactionId });

          // Clear user's cart (non-blocking)
          if (order.userId) {
            try {
              const { userModel } = await import('../models/userModel.js');
              await userModel.findByIdAndUpdate(order.userId, { cartData: {} });
              // console.log('User cart cleared successfully');
            } catch (cartError) {
              console.error('Failed to clear user cart:', cartError);
            }
          }

          // Send invoice email (non-blocking)
          try {
            const { generateInvoiceBuffer, sendInvoiceEmail } = await import('../utils/invoiceGenerator.js');
            generateInvoiceBuffer(order)
              .then(pdfBuffer => sendInvoiceEmail(order, pdfBuffer))
              .catch(err => console.error('Error sending invoice from verify endpoint:', err));
          } catch (err) {
            console.error('Error preparing invoice from verify endpoint:', err);
          }

        } catch (transactionError) {
          console.error(`[${correlationId}] Atomic transaction failed in verify:`, transactionError);
          
          // Check if it's a replica set error
          if (transactionError.message && transactionError.message.includes('Transaction numbers are only allowed on a replica set')) {
            console.log(`[${correlationId}] MongoDB not configured as replica set, falling back to non-transactional approach in verify`);
            await session.endSession();
            
            try {
              // Fallback: Non-transactional approach - just confirm the existing order
              await orderModel.findByIdAndUpdate(order._id, {
                status: 'CONFIRMED',
                orderStatus: 'CONFIRMED', 
                paymentStatus: 'PAID',
                paidAt: new Date(),
                confirmedAt: new Date(),
                phonepeResponse: paymentStatus
              });

              // Clear user's cart (non-blocking)
              if (order.userId) {
                try {
                  const { userModel } = await import('../models/userModel.js');
                  await userModel.findByIdAndUpdate(order.userId, { cartData: {} });
                } catch (cartError) {
                  console.error('Failed to clear user cart:', cartError);
                }
              }

              // Send invoice email (non-blocking)
              try {
                const { generateInvoiceBuffer, sendInvoiceEmail } = await import('../utils/invoiceGenerator.js');
                generateInvoiceBuffer(order)
                  .then(pdfBuffer => sendInvoiceEmail(order, pdfBuffer))
                  .catch(err => console.error('Error sending invoice from verify endpoint:', err));
              } catch (err) {
                console.error('Error preparing invoice from verify endpoint:', err);
              }
              
            } catch (fallbackError) {
              console.error(`[${correlationId}] Fallback processing also failed in verify:`, fallbackError);
              
              return res.status(500).json({
                success: false,
                message: 'Order confirmation failed during verification',
                error: fallbackError.message,
                data: null
              });
            }
          } else {
            // Other transaction errors - just log and return error
            console.error(`[${correlationId}] Transaction error:`, transactionError);
            
            return res.status(500).json({
              success: false,
              message: 'Order confirmation failed during verification',
              error: transactionError.message,
              data: null
            });
          }
        } finally {
          await session.endSession();
        }
      } else {
        console.log(`[${correlationId}] Order ${order.orderId} is already ${order.status}, no action needed`);
      }
    } else {
      // Payment failed - cancel the DRAFT order and release stock
      if (order.status === 'DRAFT') {
        console.log(`[${correlationId}] Payment failed, cancelling DRAFT order and releasing stock`);
        
        // Cancel the draft order
        await cancelDraftOrder(order._id, `Payment verification failed: ${paymentStatus.state || 'Unknown error'}`);
      } else {
        console.log(`[${correlationId}] Order ${order.orderId} is already ${order.status}, no action needed for failed payment`);
      }
    }

    return res.json({
      success: true,
      data: {
        orderId: order?._id || null,
        orderStatus: order?.orderStatus || (isSuccess ? 'PENDING' : 'FAILED'),
        paymentStatus: order?.paymentStatus || (isSuccess ? 'PAID' : 'FAILED'),
        state: paymentStatus?.state || paymentStatus?.status,
        code: paymentStatus?.responseCode || paymentStatus?.code,
        status: paymentStatus?.state || paymentStatus?.status,
        paymentState: paymentStatus?.state || paymentStatus?.status,
        message: paymentStatus?.responseMessage || paymentStatus?.message,
        amount: paymentStatus?.amount ? paymentStatus.amount / 100 : null,
        transactionId: paymentStatus?.transactionId || paymentStatus?.orderId,
        phonepeResponse: paymentStatus
      },
      isSuccess
    });

  } catch (error) {
    console.error('PhonePe verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Payment verification failed',
      error: error.message,
      data: null
    });
  }
};

// Function removed - Order is now created upfront in createPhonePeSession
// This ensures the order exists when the webhook arrives, fixing the data persistence issue

// Dummy payment endpoint for testing invoice email
export const dummyPaymentSuccess = async (req, res) => {
  try {
    const { orderId } = req.body;
    if (!orderId) return res.status(400).json({ success: false, message: 'Order ID required' });
    const order = await orderModel.findById(orderId);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    // Mark as paid
    order.payment = true;
    order.paymentStatus = 'PAID';
    order.orderStatus = 'PENDING';
    order.status = 'PENDING';
    await order.save();
    // Generate and send invoice
    try {
      const pdfBuffer = await generateInvoiceBuffer(order);
      await sendInvoiceEmail(order, pdfBuffer);
    } catch (err) {
      console.error('Invoice email error (dummy):', err);
    }
    res.json({ success: true, message: 'Dummy payment processed and invoice sent.' });
  } catch (err) {
    console.error('Dummy payment error:', err);
    res.status(500).json({ success: false, message: 'Dummy payment failed', error: err.message });
  }
}; 

/**
 * Get payment status for a checkout session
 */
export const getPaymentStatus = async (req, res) => {
  const correlationId = req.headers['x-request-id'] || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  try {
    const { sessionId } = req.params;
    
    if (!sessionId) {
      return errorResponse(res, 400, 'Session ID is required');
    }
    
    // Find checkout session
    const checkoutSession = await CheckoutSession.findOne({ sessionId });
    if (!checkoutSession) {
      return errorResponse(res, 404, 'Checkout session not found');
    }
    
    // Check if session is expired
    if (checkoutSession.isExpired()) {
      return successResponse(res, {
        status: 'expired',
        message: 'Checkout session has expired',
        sessionId
      });
    }
    
    // If we have a PhonePe transaction ID, check payment status
    if (checkoutSession.phonepeTransactionId) {
      const paymentSession = await PaymentSession.findOne({ 
        phonepeTransactionId: checkoutSession.phonepeTransactionId 
      });
      
      if (paymentSession) {
        return successResponse(res, {
          status: paymentSession.status,
          message: `Payment ${paymentSession.status}`,
          sessionId,
          phonepeTransactionId: checkoutSession.phonepeTransactionId,
          paymentDetails: {
            redirectUrl: paymentSession.phonepeResponse?.redirectUrl,
            responseCode: paymentSession.phonepeResponse?.responseCode,
            responseMessage: paymentSession.phonepeResponse?.responseMessage
          }
        });
      }
    }
    
    // Return checkout session status
    return successResponse(res, {
      status: checkoutSession.status,
      message: `Checkout ${checkoutSession.status}`,
      sessionId,
      stockReserved: checkoutSession.stockReserved,
      expiresAt: checkoutSession.expiresAt
    });
    
  } catch (error) {
    console.error(`[${correlationId}] Error getting payment status:`, error);
    return errorResponse(res, 500, 'Failed to get payment status', error.message);
  }
}; 

/**
 * Get order by transaction id / payment id (robust search across possible fields)
 * Used by routes that expect getOrderByTransactionId to exist.
 */
export const getOrderByTransactionId = async (req, res) => {
  try {
    // transactionId can come from params, query, or body
    const transactionId =
      (req.params && req.params.transactionId) ||
      req.query?.transactionId ||
      req.body?.transactionId ||
      req.body?.phonepeTransactionId ||
      req.body?.paymentId;

    if (!transactionId) {
      return res.status(400).json({ success: false, error: 'missing_transaction_id' });
    }

    // Attempt common locations where transaction id might be stored
    const order = await orderModel.findOne({
      $or: [
        { paymentId: transactionId },
        { phonepeTransactionId: transactionId },
        { 'payments.transactionId': transactionId },
        { 'payment.transactionId': transactionId },
        { transactionId: transactionId }
      ]
    }).lean();

    if (!order) {
      return res.status(404).json({ success: false, error: 'order_not_found' });
    }

    return res.status(200).json({ success: true, order });
  } catch (err) {
    console.error('getOrderByTransactionId error', err);
    return res.status(500).json({ success: false, error: 'server_error' });
  }
}; 

// Helper function moved to webhookController.js to avoid duplication 