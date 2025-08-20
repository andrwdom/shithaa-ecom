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
orderRouter.get('/user/count', verifyToken, getUserOrderCount); // GET /api/orders/user/count



export default orderRouter;