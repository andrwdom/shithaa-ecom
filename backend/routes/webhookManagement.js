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
import {
  getWebhookEvents,
  getWebhookEventById,
  retryFailedWebhookEvents,
  cleanupWebhookEvents
} from '../controllers/enhancedWebhookController.js';

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

// WEBHOOK IDEMPOTENCY MANAGEMENT ROUTES

// Get webhook events (idempotency tracking)
router.get('/events', getWebhookEvents);

// Get specific webhook event by ID
router.get('/events/:eventId', getWebhookEventById);

// Retry failed webhook events
router.post('/events/retry', retryFailedWebhookEvents);

// Cleanup old webhook events
router.delete('/events/cleanup', cleanupWebhookEvents);

export default router;