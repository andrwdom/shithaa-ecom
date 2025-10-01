import orderModel from '../models/orderModel.js';
import PaymentSession from '../models/paymentSessionModel.js';
import CheckoutSession from '../models/CheckoutSession.js';
import { successResponse, errorResponse } from '../utils/response.js';
import crypto from 'crypto';
import Reservation from '../models/Reservation.js';
import { releaseStockReservation } from '../utils/stock.js';
import EnhancedLogger from '../utils/enhancedLogger.js';
import PaymentMonitor from '../utils/paymentMonitor.js';
import mongoose from 'mongoose';

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
        console.log(`[${correlationId}] ✅ Payment SUCCESS - confirming order`);
        
        // Start MongoDB transaction
        const mongoSession = await mongoose.startSession();
        
        try {
          await mongoSession.withTransaction(async () => {
            // Import stock utils
            const { confirmStockReservation } = await import('../utils/stock.js');
            
            // Confirm stock for each item (converts reserved→actual stock deduction)
            for (const item of draftOrder.cartItems) {
              const confirmed = await confirmStockReservation(
                item.productId,
                item.size,
                item.quantity,
                { session: mongoSession }
              );
              
              if (!confirmed) {
                throw new Error(`Stock confirmation failed: ${item.name} (${item.size})`);
              }
              
              console.log(`[${correlationId}] Confirmed: ${item.name} x${item.quantity}`);
            }
            
            // Update order to CONFIRMED
            await orderModel.findByIdAndUpdate(
              draftOrder._id,
              {
                status: 'CONFIRMED',
                orderStatus: 'CONFIRMED', 
                paymentStatus: 'PAID',
                stockConfirmed: true,
                confirmedAt: new Date(),
                paidAt: new Date(),
                phonepeResponse: payload,
                updatedAt: new Date()
              },
              { session: mongoSession }
            );
            
            console.log(`[${correlationId}] ✅ Order confirmed: ${draftOrder.orderId}`);
          });
          
          // Send invoice email (non-blocking, outside transaction)
          setTimeout(async () => {
            try {
              const { generateInvoiceBuffer, sendInvoiceEmail } = await import('../utils/invoiceGenerator.js');
              const order = await orderModel.findById(draftOrder._id);
              const pdfBuffer = await generateInvoiceBuffer(order);
              await sendInvoiceEmail(order, pdfBuffer);
              console.log(`[${correlationId}] Invoice sent`);
            } catch (err) {
              console.error(`[${correlationId}] Invoice error:`, err.message);
            }
          }, 100);
          
          return res.status(200).json({ 
            success: true, 
            message: 'order_confirmed',
            orderId: draftOrder._id,
            orderNumber: draftOrder.orderId
          });
          
        } catch (error) {
          console.error(`[${correlationId}] ❌ Confirmation failed:`, error.message);
          
          // Mark order as needing manual review
          await orderModel.findByIdAndUpdate(draftOrder._id, {
            paymentStatus: 'PAID',
            status: 'PENDING_REVIEW',
            orderStatus: 'PENDING_REVIEW',
            metadata: {
              ...draftOrder.metadata,
              confirmationError: error.message,
              reviewRequired: true
            }
          });
          
          return res.status(200).json({ 
            success: true, 
            message: 'payment_received_pending_review',
            orderId: draftOrder._id
          });
        } finally {
          await mongoSession.endSession();
        }
        
      } else {
        // Payment FAILED - cancel order and release stock
        console.log(`[${correlationId}] ❌ Payment FAILED - cancelling order`);
        
        try {
          // Release reserved stock
          if (draftOrder.stockReserved && draftOrder.cartItems) {
            const { releaseStockReservation } = await import('../utils/stock.js');
            
            for (const item of draftOrder.cartItems) {
              await releaseStockReservation(item.productId, item.size, item.quantity);
              console.log(`[${correlationId}] Released: ${item.name} x${item.quantity}`);
            }
          }
          
          // Update order to CANCELLED
          await orderModel.findByIdAndUpdate(draftOrder._id, {
            status: 'CANCELLED',
            orderStatus: 'CANCELLED',
            paymentStatus: 'FAILED',
            cancelledAt: new Date(),
            cancellationReason: `Payment failed: ${payload.state}`,
            phonepeResponse: payload,
            updatedAt: new Date()
          });
          
          console.log(`[${correlationId}] ✅ Order cancelled and stock released`);
          
        } catch (error) {
          console.error(`[${correlationId}] Error cancelling order:`, error.message);
        }
        
        return res.status(200).json({ 
          success: true, 
          message: 'payment_failed_order_cancelled'
        });
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