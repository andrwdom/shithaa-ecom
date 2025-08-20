import express from 'express';
import { 
    createCheckoutSession, 
    getCheckoutSession, 
    reserveStockForSession, 
    releaseStockForSession, 
    cancelCheckoutSession 
} from '../controllers/checkoutController.js';
import { verifyToken, optionalVerifyToken } from '../middleware/auth.js';

const checkoutRouter = express.Router();

// Create checkout session (requires authentication)
checkoutRouter.post('/session', verifyToken, createCheckoutSession);

// Get checkout session by ID (optional auth for guest users)
checkoutRouter.get('/session/:sessionId', optionalVerifyToken, getCheckoutSession);

// Reserve stock for checkout session (requires authentication)
checkoutRouter.post('/session/:sessionId/reserve-stock', verifyToken, reserveStockForSession);

// Release stock for checkout session (requires authentication)
checkoutRouter.post('/session/:sessionId/release-stock', verifyToken, releaseStockForSession);

// Cancel checkout session (requires authentication)
checkoutRouter.post('/session/:sessionId/cancel', verifyToken, cancelCheckoutSession);

export default checkoutRouter;
