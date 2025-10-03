import express from 'express';
import RawWebhook from '../models/RawWebhook.js';
import orderModel from '../models/orderModel.js';
import PaymentSession from '../models/paymentSessionModel.js';
import { webhookHealthCheck, retryFailedWebhooks } from '../controllers/enhancedWebhookController.js';
import { successResponse, errorResponse } from '../utils/response.js';
import EnhancedLogger from '../utils/enhancedLogger.js';

const router = express.Router();

/**
 * WEBHOOK MONITORING AND MANAGEMENT ROUTES
 * For admin dashboard and system monitoring
 */

// Webhook health check endpoint
router.get('/health', webhookHealthCheck);

// Manual webhook retry endpoint
router.post('/retry', retryFailedWebhooks);

// Webhook dashboard data
router.get('/dashboard', async (req, res) => {
  try {
    const { timeframe = 24 } = req.query; // Hours
    const since = new Date(Date.now() - timeframe * 60 * 60 * 1000);

    // Get webhook statistics
    const totalWebhooks = await RawWebhook.countDocuments({ receivedAt: { $gte: since } });
    const processedWebhooks = await RawWebhook.countDocuments({ 
      receivedAt: { $gte: since }, 
      processed: true 
    });
    const failedWebhooks = await RawWebhook.countDocuments({ 
      receivedAt: { $gte: since }, 
      processed: false,
      error: { $exists: true }
    });

    // Get recent failed webhooks
    const recentFailed = await RawWebhook.find({
      receivedAt: { $gte: since },
      $or: [
        { processed: false },
        { error: { $exists: true } }
      ]
    }).sort({ receivedAt: -1 }).limit(20);

    // Get orders confirmed via webhook in timeframe
    const webhookOrders = await orderModel.countDocuments({
      confirmedAt: { $gte: since },
      webhookProcessedAt: { $exists: true }
    });

    // Get emergency orders that need manual processing
    const emergencyOrders = await orderModel.find({
      'meta.source': { $in: ['emergency_webhook_recovery', 'webhook_recovery_payment_session'] },
      createdAt: { $gte: since }
    }).limit(10);

    const dashboard = {
      timeframe: `${timeframe} hours`,
      statistics: {
        totalWebhooks,
        processedWebhooks,
        failedWebhooks,
        successRate: totalWebhooks > 0 ? ((processedWebhooks / totalWebhooks) * 100).toFixed(2) + '%' : '0%',
        webhookOrders,
        emergencyOrdersCount: emergencyOrders.length
      },
      alerts: {
        highFailureRate: failedWebhooks > totalWebhooks * 0.1, // >10% failure rate
        emergencyOrders: emergencyOrders.length > 0,
        noRecentWebhooks: totalWebhooks === 0 && timeframe <= 24
      },
      recentFailed: recentFailed.map(w => ({
        id: w._id,
        correlationId: w.correlationId,
        orderId: w.parsedData?.orderId,
        error: w.error,
        receivedAt: w.receivedAt,
        retryCount: w.retryCount || 0
      })),
      emergencyOrders: emergencyOrders.map(o => ({
        id: o._id,
        orderId: o.orderId,
        phonepeTransactionId: o.phonepeTransactionId,
        total: o.total,
        createdAt: o.createdAt,
        requiresManualProcessing: o.meta?.requiresManualProcessing
      }))
    };

    successResponse(res, dashboard);
    
  } catch (error) {
    EnhancedLogger.webhookLog('ERROR', 'Dashboard data fetch failed', {
      error: error.message
    });
    errorResponse(res, 500, 'Failed to fetch dashboard data', error.message);
  }
});

// Get webhook details by ID
router.get('/webhook/:id', async (req, res) => {
  try {
    const webhook = await RawWebhook.findById(req.params.id);
    
    if (!webhook) {
      return errorResponse(res, 404, 'Webhook not found');
    }

    // Find related order if exists
    let relatedOrder = null;
    if (webhook.parsedData?.orderId) {
      relatedOrder = await orderModel.findOne({
        phonepeTransactionId: webhook.parsedData.orderId
      });
    }

    const details = {
      webhook: {
        id: webhook._id,
        provider: webhook.provider,
        correlationId: webhook.correlationId,
        receivedAt: webhook.receivedAt,
        processed: webhook.processed,
        processedAt: webhook.processedAt,
        error: webhook.error,
        retryCount: webhook.retryCount || 0,
        parsedData: webhook.parsedData,
        headers: webhook.headers,
        rawPayload: webhook.raw
      },
      relatedOrder: relatedOrder ? {
        id: relatedOrder._id,
        orderId: relatedOrder.orderId,
        status: relatedOrder.status,
        paymentStatus: relatedOrder.paymentStatus,
        total: relatedOrder.total,
        userEmail: relatedOrder.userInfo?.email,
        createdAt: relatedOrder.createdAt,
        confirmedAt: relatedOrder.confirmedAt
      } : null
    };

    successResponse(res, details);
    
  } catch (error) {
    EnhancedLogger.webhookLog('ERROR', 'Webhook details fetch failed', {
      webhookId: req.params.id,
      error: error.message
    });
    errorResponse(res, 500, 'Failed to fetch webhook details', error.message);
  }
});

