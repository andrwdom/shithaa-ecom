import orderModel from '../models/orderModel.js';
import TempOrder from '../models/TempOrder.js';
import { successResponse, errorResponse } from '../utils/response.js';
import crypto from 'crypto';
import { updateProductStock } from '../controllers/paymentController.js';
import { getUniqueOrderId } from '../controllers/orderController.js';
import { generateInvoiceBuffer, sendInvoiceEmail } from '../utils/invoiceGenerator.js';
import userModel from '../models/userModel.js';

// POST /phonepe/webhook
export async function phonePeWebhookHandler(req, res) {
  try {
    const authHeader = req.headers['authorization'];
    const username = process.env.PHONEPE_CALLBACK_USERNAME || '';
    const password = process.env.PHONEPE_CALLBACK_PASSWORD || '';
    const expected = crypto.createHash('sha256').update(`${username}:${password}`).digest('hex');
    if (authHeader !== expected) return errorResponse(res, 'Invalid webhook signature', 401);
    
    const { payload, event } = req.body;
    if (!payload || !event) return errorResponse(res, 'Invalid webhook payload', 400);
    
    // Payment status update
    if (payload.orderId && payload.state) {
      console.log('Processing webhook for orderId:', payload.orderId, 'state:', payload.state);
      
      // First check if we have a confirmed order
      let order = await orderModel.findOne({ phonepeTransactionId: payload.orderId });
      
      if (order) {
        // Update existing confirmed order
        console.log('Updating existing confirmed order:', order._id);
        order.paymentStatus = payload.state === 'COMPLETED' ? 'paid' : payload.state.toLowerCase();
        order.orderStatus = payload.state === 'COMPLETED' ? 'Confirmed' : payload.state.toLowerCase();
        order.status = payload.state;
        await order.save();
      } else {
        // Check for temporary order
        const tempOrder = await TempOrder.findOne({ merchantOrderId: payload.orderId });
        
        if (tempOrder) {
          console.log('Processing webhook for temporary order:', payload.orderId);
          
          const isSuccess = (
            payload.state === 'checkout.order.completed' ||
            payload.state === 'COMPLETED' ||
            payload.state === 'SUCCESS' ||
            payload.state === 'PAYMENT_SUCCESS' ||
            payload.state === 'SUCCESSFUL' ||
            payload.state === 'PAID'
          );
          
          if (isSuccess) {
            console.log('Payment successful via webhook, creating actual order');
            
            // Deduct stock and create actual order
            await updateProductStock(tempOrder.orderData.items);
            const orderId = await getUniqueOrderId();
            
            const orderData = {
              ...tempOrder.orderData,
              phonepeTransactionId: payload.orderId,
              payment: true,
              paymentStatus: 'paid',
              orderStatus: 'Confirmed',
              status: 'Order Placed',
              date: Date.now(),
              orderId
            };
            
            const newOrder = await orderModel.create(orderData);
            
            // Clear user's cart
            if (newOrder.userId) {
              await userModel.findByIdAndUpdate(newOrder.userId, { cartData: {} });
            }
            
            // Generate and send invoice PDF via email (non-blocking)
            try {
              const pdfBuffer = await generateInvoiceBuffer(newOrder);
              await sendInvoiceEmail(newOrder, pdfBuffer);
            } catch (err) {
              console.error('Invoice email error from webhook:', err);
            }
            
            // Clean up temporary order data
            await TempOrder.deleteOne({ merchantOrderId: payload.orderId });
            
            console.log('Order created successfully via webhook:', newOrder._id);
          } else {
            console.log('Payment failed via webhook, cleaning up temporary data');
            // Clean up temporary order data - no order created, no stock deducted
            await TempOrder.deleteOne({ merchantOrderId: payload.orderId });
          }
        } else {
          console.log('No order found for webhook orderId:', payload.orderId);
        }
      }
    }
    
    // Refund status update
    if (payload.merchantRefundId && payload.state) {
      const order = await orderModel.findOne({ 'refunds.merchantRefundId': payload.merchantRefundId });
      if (order) {
        const refund = order.refunds.find(r => r.merchantRefundId === payload.merchantRefundId);
        if (refund) {
          refund.state = payload.state;
          refund.log = req.body;
          refund.updatedAt = new Date();
          await order.save();
        }
      }
    }
    
    return successResponse(res, {}, 'Webhook processed');
  } catch (err) {
    console.error('Webhook processing error:', err);
    return errorResponse(res, err.message);
  }
} 