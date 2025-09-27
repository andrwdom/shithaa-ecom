import orderModel from '../models/orderModel.js';
import PaymentSession from '../models/paymentSessionModel.js';
import CheckoutSession from '../models/CheckoutSession.js';
import { successResponse, errorResponse } from '../utils/response.js';
import crypto from 'crypto';
import Reservation from '../models/Reservation.js';
import { releaseStockReservation } from '../utils/stock.js';
import EnhancedLogger from '../utils/enhancedLogger.js';
import PaymentMonitor from '../utils/paymentMonitor.js';

// POST /phonepe/webhook
export async function phonePeWebhookHandler(req, res) {
  const correlationId = req.headers['x-request-id'] || `webhook_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  try {
    EnhancedLogger.webhookLog('INFO', 'PhonePe webhook received', {
      correlationId,
      webhookData: req.body,
      headers: req.headers
    });
    
    // Validate webhook signature
    const authHeader = req.headers['authorization'];
    const username = process.env.PHONEPE_CALLBACK_USERNAME || '';
    const password = process.env.PHONEPE_CALLBACK_PASSWORD || '';
    const expected = crypto.createHash('sha256').update(`${username}:${password}`).digest('hex');
    
    if (authHeader !== expected) {
      EnhancedLogger.webhookLog('ERROR', 'Invalid webhook signature', {
        correlationId,
        expected: expected.substring(0, 10) + '...',
        received: authHeader ? authHeader.substring(0, 10) + '...' : 'null'
      });
      return res.status(401).json({ success: false, message: 'Invalid webhook signature' });
    }
    
    const { payload, event } = req.body;
    if (!payload || !event) {
      EnhancedLogger.webhookLog('ERROR', 'Invalid webhook payload', {
        correlationId,
        payload: payload,
        event: event
      });
      return errorResponse(res, 400, 'Invalid webhook payload');
    }
    
    EnhancedLogger.webhookLog('INFO', 'Processing webhook event', {
      correlationId,
      event: event,
      payload: payload
    });
    
    // Payment status update
    if (payload.orderId && payload.state) {
      console.log('🔔 WEBHOOK: Processing payment update for orderId:', payload.orderId, 'state:', payload.state);
      
      // Find the payment session by PhonePe transaction ID
      const paymentSession = await PaymentSession.findOne({ phonepeTransactionId: payload.orderId });
      
      // ---------- IDP GUARD (MOVED UP) ----------
      const state = (payload?.state || payload?.status || payload?.transactionStatus || '').toString().toUpperCase();
      const isSuccess = ['COMPLETED','SUCCESS','PAID','CAPTURED','OK'].includes(state);

      // Ensure payment session exists BEFORE processing
      if (!paymentSession) {
        EnhancedLogger.criticalAlert('WEBHOOK: Payment session not found', {
          correlationId,
          orderId: payload.orderId,
          state: state,
          payload: payload
        });
        return res.status(404).json({ success: false, message: 'payment_session_not_found' });
      }
      
      EnhancedLogger.webhookLog('INFO', 'Found payment session, updating status', {
        correlationId,
        sessionId: paymentSession._id,
        phonepeTransactionId: paymentSession.phonepeTransactionId,
        userEmail: paymentSession.userEmail,
        newStatus: payload.state === 'COMPLETED' ? 'success' : 'failed',
        state: payload.state
      });
      
      paymentSession.status = payload.state === 'COMPLETED' ? 'success' : 'failed';
      await paymentSession.save();
      
      EnhancedLogger.webhookLog('SUCCESS', 'Payment session updated successfully', {
        correlationId,
        sessionId: paymentSession._id,
        status: paymentSession.status
      });

      // Check if order already exists (created on successful payment)
      let order = null;
      if (paymentSession.orderId) {
        order = await orderModel.findById(paymentSession.orderId);
      }

      // Idempotency guard: skip if order already exists and is confirmed
      if (order && order.stockConfirmed) {
        console.log('🔔 WEBHOOK: order already exists and stock confirmed for payment session', paymentSession._id.toString());
        // If payment success reported but order.status isn't 'paid', fix that without touching stock
        if (isSuccess && order.status !== 'paid') {
          order.status = 'paid';
          order.paymentId = payload.paymentId || payload.transactionId || order.paymentId;
          await order.save();
        }
        return res.status(200).json({ success: true, message: 'already_processed' });
      }
      // ---------- END IDP GUARD ----------
      
      console.log('🔔 WEBHOOK: Found payment session:', paymentSession._id, 'Order exists:', !!order);
      
      if (isSuccess) {
        EnhancedLogger.webhookLog('INFO', 'Payment successful, creating order and confirming stock', {
          correlationId,
          sessionId: paymentSession._id,
          phonepeTransactionId: paymentSession.phonepeTransactionId,
          userEmail: paymentSession.userEmail
        });
        
        // Start a MongoDB transaction for atomicity
        const session = await mongoose.startSession();
        await session.startTransaction();
        
        try {
          // Create order if it doesn't exist
          if (!order) {
            // Create order from payment session data
            const orderPayload = paymentSession.orderPayload;
            
            // 🔑 CRITICAL FIX: Check if orderPayload exists with fallback
            if (!orderPayload) {
              EnhancedLogger.criticalAlert('WEBHOOK: Order payload is missing for payment session', {
                correlationId,
                sessionId: paymentSession._id,
                phonepeTransactionId: paymentSession.phonepeTransactionId,
                userEmail: paymentSession.userEmail
              });
              
              // FALLBACK: Try to create order from payment session data
              EnhancedLogger.webhookLog('WARN', 'Attempting fallback order creation from payment session data', {
                correlationId,
                sessionId: paymentSession._id
              });
              
              if (!paymentSession.orderData) {
                EnhancedLogger.criticalAlert('WEBHOOK: Both orderPayload and orderData are missing for payment session', {
                  correlationId,
                  sessionId: paymentSession._id,
                  phonepeTransactionId: paymentSession.phonepeTransactionId,
                  userEmail: paymentSession.userEmail
                });
                throw new Error('Order payload and orderData are missing from payment session');
              }
              
              // Create minimal order from available data
              const fallbackOrderData = {
                orderId: `ORD_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                userInfo: {
                  email: paymentSession.userEmail,
                  userId: paymentSession.userId
                },
                shippingInfo: paymentSession.orderData.shipping || {},
                cartItems: paymentSession.orderData.cartItems || [],
                items: paymentSession.orderData.cartItems || [],
                totalAmount: paymentSession.orderData.amount || 0,
                total: paymentSession.orderData.amount || 0,
                subtotal: paymentSession.orderData.amount || 0,
                paymentStatus: 'paid',
                orderStatus: 'Pending',
                status: 'Pending',
                paymentMethod: 'PhonePe',
                phonepeTransactionId: paymentSession.phonepeTransactionId,
                paidAt: new Date(),
                phonepeResponse: req.body,
                stockConfirmed: false,
                metadata: {
                  checkoutSessionId: paymentSession.sessionId,
                  source: 'webhook_fallback',
                  correlationId: `webhook_${Date.now()}`
                }
              };
              
              order = await orderModel.create([fallbackOrderData], { session });
              order = order[0];
              
              EnhancedLogger.orderLog('SUCCESS', 'Fallback order created successfully', {
                correlationId,
                orderId: order.orderId,
                phonepeTransactionId: order.phonepeTransactionId,
                userEmail: order.userInfo?.email,
                source: 'webhook_fallback'
              });
            } else {
              // Normal order creation with orderPayload
            orderPayload.paymentStatus = 'paid';
            orderPayload.orderStatus = 'Pending';
            orderPayload.status = 'Pending';
            orderPayload.paidAt = new Date();
            orderPayload.phonepeResponse = req.body;
            orderPayload.stockConfirmed = false;

            // Create order within transaction
            order = await orderModel.create([orderPayload], { session });
            order = order[0]; // MongoDB returns array for transactional create
              
              EnhancedLogger.orderLog('SUCCESS', 'Order created successfully', {
                correlationId,
                orderId: order.orderId,
                phonepeTransactionId: order.phonepeTransactionId,
                userEmail: order.userInfo?.email,
                source: 'webhook_normal'
              });
            }

            // Update payment session with order ID
            await PaymentSession.findByIdAndUpdate(
              paymentSession._id,
              { 
                orderId: order._id,
                status: 'success',
                updatedAt: new Date()
              },
              { session }
            );
          }
          
          // Check if stock is already confirmed
          if (!order.stockConfirmed) {
            console.log('🔔 WEBHOOK: Confirming stock for order:', order._id);
            
            // Get checkout session to confirm stock
            const checkoutSession = await CheckoutSession.findOne({ 
              sessionId: paymentSession.sessionId 
            }).session(session);
            
            if (!checkoutSession) {
              throw new Error('Checkout session not found');
            }
            
            if (!checkoutSession.stockReserved) {
              throw new Error('Stock was not reserved for this session');
            }
            
            // Import stock utils
            const { confirmStockReservation } = await import('../utils/stock.js');
            
            // Confirm stock for each item atomically
            for (const item of checkoutSession.items) {
              const confirmed = await confirmStockReservation(
                item.productId,
                item.size,
                item.quantity,
                { session }
              );
              
              if (!confirmed) {
                throw new Error(`Failed to confirm stock for item ${item.productId} size ${item.size}`);
              }
              
              console.log(`🔔 WEBHOOK: Stock confirmed for ${item.name} (${item.size}) x${item.quantity}`);
            }
            
            // Mark checkout session as completed
            await CheckoutSession.findByIdAndUpdate(
              checkoutSession._id,
              {
                status: 'completed',
                stockReserved: false,
                completedAt: new Date(),
                updatedAt: new Date()
              },
              { session }
            );
            
            // Update order with stock confirmation
            await orderModel.findByIdAndUpdate(
              order._id,
              {
                stockConfirmed: true,
                stockConfirmedAt: new Date(),
                updatedAt: new Date()
              },
              { session }
            );
            
            // Mark reservation as confirmed
            await Reservation.findOneAndUpdate(
              { checkoutSessionId: checkoutSession._id },
              {
                status: 'confirmed',
                confirmedAt: new Date(),
                updatedAt: new Date()
              },
              { session }
            );
            
            console.log('🔔 WEBHOOK: Stock confirmation completed successfully');
          } else {
            console.log('🔔 WEBHOOK: Stock already confirmed for order:', order.orderId);
          }
          
          // Commit transaction
          await session.commitTransaction();
          console.log('🔔 WEBHOOK: Transaction committed successfully');
          
        } catch (error) {
          // Rollback transaction on any error
          await session.abortTransaction();
          console.error('🔔 WEBHOOK: Transaction failed:', error);
          console.error('🔔 WEBHOOK: Error details:', {
            message: error.message,
            stack: error.stack,
            paymentSessionId: paymentSession._id,
            phonepeTransactionId: paymentSession.phonepeTransactionId,
            hasOrderPayload: !!paymentSession.orderPayload,
            hasOrderData: !!paymentSession.orderData
          });
          
          // Log critical error for monitoring
          console.error('🚨 CRITICAL: Order creation failed for successful payment:', {
            paymentSessionId: paymentSession._id,
            phonepeTransactionId: paymentSession.phonepeTransactionId,
            userEmail: paymentSession.userEmail,
            amount: paymentSession.orderData?.amount || 'unknown',
            error: error.message
          });
          
          // Update order status if it exists
          if (order) {
            await orderModel.findByIdAndUpdate(order._id, {
              paymentStatus: 'paid_stock_failed',
              orderStatus: 'On Hold',
              status: 'Payment Received, Stock Issue',
              error: error.message,
              updatedAt: new Date()
            });
          }
          
          // Update payment session status
          await PaymentSession.findByIdAndUpdate(paymentSession._id, {
            status: 'failed',
            error: error.message,
            updatedAt: new Date()
          });
          
          return errorResponse(res, 500, 'Payment successful, but order/stock update failed. Please contact support.');
        } finally {
          await session.endSession();
        }
        
        // Update order status to paid (if not already updated)
        const updateData = {
          payment: true,
          paymentStatus: 'paid',
          orderStatus: 'Pending',
          status: 'Pending',
          paidAt: new Date(),
          phonepeResponse: req.body,
          updatedAt: new Date()
        };
        
        await orderModel.findByIdAndUpdate(order._id, updateData);
        console.log('🔔 WEBHOOK: Order updated successfully to paid status');
        
        // Clear user's cart and clean up reservations (non-blocking)
        if (order.userId) {
          try {
            const { userModel } = await import('../models/userModel.js');
            await userModel.findByIdAndUpdate(order.userId, { cartData: {} });
            // console.log('🔔 WEBHOOK: User cart cleared successfully');
          } catch (cartError) {
            console.warn('🔔 WEBHOOK: Failed to clear user cart:', cartError);
          }
        }
        
        // 🔑 CRITICAL: Clean up reservation after successful payment
        try {
          const { Reservation } = await import('../models/Reservation.js');
          await Reservation.findOneAndUpdate(
            { checkoutSessionId: order.metadata?.checkoutSessionId },
            { status: 'confirmed', updatedAt: new Date() }
          );
          console.log('🔔 WEBHOOK: Reservation marked as confirmed');
        } catch (reservationError) {
          console.warn('🔔 WEBHOOK: Failed to update reservation status:', reservationError);
        }
        
        // Send invoice email (non-blocking)
        try {
          const { generateInvoiceBuffer, sendInvoiceEmail } = await import('../utils/invoiceGenerator.js');
          const freshOrder = await orderModel.findById(order._id);
          const pdfBuffer = await generateInvoiceBuffer(freshOrder);
          await sendInvoiceEmail(freshOrder, pdfBuffer);
          console.log('🔔 WEBHOOK: Invoice email sent successfully');
        } catch (err) {
          console.error('🔔 WEBHOOK: Invoice email error:', err);
        }
        
      } else {
        console.log('🔔 WEBHOOK: Payment failed or timed out, releasing stock');
        
        // Start a MongoDB transaction for atomicity
        const session = await mongoose.startSession();
        await session.startTransaction();
        
        try {
          // Update payment session status to failed
          await PaymentSession.findByIdAndUpdate(
            paymentSession._id,
            {
              status: 'failed',
              phonepeResponse: req.body,
              failedAt: new Date(),
              updatedAt: new Date(),
              failureReason: payload.message || 'Payment failed or timed out'
            },
            { session }
          );
          
          // Find and release stock from the checkout session
          const checkoutSession = await CheckoutSession.findOne({ 
            sessionId: paymentSession.sessionId 
          }).session(session);
          
          if (checkoutSession && checkoutSession.stockReserved) {
            console.log('🔔 WEBHOOK: Found checkout session with reserved stock, releasing...');
            
            // Import stock utils
            const { releaseStockReservation } = await import('../utils/stock.js');
            
            // Release stock for each item atomically
            for (const item of checkoutSession.items) {
              const released = await releaseStockReservation(
                item.productId,
                item.size,
                item.quantity,
                { session }
              );
              
              if (!released) {
                throw new Error(`Failed to release stock for item ${item.productId} size ${item.size}`);
              }
              
              console.log(`🔔 WEBHOOK: Released stock for ${item.name} (${item.size}) x${item.quantity}`);
            }
            
            // Mark checkout session as failed and stock as released
            await CheckoutSession.findByIdAndUpdate(
              checkoutSession._id,
              {
                status: 'failed',
                stockReserved: false,
                failedAt: new Date(),
                updatedAt: new Date(),
                failureReason: payload.message || 'Payment failed or timed out'
              },
              { session }
            );
            
            // Mark reservation as failed
            await Reservation.findOneAndUpdate(
              { checkoutSessionId: checkoutSession._id },
              {
                status: 'failed',
                failedAt: new Date(),
                updatedAt: new Date(),
                failureReason: payload.message || 'Payment failed or timed out'
              },
              { session }
            );
            
            console.log('🔔 WEBHOOK: Checkout session marked as failed and stock released');
          } else {
            console.log('🔔 WEBHOOK: No checkout session found or no stock reserved');
          }
          
          // If order was created (edge case), mark it as failed
          if (order) {
            await orderModel.findByIdAndUpdate(
              order._id,
              {
                paymentStatus: 'failed',
                orderStatus: 'Failed',
                status: 'Payment Failed',
                failedAt: new Date(),
                updatedAt: new Date(),
                failureReason: payload.message || 'Payment failed or timed out'
              },
              { session }
            );
          }
          
          // Commit transaction
          await session.commitTransaction();
          console.log('🔔 WEBHOOK: Transaction committed successfully');
          
        } catch (error) {
          // Rollback transaction on any error
          await session.abortTransaction();
          console.error('🔔 WEBHOOK: Transaction failed:', error);
          
          // Try to update payment session status without transaction
          await PaymentSession.findByIdAndUpdate(paymentSession._id, {
            status: 'failed',
            error: error.message,
            updatedAt: new Date()
          });
          
          return errorResponse(res, 500, 'Failed to process payment failure. Please contact support.');
        } finally {
          await session.endSession();
        }
      }
    }
    
    // Refund status update
    if (payload.merchantRefundId && payload.state) {
      console.log('🔔 WEBHOOK: Processing refund update for refundId:', payload.merchantRefundId, 'state:', payload.state);
      
      // Find order with this refund
      const order = await orderModel.findOne({
        'refunds.merchantRefundId': payload.merchantRefundId
      });
      
      if (order) {
        // Update refund status
        await orderModel.updateOne(
          { _id: order._id, 'refunds.merchantRefundId': payload.merchantRefundId },
          {
            $set: {
              'refunds.$.state': payload.state,
              'refunds.$.updatedAt': new Date(),
              updatedAt: new Date()
            }
          }
        );
        
        console.log('🔔 WEBHOOK: Refund status updated successfully');
      } else {
        console.log('🔔 WEBHOOK: No order found for refund:', payload.merchantRefundId);
      }
    }
    
    return successResponse(res, { message: 'Webhook processed successfully' });
    
  } catch (error) {
    console.error('🔔 WEBHOOK: Error processing webhook:', error);
    return errorResponse(res, 500, 'Webhook processing failed', error.message);
  }
} 

// Rename to avoid shadowing imported util
async function releaseOrderStockReservation(orderId) {
  try {
    const order = await orderModel.findById(orderId).lean();
    if (!order || !order.items) return;
    for (const it of order.items) {
      // reuse the utility that releases reserved qty for a product
      // ensure releaseStockReservation(productId, size, qty) exists in utils/stock.js
      await releaseStockReservation(it.productId, it.size, it.qty);
    }
  } catch (err) {
    console.error('releaseOrderStockReservation error', err);
  }
} 