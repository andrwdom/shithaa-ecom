import express from 'express';
import { createPhonePeSession, phonePeCallback, verifyPhonePePayment, getPaymentStatus, cancelPayment } from '../controllers/paymentController.js';
import { verifyToken, optionalAuth } from '../middleware/auth.js';

const router = express.Router();

// PhonePe payment routes
router.post('/phonepe/session', verifyToken, createPhonePeSession);
router.post('/phonepe/callback', phonePeCallback);
router.get('/phonepe/verify/:merchantTransactionId', verifyPhonePePayment);
router.post('/phonepe/cancel', cancelPayment); // New route for cancellation
router.get('/status/:sessionId', getPaymentStatus);

export default router;