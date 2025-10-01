import express from 'express';
import { 
  bulletproofWebhookHandler, 
  webhookStatus, 
  manualOrderConfirmation, 
  bulkReconciliation 
} from '../controllers/bulletproofWebhookController.js';

const router = express.Router();

/**
 * BULLETPROOF WEBHOOK ROUTES
 * These routes provide maximum reliability for order processing
 */

// Main webhook endpoint - replaces the old webhook handler
router.post('/webhook', bulletproofWebhookHandler);

// Webhook status monitoring
router.get('/status', webhookStatus);

// Manual order confirmation (emergency use)
router.post('/confirm-order', manualOrderConfirmation);

// Bulk reconciliation (admin use)
router.post('/reconcile', bulkReconciliation);

export default router;
