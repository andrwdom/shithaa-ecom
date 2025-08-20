import express from 'express';
import { 
    getAllOrders, 
    getOrderById, 
    createOrder, 
    updateOrder, 
    deleteOrder,
    getOrdersByUser,
    getOrdersByStatus,
    updateOrderStatus,
    createStructuredOrder,
    generateInvoice,
    getOrderAnalytics,
    getOrderStats,
    getOrderTimeline,
    getOrderHistory,
    getOrderSummary,
    getOrderDetails,
    getOrderTracking,
    getOrderNotes,
    addOrderNote,
    updateOrderNote,
    deleteOrderNote
} from '../controllers/orderController.js';
import { verifyToken, isAdmin, optionalAuth } from '../middleware/auth.js'

const orderRouter = express.Router();

// Public routes (optional auth for guest users)
orderRouter.get('/:id', optionalAuth, getOrderById);   // GET /api/orders/:id

// Protected routes (requires authentication)
orderRouter.get('/user/:userId', verifyToken, getOrdersByUser); // GET /api/orders/user/:userId
orderRouter.get('/status/:status', verifyToken, getOrdersByStatus); // GET /api/orders/status/:status
orderRouter.put('/:id/status', verifyToken, updateOrderStatus); // PUT /api/orders/:id/status
orderRouter.get('/analytics', verifyToken, getOrderAnalytics); // GET /api/orders/analytics
orderRouter.get('/stats', verifyToken, getOrderStats); // GET /api/orders/stats
orderRouter.get('/:id/timeline', verifyToken, getOrderTimeline); // GET /api/orders/:id/timeline
orderRouter.get('/history/:userId', verifyToken, getOrderHistory); // GET /api/orders/history/:userId
orderRouter.get('/summary/:userId', verifyToken, getOrderSummary); // GET /api/orders/summary/:userId
orderRouter.get('/details/:id', verifyToken, getOrderDetails); // GET /api/orders/details/:id
orderRouter.get('/tracking/:id', verifyToken, getOrderTracking); // GET /api/orders/tracking/:id
orderRouter.get('/:id/notes', verifyToken, getOrderNotes); // GET /api/orders/:id/notes
orderRouter.post('/:id/notes', verifyToken, addOrderNote); // POST /api/orders/:id/notes
orderRouter.put('/:id/notes/:noteId', verifyToken, updateOrderNote); // PUT /api/orders/:id/notes/:noteId
orderRouter.delete('/:id/notes/:noteId', verifyToken, deleteOrderNote); // DELETE /api/orders/:id/notes/:noteId

// Admin routes
orderRouter.get('/', verifyToken, isAdmin, getAllOrders); // GET /api/orders
orderRouter.post('/', optionalAuth, createStructuredOrder); // POST /api/orders (new)
orderRouter.put('/:id', verifyToken, isAdmin, updateOrder); // PUT /api/orders/:id
orderRouter.delete('/:id', verifyToken, isAdmin, deleteOrder); // DELETE /api/orders/:id

// Invoice generation
orderRouter.get('/:orderId/invoice', optionalAuth, generateInvoice) // GET /api/orders/:orderId/invoice

export default orderRouter;