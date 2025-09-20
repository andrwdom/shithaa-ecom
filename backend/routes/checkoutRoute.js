import express from 'express';
import { 
    createCheckoutSession, 
    getCheckoutSession, 
    reserveStockForSession, 
    releaseStockForSession, 
    cancelCheckoutSession,
    validateStock
} from '../controllers/checkoutController.js';
import { verifyToken, optionalAuth } from '../middleware/auth.js';

const checkoutRouter = express.Router();

// Create checkout session (optional auth for guest users)
checkoutRouter.post('/session', optionalAuth, createCheckoutSession);

// Get checkout session by ID (optional auth for guest users)
checkoutRouter.get('/session/:sessionId', optionalAuth, getCheckoutSession);

// Reserve stock for checkout session (optional auth for guest users)
checkoutRouter.post('/session/:sessionId/reserve-stock', optionalAuth, reserveStockForSession);

// Release stock for checkout session (requires authentication)
checkoutRouter.post('/session/:sessionId/release-stock', verifyToken, releaseStockForSession);

// Cancel checkout session (requires authentication)
checkoutRouter.post('/session/:sessionId/cancel', verifyToken, cancelCheckoutSession);

// 🚀 NEW: Validate stock availability (optional auth for guest users)
checkoutRouter.post('/validate-stock', optionalAuth, validateStock);

export default checkoutRouter;
