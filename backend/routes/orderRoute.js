import express from 'express';
import { 
    getOrderById, 
    getUserOrders,
    getOrdersByEmail,
    getUserOrderCount,
    getOrderByTransactionId
} from '../controllers/orderController.js';
import { verifyToken, optionalAuth } from '../middleware/auth.js'

const orderRouter = express.Router();

// Public routes (optional auth for guest users)
orderRouter.get('/transaction/:transactionId', optionalAuth, getOrderByTransactionId); // GET /api/orders/transaction/:transactionId
orderRouter.get('/:id', optionalAuth, getOrderById);   // GET /api/orders/:id

// Protected routes (requires authentication)
orderRouter.get('/user/:userId', verifyToken, getUserOrders); // GET /api/orders/user/:userId
orderRouter.get('/by-email/:email', optionalAuth, getOrdersByEmail); // GET /api/orders/by-email/:email
orderRouter.get('/user/count', (req, res, next) => {
  // Allow without auth for now - just return 0 for unauthenticated users
  if (!req.user) {
    return res.json({ success: true, count: 0 });
  }
  next();
}, getUserOrderCount); // GET /api/orders/user/count



export default orderRouter;