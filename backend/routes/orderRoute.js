import express from 'express'
import {
    placeOrder, 
    allOrders, 
    userOrders, 
    updateStatus, 
    processCardPayment, 
    cancelOrder,
    getUserOrders,
    getOrderById,
    createOrder,
    generateInvoice,
    getUserOrderCount,
    createStructuredOrder,
    getOrdersByEmail
} from '../controllers/orderController.js'
import adminAuth from '../middleware/adminAuth.js'
import { verifyToken, isAdmin, optionalVerifyToken } from '../middleware/auth.js'

const orderRouter = express.Router()

// RESTful routes
orderRouter.get('/user', verifyToken, getUserOrders); // GET /api/orders/user
orderRouter.get('/user/count', verifyToken, getUserOrderCount);
orderRouter.get('/by-email/:email', getOrdersByEmail)
orderRouter.get('/:id', optionalVerifyToken, getOrderById);   // GET /api/orders/:id

// PhonePe order lookup endpoint - MUST come before generic routes
orderRouter.get('/phonepe/:merchantTransactionId', async (req, res) => {
  console.log('PhonePe order lookup endpoint hit:', req.params);
  console.log('Request URL:', req.url);
  console.log('Request method:', req.method);
  
  try {
    const { merchantTransactionId } = req.params;
    if (!merchantTransactionId) {
      console.log('No merchant transaction ID provided');
      return res.status(400).json({
        success: false,
        message: 'Merchant transaction ID is required'
      });
    }

    console.log('Looking up order for transaction ID:', merchantTransactionId);
    
    const order = await (await import('../models/orderModel.js')).default.findOne({
      phonepeTransactionId: merchantTransactionId
    });

    console.log('Order lookup result:', order ? 'Found' : 'Not found');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found for this transaction'
      });
    }

    res.json({
      success: true,
      order: {
        id: order._id,
        phonepeTransactionId: order.phonepeTransactionId,
        paymentStatus: order.paymentStatus,
        orderStatus: order.orderStatus,
        status: order.status,
        amount: order.amount,
        createdAt: order.createdAt
      }
    });
  } catch (error) {
    console.error('PhonePe order lookup error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to lookup order',
      error: error.message
    });
  }
});

// Emergency fallback - get most recent pending order
orderRouter.get('/recent-pending', async (req, res) => {
  try {
    const order = await (await import('../models/orderModel.js')).default.findOne({
      paymentStatus: { $in: ['pending', 'paid'] }
    }).sort({ createdAt: -1 }).limit(1);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'No recent orders found'
      });
    }

    res.json({
      success: true,
      order: {
        id: order._id,
        phonepeTransactionId: order.phonepeTransactionId,
        paymentStatus: order.paymentStatus,
        orderStatus: order.orderStatus,
        status: order.status,
        amount: order.amount,
        payment: order.payment,
        createdAt: order.createdAt
      }
    });
  } catch (error) {
    console.error('Recent pending order lookup error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to lookup recent order',
      error: error.message
    });
  }
});

orderRouter.post('/', optionalVerifyToken, createStructuredOrder); // POST /api/orders (new)
orderRouter.post('/legacy', verifyToken, createOrder);      // POST /api/orders/legacy

// Admin Features
orderRouter.post('/list', adminAuth, allOrders)
orderRouter.post('/status', adminAuth, updateStatus)

// User Features - Legacy routes for backward compatibility
orderRouter.post('/userorders', verifyToken, userOrders)
orderRouter.post('/place', verifyToken, placeOrder)
orderRouter.post('/process-card', verifyToken, processCardPayment)
orderRouter.post('/cancel', verifyToken, cancelOrder)

orderRouter.get('/', async (req, res) => {
  try {
    console.log('Orders GET request received');
    console.log('Origin:', req.headers.origin);
    console.log('User-Agent:', req.headers['user-agent']);
    
    const { email } = req.query;
    let orders;
    if (email) {
      // Search both legacy and new-structure orders
      orders = await (await import('../models/orderModel.js')).default.find({
        $or: [
          { email: { $regex: new RegExp('^' + email + '$', 'i') } },
          { 'userInfo.email': { $regex: new RegExp('^' + email + '$', 'i') } }
        ]
      }).sort({ createdAt: -1 });
    } else {
      orders = await (await import('../models/orderModel.js')).default.find().sort({ createdAt: -1 });
    }
    
    console.log(`Found ${orders.length} orders`);
    res.json({ success: true, orders });
  } catch (err) {
    console.error('Error in orders GET route:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch orders', error: err.message });
  }
});

orderRouter.get('/:orderId/invoice', optionalVerifyToken, generateInvoice)

export default orderRouter