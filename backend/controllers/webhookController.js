import orderModel from '../models/orderModel.js';
import PaymentSession from '../models/paymentSessionModel.js';
import { successResponse, errorResponse } from '../utils/response.js';
import crypto from 'crypto';
import Reservation from '../models/Reservation.js';
import { releaseStockReservation } from '../utils/stock.js';

// POST /phonepe/webhook
export async function phonePeWebhookHandler(req, res) {
  try {
    console.log('🔔 WEBHOOK: PhonePe webhook received:', req.body);
    
    // Validate webhook signature
    const authHeader = req.headers['authorization'];
    const username = process.env.PHONEPE_CALLBACK_USERNAME || '';
    const password = process.env.PHONEPE_CALLBACK_PASSWORD || '';
    const expected = crypto.createHash('sha256').update(`${username}:${password}`).digest('hex');
    
    if (authHeader !== expected) {
      console.error('🔔 WEBHOOK: Invalid webhook signature');
      return res.status(401).json({ success: false, message: 'Invalid webhook signature' });
    }
    
    const { payload, event } = req.body;
    if (!payload || !event) {
      console.error('🔔 WEBHOOK: Invalid webhook payload');
      return errorResponse(res, 400, 'Invalid webhook payload');
    }
    
    console.log('🔔 WEBHOOK: Processing event:', event, 'with payload:', payload);
    
    // Payment status update
    if (payload.orderId && payload.state) {
      console.log('🔔 WEBHOOK: Processing payment update for orderId:', payload.orderId, 'state:', payload.state);
      
      // First update PaymentSession if it exists
      const paymentSession = await PaymentSession.findOne({ phonepeTransactionId: payload.orderId });
      if (paymentSession) {
        console.log('🔔 WEBHOOK: Found payment session, updating status to:', payload.state);
        paymentSession.status = payload.state === 'COMPLETED' ? 'success' : 'failed';
        await paymentSession.save();
        console.log('🔔 WEBHOOK: Payment session updated successfully');
      } else {
        console.log('🔔 WEBHOOK: No payment session found for orderId:', payload.orderId);
      }
      
      // Find the order by PhonePe transaction ID
      const order = await orderModel.findOne({ phonepeTransactionId: payload.orderId });
      
      // ---------- IDP GUARD (INSERT HERE) ----------
      const state = (payload?.state || payload?.status || payload?.transactionStatus || '').toString().toUpperCase();
      const isSuccess = ['COMPLETED','SUCCESS','PAID','CAPTURED','OK'].includes(state);

      // Ensure order exists
      if (!order) {
        console.warn('🔔 WEBHOOK: order not found for payload', payload);
        return res.status(404).json({ success: false, message: 'order_not_found' });
      }

      // Idempotency guard: skip if already confirmed
      if (order.stockConfirmed) {
        console.log('🔔 WEBHOOK: stock already confirmed for order', order._id.toString());
        // If payment success reported but order.status isn't 'paid', fix that without touching stock
        if (isSuccess && order.status !== 'paid') {
          order.status = 'paid';
          order.paymentId = payload.paymentId || payload.transactionId || order.paymentId;
          await order.save();
        }
        return res.status(200).json({ success: true, message: 'already_processed' });
      }
      // ---------- END IDP GUARD ----------
      
      console.log('🔔 WEBHOOK: Found order:', order.orderId, 'Current status:', order.paymentStatus);
      
      if (isSuccess) {
        console.log('🔔 WEBHOOK: Payment successful, updating order and reducing stock');
        
        // Check if stock is already confirmed
        if (!order.stockConfirmed) {
          try {
            // Import and call confirmOrderStock to handle stock reduction
            const { confirmOrderStock } = await import('../controllers/orderController.js');
            console.log('🔔 WEBHOOK: Reducing stock for order:', order._id);
            await confirmOrderStock(order._id);
            console.log('🔔 WEBHOOK: Stock reduction completed successfully');
            
            // Update order with stock confirmation
            await orderModel.findByIdAndUpdate(order._id, {
              stockConfirmed: true,
              stockConfirmedAt: new Date(),
              updatedAt: new Date()
            });
          } catch (stockError) {
            console.error('🔔 WEBHOOK: Stock deduction failed for order', order.orderId, 'after successful payment!', stockError);
            // If stock deduction fails, mark the order as having stock issues
            await orderModel.findByIdAndUpdate(order._id, {
              paymentStatus: 'paid_stock_failed',
              orderStatus: 'On Hold',
              status: 'Payment Received, Stock Issue',
              updatedAt: new Date()
            });
            
            return errorResponse(res, 500, 'Payment successful, but stock update failed. Please contact support.');
          }
        } else {
          console.log('🔔 WEBHOOK: Stock already confirmed for order:', order.orderId);
        }
        
        // Update order status to paid
        const updateData = {
          payment: true,
          paymentStatus: 'paid',
          orderStatus: 'Confirmed',
          status: 'Order Placed',
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
            console.log('🔔 WEBHOOK: User cart cleared successfully');
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
        console.log('🔔 WEBHOOK: Payment failed, updating order status');
        
        // Update order to failed status
        await orderModel.findByIdAndUpdate(order._id, {
          paymentStatus: 'failed',
          orderStatus: 'Failed',
          status: 'Payment Failed',
          failedAt: new Date(),
          phonepeResponse: req.body,
          updatedAt: new Date()
        });
        
        console.log('🔔 WEBHOOK: Order updated to failed status');
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