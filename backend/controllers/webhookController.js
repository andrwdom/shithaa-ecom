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
      
      const state = (payload?.state || payload?.status || payload?.transactionStatus || '').toString().toUpperCase();
      const isSuccess = ['COMPLETED','SUCCESS','PAID','CAPTURED','OK'].includes(state);

      // 🔑 DRAFT ORDER PATTERN: Find draft order by PhonePe transaction ID
      const draftOrder = await orderModel.findOne({ 
        phonepeTransactionId: payload.orderId,
        status: 'DRAFT'
      });
      
      if (!draftOrder) {
        // Check if order already exists and is confirmed (idempotency)
        const existingOrder = await orderModel.findOne({ 
          phonepeTransactionId: payload.orderId,
          paymentStatus: 'PAID'
        });
        
        if (existingOrder) {
          console.log('🔔 WEBHOOK: Order already confirmed, skipping duplicate processing');
          return res.status(200).json({ 
            success: true, 
            message: 'already_processed',
            orderId: existingOrder._id 
          });
        }
        
        EnhancedLogger.criticalAlert('WEBHOOK: Draft order not found', {
          correlationId,
          orderId: payload.orderId,
          state: state,
          payload: payload
        });
        return res.status(404).json({ success: false, message: 'draft_order_not_found' });
      }
      
      EnhancedLogger.webhookLog('INFO', 'Found draft order, processing payment update', {
        correlationId,
        orderId: draftOrder._id,
        phonepeTransactionId: draftOrder.phonepeTransactionId,
        userEmail: draftOrder.userInfo?.email,
        newStatus: isSuccess ? 'CONFIRMED' : 'CANCELLED',
        state: payload.state
      });
      
      if (isSuccess) {
        EnhancedLogger.webhookLog('INFO', 'Payment successful, confirming draft order', {
          correlationId,
          orderId: draftOrder._id,
          phonepeTransactionId: draftOrder.phonepeTransactionId,
          userEmail: draftOrder.userInfo?.email
        });
        
        // Start a MongoDB transaction for atomicity
        const session = await mongoose.startSession();
        await session.startTransaction();
        
        try {
          // 🔑 DRAFT ORDER CONFIRMATION: Update draft to confirmed status
          await orderModel.findByIdAndUpdate(
            draftOrder._id,
            {
              status: 'CONFIRMED',
              orderStatus: 'CONFIRMED', 
              paymentStatus: 'PAID',
              confirmedAt: new Date(),
                paidAt: new Date(),
                phonepeResponse: req.body,
                updatedAt: new Date()
              },
              { session }
            );
          
          // Check if stock is already confirmed
          if (!draftOrder.stockConfirmed) {
            console.log('🔔 WEBHOOK: Confirming stock for draft order:', draftOrder._id);
            
            // Import stock utils
            const { confirmStockReservation } = await import('../utils/stock.js');
            
            // Confirm stock for each item atomically (convert reserved to confirmed)
            for (const item of draftOrder.cartItems) {
              let confirmed = await confirmStockReservation(
                item.productId,
                item.size,
                item.quantity,
                { session }
              );
              
              // 🚨 EMERGENCY FALLBACK: If confirmation failed (reserved = 0 due to race condition),
              // try direct stock deduction since payment was already successful
              if (!confirmed) {
                console.log(`⚠️ WEBHOOK: Stock confirmation failed for ${item.name} (${item.size}), attempting emergency deduction...`);
                const { emergencyStockDeduction } = await import('../utils/stock.js');
                confirmed = await emergencyStockDeduction(
                  item.productId,
                  item.size,
                  item.quantity,
                  { session }
                );
                
                if (!confirmed) {
                  throw new Error(`Failed to confirm stock for item ${item.productId} size ${item.size}`);
                }
                
                console.log(`✅ WEBHOOK: Successfully recovered from stock confirmation failure using emergency deduction`);
              }
              
              console.log(`🔔 WEBHOOK: Stock confirmed for ${item.name} (${item.size}) x${item.quantity}`);
            }
            
            // Update order with stock confirmation
            await orderModel.findByIdAndUpdate(
              draftOrder._id,
              {
                stockConfirmed: true,
                stockConfirmedAt: new Date(),
                updatedAt: new Date()
              },
              { session }
            );
            
            console.log('🔔 WEBHOOK: Stock confirmation completed successfully');
          } else {
            console.log('🔔 WEBHOOK: Stock already confirmed for order:', draftOrder.orderId);
          }
          
          // Commit transaction
          await session.commitTransaction();
          console.log('🔔 WEBHOOK: Transaction committed successfully');
          
          // Log successful order confirmation
          EnhancedLogger.orderLog('SUCCESS', 'Draft order confirmed and stock confirmed successfully', {
            correlationId,
            orderId: draftOrder.orderId,
            phonepeTransactionId: draftOrder.phonepeTransactionId,
            userEmail: draftOrder.userInfo?.email,
            totalAmount: draftOrder.totalAmount,
            itemsCount: draftOrder.cartItems?.length || 0,
            source: 'webhook'
          });
          
          // Send success response
          return res.status(200).json({ 
            success: true, 
            message: 'order_confirmed_successfully',
            orderId: draftOrder._id,
            orderNumber: draftOrder.orderId
          });
          
        } catch (error) {
          // Rollback transaction on any error
          await session.abortTransaction();
          console.error('🔔 WEBHOOK: Transaction failed:', error);
          console.error('🔔 WEBHOOK: Error details:', {
            message: error.message,
            stack: error.stack,
            orderId: draftOrder._id,
            phonepeTransactionId: draftOrder.phonepeTransactionId
          });
          
          // Log critical error for monitoring
          console.error('🚨 CRITICAL: Draft order confirmation failed for successful payment:', {
            orderId: draftOrder._id,
            phonepeTransactionId: draftOrder.phonepeTransactionId,
            userEmail: draftOrder.userInfo?.email,
            amount: draftOrder.totalAmount,
            error: error.message
          });
          
          // Update draft order status to indicate payment received but confirmation failed
          await orderModel.findByIdAndUpdate(draftOrder._id, {
            paymentStatus: 'PAID',
            status: 'PENDING_CONFIRMATION',
            orderStatus: 'PENDING_CONFIRMATION',
            error: error.message,
            updatedAt: new Date()
          });
          
          return errorResponse(res, 500, 'Payment successful, but order confirmation failed. Please contact support.');
        } finally {
          await session.endSession();
        }
        
        // Update order status to paid (if not already updated)
        const updateData = {
          payment: true,
          paymentStatus: 'PAID',
          orderStatus: 'PENDING',
          status: 'PENDING',
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
        // Payment failed - cancel draft order
        console.log('🔔 WEBHOOK: Payment failed for orderId:', payload.orderId, 'state:', payload.state);
        
        // Cancel draft order and release stock
        await cancelDraftOrder(draftOrder._id, `Payment failed: ${payload.state}`);
        
        return res.status(200).json({ success: true, message: 'payment_failed' });
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
      const { releaseStockReservation } = await import('../utils/stock.js');
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