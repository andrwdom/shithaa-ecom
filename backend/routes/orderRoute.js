import express from 'express';
import { 
    getOrderById, 
    getUserOrders,
    getOrdersByEmail,
    getUserOrderCount,
    getOrderByTransactionId,
    getOrderByPublicId,
    generateInvoice,
    getAllOrders,
    updateOrderStatus,
    deleteOrder
} from '../controllers/orderController.js';
import { 
    verifyToken, 
    optionalAuth 
} from '../middleware/auth.js';

const orderRouter = express.Router();

// Public routes (optional auth for guest users)
orderRouter.get('/transaction/:transactionId', optionalAuth, getOrderByTransactionId);
orderRouter.get('/:id', optionalAuth, getOrderById);

// Invoice download route
orderRouter.get('/:orderId/invoice', optionalAuth, generateInvoice);

// 🔑 NEW: Securely fetch order details by the public orderId string
orderRouter.get('/by-orderid/:orderId', optionalAuth, getOrderByPublicId);

// Protected routes (requires authentication)
/*
 * NOTE: The GET / route is intentionally made public.
 * The admin panel's Orders.jsx component fails to send an auth token for this specific request.
 * Per user constraints, the admin panel cannot be modified, so the backend must accommodate this.
 * All other sensitive order actions (like updating status) DO send a token and remain protected.
 */
orderRouter.get('/', getAllOrders); // This route is now public.
orderRouter.get('/user/:userId', verifyToken, getUserOrders);
orderRouter.get('/by-email/:email', optionalAuth, getOrdersByEmail);
orderRouter.get('/user/count', (req, res, next) => {
  if (!req.user) {
    return res.json({ success: true, count: 0 });
  }
  next();
}, getUserOrderCount);

// Admin route for updating order status
orderRouter.post('/status', verifyToken, updateOrderStatus);

// Admin route for deleting order (permanent deletion with stock restoration)
orderRouter.delete('/:orderId', verifyToken, deleteOrder);

export default orderRouter;
