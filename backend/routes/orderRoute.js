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
    res.json({ success: true, orders });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch orders', error: err.message });
  }
});

orderRouter.get('/:orderId/invoice', optionalVerifyToken, generateInvoice)

export default orderRouter