// Manually process specific webhook
router.post('/webhook/:id/process', async (req, res) => {
  try {
    const webhook = await RawWebhook.findById(req.params.id);
    
    if (!webhook) {
      return errorResponse(res, 404, 'Webhook not found');
    }

    if (webhook.processed) {
      return errorResponse(res, 400, 'Webhook already processed');
    }

    const BulletproofWebhookService = (await import('../services/bulletproofWebhookService.js')).default;
    const webhookService = new BulletproofWebhookService();

    // Parse webhook payload
    const { phonePeWebhookHandler } = await import('../controllers/enhancedWebhookController.js');
    const parseWebhookPayload = (body) => {
      try {
        const parsedBody = typeof body === 'string' ? JSON.parse(body) : body;
        const { payload, event } = parsedBody;
        
        if (!payload || !event) {
          return { isValid: false, error: 'Missing payload or event' };
        }

        const orderId = payload.orderId || payload.merchantTransactionId || payload.transactionId;
        const state = (payload.state || payload.status || '').toString().toUpperCase();
        const amount = payload.amount || 0;
        
        const isSuccess = ['COMPLETED', 'SUCCESS', 'PAID', 'CAPTURED', 'OK'].includes(state);
        const isFailure = ['FAILED', 'CANCELLED', 'TIMEOUT', 'ERROR'].includes(state);

        return {
          isValid: true,
          orderId,
          state,
          amount,
          isSuccess,
          isFailure,
          event,
          fullPayload: payload
        };
      } catch (error) {
        return { isValid: false, error: error.message };
      }
    };

    const webhookPayload = parseWebhookPayload(webhook.raw);
    
    if (!webhookPayload.isValid) {
      return errorResponse(res, 400, 'Invalid webhook payload', webhookPayload.error);
    }

    // Process webhook
    const result = await webhookService.processWebhook(webhookPayload, webhook.correlationId);

    // Update webhook record
    webhook.processed = true;
    webhook.processedAt = new Date();
    webhook.manuallyProcessed = true;
    webhook.processResult = result;
    await webhook.save();

    EnhancedLogger.webhookLog('SUCCESS', 'Webhook manually processed', {
      webhookId: webhook._id,
      correlationId: webhook.correlationId,
      result: result.action,
      processedBy: 'manual_admin'
    });

    successResponse(res, {
      message: 'Webhook processed successfully',
      result,
      webhook: {
        id: webhook._id,
        processed: true,
        processedAt: webhook.processedAt
      }
    });
    
  } catch (error) {
    EnhancedLogger.webhookLog('ERROR', 'Manual webhook processing failed', {
      webhookId: req.params.id,
      error: error.message
    });
    errorResponse(res, 500, 'Failed to process webhook', error.message);
  }
});

// Get webhook processing statistics
router.get('/statistics', async (req, res) => {
  try {
    const { days = 7 } = req.query;
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const stats = await RawWebhook.aggregate([
      { $match: { receivedAt: { $gte: since } } },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: "%Y-%m-%d", date: "$receivedAt" } },
            provider: "$provider"
          },
          total: { $sum: 1 },
          processed: { $sum: { $cond: ["$processed", 1, 0] } },
          failed: { $sum: { $cond: [{ $ne: ["$error", null] }, 1, 0] } }
        }
      },
      { $sort: { "_id.date": -1 } }
    ]);

    // Get order confirmation stats
    const orderStats = await orderModel.aggregate([
      { $match: { confirmedAt: { $gte: since }, webhookProcessedAt: { $exists: true } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$confirmedAt" } },
          ordersConfirmed: { $sum: 1 },
          totalValue: { $sum: "$total" }
        }
      },
      { $sort: { "_id": -1 } }
    ]);

    successResponse(res, {
      webhookStats: stats,
      orderStats: orderStats,
      period: `${days} days`
    });
    
  } catch (error) {
    EnhancedLogger.webhookLog('ERROR', 'Statistics fetch failed', {
      error: error.message
    });
    errorResponse(res, 500, 'Failed to fetch statistics', error.message);
  }
});

// Emergency order management
router.get('/emergency-orders', async (req, res) => {
  try {
    const { limit = 50 } = req.query;
    
    const emergencyOrders = await orderModel.find({
      'meta.source': { $in: ['emergency_webhook_recovery', 'webhook_recovery_payment_session'] },
      'meta.requiresManualProcessing': true
    })
    .sort({ createdAt: -1 })
    .limit(parseInt(limit));

    const ordersWithDetails = emergencyOrders.map(order => ({
      id: order._id,
      orderId: order.orderId,
      phonepeTransactionId: order.phonepeTransactionId,
      status: order.status,
      paymentStatus: order.paymentStatus,
      total: order.total,
      createdAt: order.createdAt,
      emergencyReason: order.meta?.emergencyReason,
      alert: order.meta?.alert,
      requiresManualProcessing: order.meta?.requiresManualProcessing,
      userInfo: {
        email: order.userInfo?.email,
        name: order.userInfo?.name
      },
      items: order.items || [],
      webhookData: order.webhookData
    }));

    successResponse(res, {
      count: ordersWithDetails.length,
      orders: ordersWithDetails
    });
    
  } catch (error) {
    EnhancedLogger.webhookLog('ERROR', 'Emergency orders fetch failed', {
      error: error.message
    });
    errorResponse(res, 500, 'Failed to fetch emergency orders', error.message);
  }
});

export default router;
