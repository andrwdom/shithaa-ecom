import express from 'express';
import { 
    createPhonePeSession, 
    phonePeCallback, 
    verifyPhonePePayment,
    dummyPaymentSuccess
} from '../controllers/paymentController.js';
import { verifyToken, optionalVerifyToken } from '../middleware/auth.js';
// Add imports for refund and webhook controllers
import { initiatePhonePeRefund, getPhonePeRefundStatus } from '../controllers/refundController.js';
import { phonePeWebhookHandler } from '../controllers/webhookController.js';

const paymentRouter = express.Router();

// PhonePe payment routes
paymentRouter.post('/phonepe/create-session', verifyToken, createPhonePeSession);
paymentRouter.post('/phonepe/callback', phonePeCallback);
paymentRouter.post('/phonepe/dummy-success', verifyToken, dummyPaymentSuccess);
paymentRouter.get('/phonepe/verify/:merchantTransactionId', optionalVerifyToken, verifyPhonePePayment);
// PhonePe refund routes
paymentRouter.post('/phonepe/refund', verifyToken, initiatePhonePeRefund);
paymentRouter.get('/phonepe/refund-status/:merchantRefundId', verifyToken, getPhonePeRefundStatus);
// PhonePe webhook route
paymentRouter.post('/phonepe/webhook', phonePeWebhookHandler);

// Debug endpoint for PhonePe testing
paymentRouter.get('/phonepe/debug/:merchantTransactionId', async (req, res) => {
  try {
    const { merchantTransactionId } = req.params;
    console.log('Debug request for transaction:', merchantTransactionId);
    
    // Check if order exists
    const order = await (await import('../models/orderModel.js')).default.findOne({
      phonepeTransactionId: merchantTransactionId
    });
    
    if (!order) {
      return res.json({
        success: false,
        message: 'Order not found',
        merchantTransactionId
      });
    }
    
    return res.json({
      success: true,
      order: {
        id: order._id,
        phonepeTransactionId: order.phonepeTransactionId,
        paymentStatus: order.paymentStatus,
        orderStatus: order.orderStatus,
        status: order.status,
        amount: order.amount,
        paymentLog: order.paymentLog
      }
    });
  } catch (error) {
    console.error('Debug endpoint error:', error);
    res.status(500).json({
      success: false,
      message: 'Debug endpoint failed',
      error: error.message
    });
  }
});

export default paymentRouter; 