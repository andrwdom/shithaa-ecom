import webhookServiceManager from '../services/webhookServiceManager.js';
import RawWebhook from '../models/RawWebhook.js';
import orderModel from '../models/orderModel.js';
import EnhancedLogger from '../utils/enhancedLogger.js';
import { successResponse, errorResponse } from '../utils/response.js';

/**
 * WEBHOOK MANAGEMENT CONTROLLER
 * 
 * Provides comprehensive monitoring and management of webhook processing
 */
class WebhookManagementController {
  constructor() {
    // Services will be obtained from service manager
  }

  /**
   * Get webhook services (lazy initialization)
   */
  async getServices() {
    return await webhookServiceManager.initialize();
  }

  /**
   * Get webhook queue statistics
   */
  async getQueueStats(req, res) {
    try {
      const services = await this.getServices();
      const stats = await services.queueManager.getQueueStats();
      
      return successResponse(res, {
        message: 'Webhook queue statistics retrieved',
        data: stats
      });
    } catch (error) {
      EnhancedLogger.criticalAlert('WEBHOOK: Failed to get queue stats', {
        error: error.message
      });
      return errorResponse(res, 500, 'Failed to get queue statistics', error.message);
    }
  }

  /**
   * Get reconciliation statistics
   */
  async getReconciliationStats(req, res) {
    try {
      const services = await this.getServices();
      const stats = await services.reconciliationService.getReconciliationStats();
      
      return successResponse(res, {
        message: 'Reconciliation statistics retrieved',
        data: stats
      });
    } catch (error) {
      EnhancedLogger.criticalAlert('WEBHOOK: Failed to get reconciliation stats', {
        error: error.message
      });
      return errorResponse(res, 500, 'Failed to get reconciliation statistics', error.message);
    }
  }

  /**
   * Get webhook processing history
   */
  async getWebhookHistory(req, res) {
    try {
      const { page = 1, limit = 50, status, orderId } = req.query;
      const skip = (page - 1) * limit;
      
      const filter = {};
      if (status) filter.processed = status === 'processed';
      if (orderId) filter.orderId = orderId;
      
      const webhooks = await RawWebhook.find(filter)
        .sort({ receivedAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean();
      
      const total = await RawWebhook.countDocuments(filter);
      
      return successResponse(res, {
        message: 'Webhook history retrieved',
        data: {
          webhooks,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / limit)
          }
        }
      });
    } catch (error) {
      EnhancedLogger.criticalAlert('WEBHOOK: Failed to get webhook history', {
        error: error.message
      });
      return errorResponse(res, 500, 'Failed to get webhook history', error.message);
    }
  }

  /**
   * Get failed webhooks (dead letter queue)
   */
  async getFailedWebhooks(req, res) {
    try {
      const { page = 1, limit = 20 } = req.query;
      const skip = (page - 1) * limit;
      
      const failedWebhooks = await RawWebhook.find({
        deadLetter: true,
        requiresManualProcessing: true
      })
      .sort({ lastErrorAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();
      
      const total = await RawWebhook.countDocuments({
        deadLetter: true,
        requiresManualProcessing: true
      });
      
      return successResponse(res, {
        message: 'Failed webhooks retrieved',
        data: {
          webhooks: failedWebhooks,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / limit)
          }
        }
      });
    } catch (error) {
      EnhancedLogger.criticalAlert('WEBHOOK: Failed to get failed webhooks', {
        error: error.message
      });
      return errorResponse(res, 500, 'Failed to get failed webhooks', error.message);
    }
  }

  /**
   * Reprocess a specific webhook
   */
  async reprocessWebhook(req, res) {
    try {
      const { webhookId } = req.params;
      const correlationId = req.headers['x-request-id'] || `reprocess_${Date.now()}`;
      
      const services = await this.getServices();
      const result = await services.queueManager.reprocessWebhook(webhookId, correlationId);
      
      return successResponse(res, {
        message: 'Webhook reprocessing initiated',
        data: result
      });
    } catch (error) {
      EnhancedLogger.criticalAlert('WEBHOOK: Failed to reprocess webhook', {
        webhookId: req.params.webhookId,
        error: error.message
      });
      return errorResponse(res, 500, 'Failed to reprocess webhook', error.message);
    }
  }

  /**
   * Manually trigger reconciliation
   */
  async triggerReconciliation(req, res) {
    try {
      const correlationId = req.headers['x-request-id'] || `manual_reconciliation_${Date.now()}`;
      
      // Run reconciliation in background
      setImmediate(async () => {
        try {
          const services = await this.getServices();
          await services.reconciliationService.performReconciliation();
        } catch (error) {
          EnhancedLogger.criticalAlert('WEBHOOK: Manual reconciliation failed', {
            correlationId,
            error: error.message
          });
        }
      });
      
      return successResponse(res, {
        message: 'Reconciliation triggered successfully',
        correlationId
      });
    } catch (error) {
      EnhancedLogger.criticalAlert('WEBHOOK: Failed to trigger reconciliation', {
        error: error.message
      });
      return errorResponse(res, 500, 'Failed to trigger reconciliation', error.message);
    }
  }

