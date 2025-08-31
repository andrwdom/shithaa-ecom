import express from 'express';
import { paymentWebhookHandler } from '../controllers/webhookController.js';

const webhookRouter = express.Router();

// Generic payment webhook for reservation-based checkout
webhookRouter.post('/payment', paymentWebhookHandler);

export default webhookRouter;
