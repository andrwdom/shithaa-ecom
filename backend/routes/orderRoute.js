import express from 'express';
import { 
    getAllOrders, 
    getOrderById, 
    createOrder, 
    updateOrder, 
    deleteOrder,
    getUserOrders,
    updateOrderStatus,
    createStructuredOrder,
    generateInvoice,
    getOrdersByEmail,
    getUserOrderCount,
    confirmOrderStock,
    getOrderByTransactionId
} from '../controllers/orderController.js';
import { verifyToken, isAdmin, optionalAuth } from '../middleware/auth.js'

const orderRouter = express.Router();

// Public routes (optional auth for guest users)
orderRouter.get('/transaction/:transactionId', optionalAuth, getOrderByTransactionId); // GET /api/orders/transaction/:transactionId
orderRouter.get('/:id', optionalAuth, getOrderById);   // GET /api/orders/:id

// Protected routes (requires authentication)
orderRouter.get('/user/:userId', verifyToken, getUserOrders); // GET /api/orders/user/:userId
orderRouter.put('/:id/status', verifyToken, updateOrderStatus); // PUT /api/orders/:id/status
orderRouter.get('/by-email/:email', optionalAuth, getOrdersByEmail); // GET /api/orders/by-email/:email
orderRouter.get('/user/count', verifyToken, getUserOrderCount); // GET /api/orders/user/count

// Admin routes
orderRouter.get('/', verifyToken, isAdmin, getAllOrders); // GET /api/orders
orderRouter.post('/', optionalAuth, createStructuredOrder); // POST /api/orders (new)
orderRouter.put('/:id', verifyToken, isAdmin, updateOrder); // PUT /api/orders/:id
orderRouter.delete('/:id', verifyToken, isAdmin, deleteOrder); // DELETE /api/orders/:id

// Invoice generation
orderRouter.get('/:orderId/invoice', optionalAuth, generateInvoice) // GET /api/orders/:orderId/invoice

export default orderRouter;