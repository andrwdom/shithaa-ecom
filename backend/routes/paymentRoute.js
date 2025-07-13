import express from 'express';
import { 
    createPhonePeSession, 
    phonePeCallback, 
    verifyPhonePePayment 
} from '../controllers/paymentController.js';
import { verifyToken, optionalVerifyToken } from '../middleware/auth.js';

const paymentRouter = express.Router();

// PhonePe payment routes
paymentRouter.post('/phonepe/create-session', verifyToken, createPhonePeSession);
paymentRouter.post('/phonepe/callback', phonePeCallback);
paymentRouter.get('/phonepe/verify/:merchantTransactionId', optionalVerifyToken, verifyPhonePePayment);

export default paymentRouter; 