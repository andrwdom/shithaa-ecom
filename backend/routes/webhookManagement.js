import express from 'express';
import {
  getQueueStats,
  getReconciliationStats,
  getWebhookHistory,
  getFailedWebhooks,
  reprocessWebhook,
  triggerReconciliation,
  getWebhookHealth,
  getWebhookMetrics,
  clearOldWebhooks
} from '../controllers/webhookManagementController.js';

const router = express.Router();

/**
 * WEBHOOK MANAGEMENT ROUTES
 * 
 * Provides comprehensive monitoring and management of webhook processing
 */

// Get webhook queue statistics
router.get('/queue/stats', getQueueStats);

// Get reconciliation statistics
router.get('/reconciliation/stats', getReconciliationStats);

// Get webhook processing history
router.get('/history', getWebhookHistory);

// Get failed webhooks (dead letter queue)
router.get('/failed', getFailedWebhooks);

// Reprocess a specific webhook
router.post('/reprocess/:webhookId', reprocessWebhook);

// Manually trigger reconciliation
router.post('/reconciliation/trigger', triggerReconciliation);

// Get webhook processing health
router.get('/health', getWebhookHealth);

// Get webhook processing metrics
router.get('/metrics', getWebhookMetrics);

// Clear old webhook data
router.delete('/cleanup', clearOldWebhooks);

export default router;