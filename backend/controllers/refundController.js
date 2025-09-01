import orderModel from '../models/orderModel.js';
import { successResponse, errorResponse } from '../utils/response.js';
import { StandardCheckoutClient, Env } from 'pg-sdk-node';

// POST /phonepe/refund
export async function initiatePhonePeRefund(req, res) {
  try {
    const { orderId, amount } = req.body;
    if (!orderId || !amount) return errorResponse(res, 400, 'orderId and amount required');
    
    const order = await orderModel.findById(orderId);
    if (!order || !order.phonepeTransactionId) return errorResponse(res, 404, 'Order not found or not a PhonePe order');
    
    // Prevent duplicate refunds for pending/confirmed
    const existing = order.refunds.find(r => ['PENDING','CONFIRMED'].includes(r.state));
    if (existing) return errorResponse(res, 400, 'A refund is already in progress for this order');
    
    // Initialize PhonePe client locally
    if (!process.env.PHONEPE_MERCHANT_ID || !process.env.PHONEPE_API_KEY) {
      return errorResponse(res, 500, 'PhonePe credentials not configured');
    }
    
    const phonepeClient = StandardCheckoutClient.getInstance(
      process.env.PHONEPE_MERCHANT_ID,
      process.env.PHONEPE_API_KEY,
      parseInt(process.env.PHONEPE_SALT_INDEX || '1', 10),
      process.env.PHONEPE_ENV === 'PRODUCTION' ? Env.PRODUCTION : Env.SANDBOX
    );
    
    // Generate unique merchantRefundId
    const merchantRefundId = `${order.phonepeTransactionId}-${Date.now()}`;
    
    // Initiate refund via SDK
    const refundRequest = {
      merchantOrderId: order.phonepeTransactionId,
      merchantRefundId,
      amount: amount * 100 // paise
    };
    
    const response = await phonepeClient.refund(refundRequest);
    
    // Add refund record
    order.refunds.push({
      merchantRefundId,
      amount: amount * 100,
      state: response.state || 'PENDING',
      log: response
    });
    
    await order.save();
    return successResponse(res, { merchantRefundId, state: response.state, response }, 'Refund initiated');
  } catch (err) {
    return errorResponse(res, 500, err.message);
  }
}

// GET /phonepe/refund-status/:merchantRefundId
export async function getPhonePeRefundStatus(req, res) {
  try {
    const { merchantRefundId } = req.params;
    if (!merchantRefundId) return errorResponse(res, 400, 'merchantRefundId required');
    
    const order = await orderModel.findOne({ 'refunds.merchantRefundId': merchantRefundId });
    if (!order) return errorResponse(res, 404, 'Refund/order not found');
    
    const refund = order.refunds.find(r => r.merchantRefundId === merchantRefundId);
    if (!refund) return errorResponse(res, 404, 'Refund not found');
    
    // Initialize PhonePe client locally
    if (!process.env.PHONEPE_MERCHANT_ID || !process.env.PHONEPE_API_KEY) {
      return errorResponse(res, 500, 'PhonePe credentials not configured');
    }
    
    const phonepeClient = StandardCheckoutClient.getInstance(
      process.env.PHONEPE_MERCHANT_ID,
      process.env.PHONEPE_API_KEY,
      parseInt(process.env.PHONEPE_SALT_INDEX || '1', 10),
      process.env.PHONEPE_ENV === 'PRODUCTION' ? Env.PRODUCTION : Env.SANDBOX
    );
    
    // Query PhonePe for latest status
    const response = await phonepeClient.getRefundStatus({
      merchantOrderId: order.phonepeTransactionId,
      merchantRefundId
    });
    
    // Update refund state/log
    refund.state = response.state || refund.state;
    refund.log = response;
    refund.updatedAt = new Date();
    
    await order.save();
    return successResponse(res, { merchantRefundId, state: refund.state, response }, 'Refund status fetched');
  } catch (err) {
    return errorResponse(res, 500, err.message);
  }
} 