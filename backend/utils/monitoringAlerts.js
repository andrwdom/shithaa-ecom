import RawWebhook from '../models/RawWebhook.js';
import ProcessedEvent from '../models/ProcessedEvent.js';
import Order from '../models/orderModel.js';

/**
 * Monitoring and alerting utilities for webhook system
 */

/**
 * Check for webhook processing issues
 */
export async function checkWebhookHealth() {
  const alerts = [];
  
  try {
    // 1. Check for stuck webhooks (processing for more than 30 minutes)
    const stuckWebhooks = await RawWebhook.countDocuments({
      processing: true,
      processed: false,
      receivedAt: { $lt: new Date(Date.now() - 30 * 60 * 1000) }
    });
    
    if (stuckWebhooks > 0) {
      alerts.push({
        level: 'WARNING',
        message: `${stuckWebhooks} webhooks stuck in processing state`,
        action: 'Check webhook processor logs and restart if needed'
      });
    }
    
    // 2. Check for high webhook backlog
    const unprocessedWebhooks = await RawWebhook.countDocuments({
      processed: false,
      processing: false,
      receivedAt: { $gt: new Date(Date.now() - 10 * 60 * 1000) } // Last 10 minutes
    });
    
    if (unprocessedWebhooks > 10) {
      alerts.push({
        level: 'CRITICAL',
        message: `${unprocessedWebhooks} unprocessed webhooks in last 10 minutes`,
        action: 'Check webhook processor and increase processing capacity'
      });
    }
    
    // 3. Check for high failure rate
    const recentFailures = await ProcessedEvent.countDocuments({
      status: 'failed',
      processedAt: { $gt: new Date(Date.now() - 60 * 60 * 1000) } // Last hour
    });
    
    const recentTotal = await ProcessedEvent.countDocuments({
      processedAt: { $gt: new Date(Date.now() - 60 * 60 * 1000) }
    });
    
    if (recentTotal > 0) {
      const failureRate = (recentFailures / recentTotal) * 100;
      if (failureRate > 20) {
        alerts.push({
          level: 'CRITICAL',
          message: `High webhook failure rate: ${failureRate.toFixed(1)}%`,
          action: 'Check webhook processing logic and payment provider status'
        });
      }
    }
    
    // 4. Check for old draft orders
    const oldDrafts = await Order.countDocuments({
      status: 'draft',
      createdAt: { $lt: new Date(Date.now() - 60 * 60 * 1000) } // 1 hour ago
    });
    
    if (oldDrafts > 5) {
      alerts.push({
        level: 'WARNING',
        message: `${oldDrafts} draft orders older than 1 hour`,
        action: 'Check reconcile job and payment provider connectivity'
      });
    }
    
    // 5. Check for refunds triggered
    const recentRefunds = await Order.countDocuments({
      status: 'cancelled_due_to_stock',
      cancelledAt: { $gt: new Date(Date.now() - 60 * 60 * 1000) }
    });
    
    if (recentRefunds > 3) {
      alerts.push({
        level: 'WARNING',
        message: `${recentRefunds} orders cancelled due to stock in last hour`,
        action: 'Check stock management and inventory sync'
      });
    }
    
    return alerts;
    
  } catch (error) {
    console.error('Health check failed:', error);
    return [{
      level: 'CRITICAL',
      message: `Health check failed: ${error.message}`,
      action: 'Check system connectivity and logs'
    }];
  }
}

/**
 * Get webhook processing metrics
 */
export async function getWebhookMetrics() {
  try {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    
    const metrics = {
      lastHour: {
        total: await RawWebhook.countDocuments({ receivedAt: { $gt: oneHourAgo } }),
        processed: await RawWebhook.countDocuments({ 
          receivedAt: { $gt: oneHourAgo },
          processed: true 
        }),
        failed: await ProcessedEvent.countDocuments({ 
          processedAt: { $gt: oneHourAgo },
          status: 'failed'
        }),
        success: await ProcessedEvent.countDocuments({ 
          processedAt: { $gt: oneHourAgo },
          status: 'completed'
        })
      },
      lastDay: {
        total: await RawWebhook.countDocuments({ receivedAt: { $gt: oneDayAgo } }),
        processed: await RawWebhook.countDocuments({ 
          receivedAt: { $gt: oneDayAgo },
          processed: true 
        }),
        failed: await ProcessedEvent.countDocuments({ 
          processedAt: { $gt: oneDayAgo },
          status: 'failed'
        }),
        success: await ProcessedEvent.countDocuments({ 
          processedAt: { $gt: oneDayAgo },
          status: 'completed'
        })
      },
      current: {
        unprocessed: await RawWebhook.countDocuments({ 
          processed: false,
          processing: false 
        }),
        processing: await RawWebhook.countDocuments({ 
          processing: true 
        }),
        stuck: await RawWebhook.countDocuments({
          processing: true,
          receivedAt: { $lt: new Date(now.getTime() - 30 * 60 * 1000) }
        })
      }
    };
    
    return metrics;
    
  } catch (error) {
    console.error('Failed to get metrics:', error);
    return null;
  }
}

/**
 * Send alert (placeholder - integrate with your alerting system)
 */
export async function sendAlert(alert) {
  console.log(`🚨 ALERT [${alert.level}]: ${alert.message}`);
  console.log(`   Action: ${alert.action}`);
  
  // TODO: Integrate with your alerting system:
  // - Send to Slack webhook
  // - Send email via SMTP
  // - Send to PagerDuty
  // - Send to Discord webhook
  // - Send SMS via Twilio
  
  // Example Slack webhook integration:
  /*
  if (process.env.SLACK_WEBHOOK_URL) {
    const payload = {
      text: `🚨 *${alert.level}*: ${alert.message}`,
      attachments: [{
        color: alert.level === 'CRITICAL' ? 'danger' : 'warning',
        fields: [{
          title: 'Action Required',
          value: alert.action,
          short: false
        }]
      }]
    };
    
    await fetch(process.env.SLACK_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  }
  */
}

/**
 * Run health check and send alerts
 */
export async function runHealthCheck() {
  const alerts = await checkWebhookHealth();
  
  for (const alert of alerts) {
    await sendAlert(alert);
  }
  
  return alerts;
}
