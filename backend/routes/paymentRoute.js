import express from 'express';
import { 
    createPhonePeSession, 
    phonePeCallback, 
    verifyPhonePePayment,
    dummyPaymentSuccess
} from '../controllers/paymentController.js';
import { verifyToken, optionalVerifyToken } from '../middleware/auth.js';
// Add imports for refund and webhook controllers
import { initiatePhonePeRefund, getPhonePeRefundStatus } from '../controllers/refundController.js';
import { phonePeWebhookHandler } from '../controllers/webhookController.js';

const paymentRouter = express.Router();

// PhonePe payment routes
paymentRouter.post('/phonepe/create-session', verifyToken, createPhonePeSession);
paymentRouter.post('/phonepe/callback', phonePeCallback);
paymentRouter.post('/phonepe/dummy-success', verifyToken, dummyPaymentSuccess);
paymentRouter.get('/phonepe/verify/:merchantTransactionId', optionalVerifyToken, verifyPhonePePayment);
// PhonePe refund routes
paymentRouter.post('/phonepe/refund', verifyToken, initiatePhonePeRefund);
paymentRouter.get('/phonepe/refund-status/:merchantRefundId', verifyToken, getPhonePeRefundStatus);
// PhonePe webhook route
paymentRouter.post('/phonepe/webhook', phonePeWebhookHandler);

export default paymentRouter; 