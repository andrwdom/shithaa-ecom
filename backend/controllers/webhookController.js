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
      if (!order) {
        console.error('🔔 WEBHOOK: Order not found for transaction:', payload.orderId);
        return errorResponse(res, 404, 'Order not found');
      }
      
      console.log('🔔 WEBHOOK: Found order:', order.orderId, 'Current status:', order.paymentStatus);
      
      // Determine if payment was successful
      const isSuccess = (
        payload.state === 'PAID' ||
        payload.state === 'COMPLETED' ||
        payload.state === 'SUCCESS' ||
        payload.responseCode === 'SUCCESS' ||
        payload.responseCode === '000'
      );
      
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
        
        // Clear user's cart (non-blocking)
        if (order.userId) {
          try {
            const { userModel } = await import('../models/userModel.js');
            await userModel.findByIdAndUpdate(order.userId, { cartData: {} });
            console.log('🔔 WEBHOOK: User cart cleared successfully');
          } catch (cartError) {
            console.error('🔔 WEBHOOK: Failed to clear user cart:', cartError);
          }
        }
        
        // Send invoice email (non-blocking)
        try {
          const { generateInvoiceBuffer, sendInvoiceEmail } = await import('../utils/invoice.js');
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

/**
 * Helper function to release stock reservation for an order
 */
async function releaseStockReservationForOrder(orderId) {
  try {
    const order = await orderModel.findById(orderId);
    if (!order) {
      throw new Error('Order not found');
    }
    
    // Release stock reservation for all items
    const releasePromises = order.items.map(item =>
      releaseStockReservation(item.productId, item.size, item.quantity)
    );
    
    await Promise.all(releasePromises);
    
    // Update reservation status
    const reservation = await Reservation.findOne({ 
      checkoutSessionId: order.metadata?.checkoutSessionId 
    });
    
    if (reservation && reservation.status === 'active') {
      await reservation.expire();
    }
    
    console.log(`Stock reservation released for order: ${orderId}`);
  } catch (error) {
    console.error('Error releasing stock reservation:', error);
    throw error;
  }
} 