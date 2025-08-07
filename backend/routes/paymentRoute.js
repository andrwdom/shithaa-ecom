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
        paymentLog: order.paymentLog,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt
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

// Test endpoint to manually mark order as paid
paymentRouter.post('/phonepe/test-success/:merchantTransactionId', async (req, res) => {
  try {
    const { merchantTransactionId } = req.params;
    console.log('Test success request for transaction:', merchantTransactionId);
    
    const order = await (await import('../models/orderModel.js')).default.findOne({
      phonepeTransactionId: merchantTransactionId
    });
    
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
        merchantTransactionId
      });
    }
    
    // Mark as paid
    await (await import('../models/orderModel.js')).default.findByIdAndUpdate(order._id, {
      payment: true,
      paymentStatus: 'paid',
      orderStatus: 'Confirmed',
      status: 'Order Placed',
      updatedAt: new Date()
    });
    
    return res.json({
      success: true,
      message: 'Order marked as paid successfully',
      orderId: order._id
    });
  } catch (error) {
    console.error('Test success endpoint error:', error);
    res.status(500).json({
      success: false,
      message: 'Test success failed',
      error: error.message
    });
  }
});

// Manual callback simulation endpoint
paymentRouter.post('/phonepe/simulate-callback/:merchantTransactionId', async (req, res) => {
  try {
    const { merchantTransactionId } = req.params;
    const { state = 'COMPLETED' } = req.body;
    
    console.log('Simulating callback for transaction:', merchantTransactionId, 'with state:', state);
    
    // Find the order
    const order = await (await import('../models/orderModel.js')).default.findOne({
      phonepeTransactionId: merchantTransactionId
    });
    
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
        merchantTransactionId
      });
    }
    
    // Simulate callback processing
    const isSuccess = (
      state === 'checkout.order.completed' ||
      state === 'COMPLETED' ||
      state === 'SUCCESS' ||
      state === 'PAYMENT_SUCCESS' ||
      state === 'SUCCESSFUL' ||
      state === 'PAID'
    );
    
    let update = {
      paymentLog: { simulated: true, state },
      phonepeTransactionId: merchantTransactionId,
      updatedAt: new Date()
    };
    
    if (isSuccess) {
      update = {
        ...update,
        payment: true,
        paymentStatus: 'paid',
        orderStatus: 'Confirmed',
        status: 'Order Placed',
      };
    } else {
      update = {
        ...update,
        paymentStatus: 'failed',
        orderStatus: 'Failed',
        status: 'Payment Failed',
      };
    }
    
    await (await import('../models/orderModel.js')).default.findByIdAndUpdate(order._id, update);
    
    return res.json({
      success: true,
      message: `Order ${isSuccess ? 'marked as paid' : 'marked as failed'} successfully`,
      orderId: order._id,
      state: state,
      isSuccess: isSuccess
    });
  } catch (error) {
    console.error('Simulate callback error:', error);
    res.status(500).json({
      success: false,
      message: 'Simulate callback failed',
      error: error.message
    });
  }
});

export default paymentRouter; 