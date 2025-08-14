import orderModel from '../models/orderModel.js';
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
    if (!payload || !event) return errorResponse(res, 'Invalid webhook payload', 400);
    // Payment status update
    if (payload.orderId && payload.state) {
      const order = await orderModel.findOne({ phonepeTransactionId: payload.orderId });
      if (order) {
        order.paymentStatus = payload.state === 'COMPLETED' ? 'paid' : payload.state.toLowerCase();
        order.orderStatus = payload.state === 'COMPLETED' ? 'Confirmed' : payload.state.toLowerCase();
        order.status = payload.state;
        await order.save();
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
    return errorResponse(res, err.message);
  }
} 