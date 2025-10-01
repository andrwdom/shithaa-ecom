import express from 'express';
import { 
    createPhonePeSession, 
    phonePeCallback, 
    verifyPhonePePayment,
    dummyPaymentSuccess,
    getPaymentStatus,
    getOrderByTransactionId // 🔑 ADDED: Import the new controller function
} from '../controllers/paymentController.js';
import { verifyToken, optionalAuth } from '../middleware/auth.js';
// Add imports for refund and webhook controllers
import { initiatePhonePeRefund, getPhonePeRefundStatus } from '../controllers/refundController.js';
import { phonePeWebhookHandler } from '../controllers/enhancedWebhookController.js';

const paymentRouter = express.Router();

// PhonePe payment routes
paymentRouter.post('/phonepe/create-session', optionalAuth, createPhonePeSession);
paymentRouter.post('/phonepe/callback', phonePeCallback);
paymentRouter.post('/phonepe/dummy-success', verifyToken, dummyPaymentSuccess);
paymentRouter.get('/phonepe/verify/:merchantTransactionId', optionalAuth, verifyPhonePePayment);

// 🔑 NEW: Endpoint for frontend to fetch order details securely after payment
paymentRouter.get('/order/:transactionId', optionalAuth, getOrderByTransactionId);

// Payment status endpoint
paymentRouter.get('/status/:sessionId', optionalAuth, getPaymentStatus);
// PhonePe refund routes
paymentRouter.post('/phonepe/refund', verifyToken, initiatePhonePeRefund);
paymentRouter.get('/phonepe/refund-status/:merchantRefundId', verifyToken, getPhonePeRefundStatus);
// PhonePe webhook route
paymentRouter.post('/phonepe/webhook', phonePeWebhookHandler);

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

// Quick fix endpoint - mark any order as paid by transaction ID
paymentRouter.post('/phonepe/quick-fix/:merchantTransactionId', async (req, res) => {
  try {
    const { merchantTransactionId } = req.params;
    console.log('Quick fix request for transaction:', merchantTransactionId);
    
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
    
    // Mark as paid immediately
    await (await import('../models/orderModel.js')).default.findByIdAndUpdate(order._id, {
      payment: true,
      paymentStatus: 'paid',
      orderStatus: 'Confirmed',
      status: 'Order Placed',
      updatedAt: new Date(),
      paymentLog: { ...order.paymentLog, quickFix: true, fixedAt: new Date() }
    });
    
    return res.json({
      success: true,
      message: 'Order marked as paid successfully',
      orderId: order._id,
      merchantTransactionId
    });
  } catch (error) {
    console.error('Quick fix error:', error);
    res.status(500).json({
      success: false,
      message: 'Quick fix failed',
      error: error.message
    });
  }
});

export default paymentRouter; 