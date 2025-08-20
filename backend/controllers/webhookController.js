import orderModel from '../models/orderModel.js';
import PaymentSession from '../models/paymentSessionModel.js';
import { successResponse, errorResponse } from '../utils/response.js';
import crypto from 'crypto';

// POST /phonepe/webhook
export async function phonePeWebhookHandler(req, res) {
  try {
    const authHeader = req.headers['authorization'];
    const username = process.env.PHONEPE_CALLBACK_USERNAME || '';
    const password = process.env.PHONEPE_CALLBACK_PASSWORD || '';
    const expected = crypto.createHash('sha256').update(`${username}:${password}`).digest('hex');
    if (authHeader !== expected) return res.status(401).json({ success: false, message: 'Invalid webhook signature' });
    const { payload, event } = req.body;
    if (!payload || !event) return errorResponse(res, 400, 'Invalid webhook payload');
    // Payment status update - FIXED TO WORK WITH PAYMENT SESSIONS
    if (payload.orderId && payload.state) {
      console.log('🔔 WEBHOOK: Processing payment update for orderId:', payload.orderId, 'state:', payload.state);
      
      // First update PaymentSession
      const paymentSession = await PaymentSession.findOne({ phonepeTransactionId: payload.orderId });
      if (paymentSession) {
        console.log('🔔 WEBHOOK: Found payment session, updating status to:', payload.state);
        paymentSession.status = payload.state === 'COMPLETED' ? 'success' : 'failed';
        await paymentSession.save();
        console.log('🔔 WEBHOOK: Payment session updated successfully');
      } else {
        console.log('🔔 WEBHOOK: No payment session found for orderId:', payload.orderId);
      }
      
      // Then update order if it exists
      const order = await orderModel.findOne({ phonepeTransactionId: payload.orderId });
      if (order) {
        order.paymentStatus = payload.state === 'COMPLETED' ? 'paid' : payload.state.toLowerCase();
        order.orderStatus = payload.state === 'COMPLETED' ? 'Confirmed' : payload.state.toLowerCase();
        order.status = payload.state;
        await order.save();
        console.log('🔔 WEBHOOK: Order updated successfully');
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
    return errorResponse(res, 500, err.message);
  }
} 