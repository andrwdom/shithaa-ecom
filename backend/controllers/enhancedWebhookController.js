import BulletproofWebhookService from '../services/bulletproofWebhookService.js';
import RawWebhook from '../models/RawWebhook.js';
import { successResponse, errorResponse } from '../utils/response.js';
import crypto from 'crypto';
import EnhancedLogger from '../utils/enhancedLogger.js';

const webhookService = new BulletproofWebhookService();

/**
 * Enhanced PhonePe webhook handler with bulletproof processing
 */
export async function phonePeWebhookHandler(req, res) {
  const correlationId = req.headers['x-request-id'] || `webhook_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  try {
    // IMMEDIATE ACKNOWLEDGMENT - Critical for preventing payment provider retries
    res.status(200).json({ 
      success: true, 
      message: 'Webhook received and queued for processing',
      correlationId,
      timestamp: new Date().toISOString()
    });

    // Log webhook receipt
    EnhancedLogger.webhookLog('INFO', 'PhonePe webhook received', {
      correlationId,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      contentType: req.headers['content-type']
    });

    // Verify signature first
    const signatureValid = await verifyPhonePeSignature(req, correlationId);
    if (!signatureValid) {
      EnhancedLogger.webhookLog('ERROR', 'Invalid webhook signature - processing stopped', {
        correlationId
      });
      return; // Already sent 200, but don't process
    }

    // Parse webhook payload
    const webhookPayload = parseWebhookPayload(req.body, correlationId);
    if (!webhookPayload.isValid) {
      EnhancedLogger.webhookLog('ERROR', 'Invalid webhook payload - processing stopped', {
        correlationId,
        error: webhookPayload.error
      });
      return; // Already sent 200, but don't process
    }

    // Save raw webhook for audit trail
    await saveRawWebhook(req, correlationId, webhookPayload);

    // Process webhook asynchronously with bulletproof service
    setImmediate(async () => {
      try {
        await webhookService.processWebhook(webhookPayload, correlationId);
      } catch (error) {
        EnhancedLogger.criticalAlert('WEBHOOK: Async processing failed completely', {
          correlationId,
          orderId: webhookPayload.orderId,
          error: error.message
        });
      }
    });

  } catch (error) {
    EnhancedLogger.criticalAlert('WEBHOOK: Handler crashed - system error', {
      correlationId,
      error: error.message,
      stack: error.stack,
      body: req.body
    });
    
    // Even on crash, return 200 to prevent provider retries
    if (!res.headersSent) {
      res.status(200).json({ 
        success: true, 
        message: 'Webhook queued for retry processing' 
      });
    }
  }
}

/**
 * Verify PhonePe webhook signature
 */
async function verifyPhonePeSignature(req, correlationId) {
  try {
    const authHeader = req.headers['authorization'];
    const xSignature = req.headers['x-phonepe-signature'];
    const providedSignature = authHeader || xSignature;

    if (!providedSignature) {
      EnhancedLogger.webhookLog('ERROR', 'No webhook signature provided', {
        correlationId,
        availableHeaders: Object.keys(req.headers).filter(h => h.includes('auth') || h.includes('signature'))
      });
      return false;
    }

    const username = process.env.PHONEPE_CALLBACK_USERNAME || '';
    const password = process.env.PHONEPE_CALLBACK_PASSWORD || '';
    
    if (!username || !password) {
      EnhancedLogger.criticalAlert('WEBHOOK: PhonePe credentials not configured', {
        correlationId,
        hasUsername: !!username,
        hasPassword: !!password
      });
      return false;
    }

    const expectedSignature = crypto
      .createHash('sha256')
      .update(`${username}:${password}`)
      .digest('hex');

    const isValid = providedSignature === expectedSignature;
    
    if (isValid) {
      EnhancedLogger.webhookLog('SUCCESS', 'Webhook signature verified', {
        correlationId,
        ip: req.ip
      });
    } else {
      EnhancedLogger.webhookLog('ERROR', 'Invalid webhook signature', {
        correlationId,
        expectedPrefix: expectedSignature.substring(0, 10) + '...',
        receivedPrefix: providedSignature.substring(0, 10) + '...',
        ip: req.ip,
        userAgent: req.headers['user-agent']
      });
    }

    return isValid;
    
  } catch (error) {
    EnhancedLogger.webhookLog('ERROR', 'Signature verification failed', {
      correlationId,
      error: error.message
    });
    return false;
  }
}

/**
 * Parse and validate webhook payload
 */
function parseWebhookPayload(body, correlationId) {
  try {
    const { payload, event } = body;
    
    if (!payload) {
      return { isValid: false, error: 'Missing payload object' };
    }

    if (!event) {
      return { isValid: false, error: 'Missing event type' };
    }

    // Extract transaction/order ID from multiple possible fields
    const orderId = payload.orderId || 
                   payload.merchantTransactionId || 
                   payload.transactionId ||
                   payload.order_id ||
                   payload.txnId;
    
    if (!orderId) {
      return { isValid: false, error: 'Missing order/transaction ID in payload' };
    }

    // Normalize payment state
    const state = (payload.state || 
                  payload.status || 
                  payload.transactionStatus || 
                  payload.payment_status || 
                  '').toString().toUpperCase();

    if (!state) {
      return { isValid: false, error: 'Missing payment state' };
    }

    // Categorize payment states
    const successStates = ['COMPLETED', 'SUCCESS', 'PAID', 'CAPTURED', 'OK', 'SUCCESSFUL'];
    const failureStates = ['FAILED', 'CANCELLED', 'TIMEOUT', 'ERROR', 'REJECTED', 'ABORTED'];
    
    const isSuccess = successStates.includes(state);
    const isFailure = failureStates.includes(state);
    const isPending = !isSuccess && !isFailure; // States like PENDING, PROCESSING

    // Extract amount (convert from paise to rupees if needed)
    let amount = payload.amount || payload.total || 0;
    if (typeof amount === 'string') {
      amount = parseInt(amount) || 0;
    }

    const validatedPayload = {
      isValid: true,
      orderId,
      state,
      amount,
      isSuccess,
      isFailure,
      isPending,
      event,
      fullPayload: payload,
      originalEvent: event,
      processedAt: new Date()
    };

    EnhancedLogger.webhookLog('INFO', 'Webhook payload parsed successfully', {
      correlationId,
      orderId,
      state,
      isSuccess,
      isFailure,
      isPending,
      event
    });

    return validatedPayload;
    
  } catch (error) {
    EnhancedLogger.webhookLog('ERROR', 'Failed to parse webhook payload', {
      correlationId,
      error: error.message,
      rawBody: body
    });
    return { isValid: false, error: error.message };
  }
}

/**
 * Save raw webhook for audit trail and recovery
 */
async function saveRawWebhook(req, correlationId, webhookPayload) {
  try {
    const rawWebhook = await RawWebhook.create({
      provider: 'phonepe',
      correlationId,
      headers: req.headers,
      raw: JSON.stringify(req.body),
      parsedData: {
        orderId: webhookPayload.orderId,
        state: webhookPayload.state,
        isSuccess: webhookPayload.isSuccess,
        isFailure: webhookPayload.isFailure,
        amount: webhookPayload.amount,
        event: webhookPayload.event
      },
      receivedAt: new Date(),
      processed: false,
      ip: req.ip,
      userAgent: req.headers['user-agent']
    });

    EnhancedLogger.webhookLog('SUCCESS', 'Raw webhook saved for audit', {
      correlationId,
      rawWebhookId: rawWebhook._id,
      orderId: webhookPayload.orderId
    });

    return rawWebhook;
    
  } catch (error) {
    EnhancedLogger.criticalAlert('WEBHOOK: Failed to save raw webhook', {
      correlationId,
      error: error.message,
      orderId: webhookPayload.orderId
    });
    throw error;
  }
}

/**
 * Webhook health check endpoint
 */
export async function webhookHealthCheck(req, res) {
  try {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'bulletproof-webhook',
      checks: {
        credentials: !!(process.env.PHONEPE_CALLBACK_USERNAME && process.env.PHONEPE_CALLBACK_PASSWORD),
        database: true, // Will be updated based on MongoDB connection
        processing: true
      }
    };

    // Check recent webhook processing
    const recentWebhooks = await RawWebhook.find({
      receivedAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } // Last 24 hours
    }).limit(10);

    health.stats = {
      webhooksLast24h: recentWebhooks.length,
      processedCount: recentWebhooks.filter(w => w.processed).length,
      failedCount: recentWebhooks.filter(w => w.error).length
    };

    const statusCode = health.checks.credentials ? 200 : 500;
    res.status(statusCode).json(health);
    
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
}

/**
 * Manual webhook retry endpoint (for admin use)
 */
export async function retryFailedWebhooks(req, res) {
  try {
    const { orderId, correlationId, timeframe = 24 } = req.body;
    
    let query = { processed: false };
    
    if (orderId) {
      query['parsedData.orderId'] = orderId;
    }
    
    if (correlationId) {
      query.correlationId = correlationId;
    }
    
    if (timeframe) {
      query.receivedAt = { $gte: new Date(Date.now() - timeframe * 60 * 60 * 1000) };
    }

    const failedWebhooks = await RawWebhook.find(query).limit(50);
    
    const retryResults = [];
    
    for (const webhook of failedWebhooks) {
      try {
        const webhookPayload = parseWebhookPayload(JSON.parse(webhook.raw), webhook.correlationId);
        if (webhookPayload.isValid) {
          const result = await webhookService.processWebhook(webhookPayload, webhook.correlationId);
          retryResults.push({ webhookId: webhook._id, success: true, result });
          
          // Mark as processed
          webhook.processed = true;
          webhook.processedAt = new Date();
          webhook.retryResult = result;
          await webhook.save();
        }
      } catch (error) {
        retryResults.push({ webhookId: webhook._id, success: false, error: error.message });
      }
    }

    EnhancedLogger.webhookLog('INFO', 'Manual webhook retry completed', {
      totalFound: failedWebhooks.length,
      retryResults: retryResults.length,
      successful: retryResults.filter(r => r.success).length
    });

    successResponse(res, {
      message: 'Webhook retry completed',
      processed: retryResults.length,
      successful: retryResults.filter(r => r.success).length,
      results: retryResults
    });
    
  } catch (error) {
    EnhancedLogger.webhookLog('ERROR', 'Manual webhook retry failed', {
      error: error.message
    });
    errorResponse(res, 500, 'Retry operation failed', error.message);
  }
}