  /**
   * Get webhook processing health
   */
  async getWebhookHealth(req, res) {
    try {
      const services = await this.getServices();
      const queueStats = await services.queueManager.getQueueStats();
      const reconciliationStats = await services.reconciliationService.getReconciliationStats();
      
      // Calculate health score
      const totalWebhooks = queueStats?.queue?.total || 0;
      const processedWebhooks = queueStats?.queue?.processed || 0;
      const failedWebhooks = queueStats?.queue?.deadLetter || 0;
      const processingWebhooks = queueStats?.queue?.processing || 0;
      
      const healthScore = totalWebhooks > 0 ? 
        ((processedWebhooks / totalWebhooks) * 100) : 100;
      
      const isHealthy = healthScore >= 95 && failedWebhooks < 5;
      
      return successResponse(res, {
        message: 'Webhook health status retrieved',
        data: {
          health: {
            score: Math.round(healthScore),
            status: isHealthy ? 'healthy' : 'unhealthy',
            isHealthy
          },
          queue: queueStats,
          reconciliation: reconciliationStats,
          alerts: this.generateHealthAlerts(queueStats, reconciliationStats)
        }
      });
    } catch (error) {
      EnhancedLogger.criticalAlert('WEBHOOK: Failed to get webhook health', {
        error: error.message
      });
      return errorResponse(res, 500, 'Failed to get webhook health', error.message);
    }
  }

  /**
   * Generate health alerts
   */
  generateHealthAlerts(queueStats, reconciliationStats) {
    const alerts = [];
    
    if (queueStats?.queue?.deadLetter > 10) {
      alerts.push({
        level: 'critical',
        message: `High number of failed webhooks: ${queueStats.queue.deadLetter}`,
        action: 'Check dead letter queue and reprocess failed webhooks'
      });
    }
    
    if (queueStats?.queue?.processing > 50) {
      alerts.push({
        level: 'warning',
        message: `High number of processing webhooks: ${queueStats.queue.processing}`,
        action: 'Monitor processing queue for bottlenecks'
      });
    }
    
    if (queueStats?.activeProcessors === 0 && queueStats?.queue?.pending > 0) {
      alerts.push({
        level: 'critical',
        message: 'No active processors but webhooks are pending',
        action: 'Restart webhook queue manager'
      });
    }
    
    return alerts;
  }

  /**
   * Get webhook processing metrics
   */
  async getWebhookMetrics(req, res) {
    try {
      const { hours = 24 } = req.query;
      const cutoffTime = new Date(Date.now() - (hours * 60 * 60 * 1000));
      
      // Get webhook processing metrics
      const webhookMetrics = await RawWebhook.aggregate([
        {
          $match: {
            receivedAt: { $gte: cutoffTime }
          }
        },
        {
          $group: {
            _id: {
              hour: { $hour: '$receivedAt' },
              day: { $dayOfMonth: '$receivedAt' },
              month: { $month: '$receivedAt' }
            },
            total: { $sum: 1 },
            processed: { $sum: { $cond: ['$processed', 1, 0] } },
            failed: { $sum: { $cond: ['$deadLetter', 1, 0] } },
            avgProcessingTime: {
              $avg: {
                $cond: [
                  { $and: ['$processedAt', '$receivedAt'] },
                  { $subtract: ['$processedAt', '$receivedAt'] },
                  null
                ]
              }
            }
          }
        },
        { $sort: { '_id.day': 1, '_id.hour': 1 } }
      ]);
      
      // Get order confirmation metrics
      const orderMetrics = await orderModel.aggregate([
        {
          $match: {
            createdAt: { $gte: cutoffTime },
            status: 'CONFIRMED'
          }
        },
        {
          $group: {
            _id: {
              hour: { $hour: '$confirmedAt' },
              day: { $dayOfMonth: '$confirmedAt' },
              month: { $month: '$confirmedAt' }
            },
            confirmed: { $sum: 1 },
            totalAmount: { $sum: '$total' }
          }
        },
        { $sort: { '_id.day': 1, '_id.hour': 1 } }
      ]);
      
      return successResponse(res, {
        message: 'Webhook metrics retrieved',
        data: {
          webhookMetrics,
          orderMetrics,
          period: `${hours} hours`
        }
      });
    } catch (error) {
      EnhancedLogger.criticalAlert('WEBHOOK: Failed to get webhook metrics', {
        error: error.message
      });
      return errorResponse(res, 500, 'Failed to get webhook metrics', error.message);
    }
  }

  /**
   * Clear old webhook data
   */
  async clearOldWebhooks(req, res) {
    try {
      const { days = 7 } = req.query;
      const cutoffTime = new Date(Date.now() - (days * 24 * 60 * 60 * 1000));
      
      const result = await RawWebhook.deleteMany({
        receivedAt: { $lt: cutoffTime },
        processed: true,
        deadLetter: { $ne: true }
      });
      
      EnhancedLogger.webhookLog('INFO', 'Old webhook data cleared', {
        days,
        deletedCount: result.deletedCount
      });
      
      return successResponse(res, {
        message: 'Old webhook data cleared successfully',
        data: {
          deletedCount: result.deletedCount,
          days
        }
      });
    } catch (error) {
      EnhancedLogger.criticalAlert('WEBHOOK: Failed to clear old webhook data', {
        error: error.message
      });
      return errorResponse(res, 500, 'Failed to clear old webhook data', error.message);
    }
  }
}

const webhookManagementController = new WebhookManagementController();

export const getQueueStats = webhookManagementController.getQueueStats.bind(webhookManagementController);
export const getReconciliationStats = webhookManagementController.getReconciliationStats.bind(webhookManagementController);
export const getWebhookHistory = webhookManagementController.getWebhookHistory.bind(webhookManagementController);
export const getFailedWebhooks = webhookManagementController.getFailedWebhooks.bind(webhookManagementController);
export const reprocessWebhook = webhookManagementController.reprocessWebhook.bind(webhookManagementController);
export const triggerReconciliation = webhookManagementController.triggerReconciliation.bind(webhookManagementController);
export const getWebhookHealth = webhookManagementController.getWebhookHealth.bind(webhookManagementController);
export const getWebhookMetrics = webhookManagementController.getWebhookMetrics.bind(webhookManagementController);
export const clearOldWebhooks = webhookManagementController.clearOldWebhooks.bind(webhookManagementController);
