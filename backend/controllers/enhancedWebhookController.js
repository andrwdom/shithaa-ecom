import webhookServiceManager from '../services/webhookServiceManager.js';
import RawWebhook from '../models/RawWebhook.js';
import WebhookEvent from '../models/WebhookEvent.js';
import { successResponse, errorResponse } from '../utils/response.js';
import crypto from 'crypto';
import EnhancedLogger from '../utils/enhancedLogger.js';
import { withWebhookLock, withIdempotencyLock, isRedisHealthy } from '../utils/locks.js';

// Initialize webhook services (singleton pattern)
let webhookServices = null;

// Lazy initialization to prevent startup issues
async function getWebhookServices() {
  if (!webhookServices) {
    webhookServices = await webhookServiceManager.initialize();
  }
  return webhookServices;
}

/**
 * Enhanced PhonePe webhook handler with idempotency and bulletproof processing
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

    // IDEMPOTENCY CHECK - Critical for preventing duplicate processing
    // Use transactionId + orderId + amount + state for true idempotency
    const transactionId = webhookPayload.fullPayload?.transactionId || webhookPayload.fullPayload?.merchantTransactionId;
    const orderId = webhookPayload.orderId;
    const amount = webhookPayload.amount;
    const state = webhookPayload.state;
    
    if (!transactionId || !orderId) {
      EnhancedLogger.webhookLog('ERROR', 'Missing transactionId or orderId for idempotency check', {
        correlationId,
        transactionId: !!transactionId,
        orderId: !!orderId,
        payload: webhookPayload
      });
      return;
    }

    // Generate idempotent event ID based on transaction data (no timestamps)
    // Format: sha256(transactionId + '|' + orderId + '|' + amount + '|' + state)
    const eventId = crypto.createHash('sha256')
      .update(`${transactionId}|${orderId}|${amount}|${state}`)
      .digest('hex');

    // Atomic upsert for idempotency - returns existing if already processed
    const webhookEvent = await WebhookEvent.findOneAndUpdate(
      { eventId },
      { 
        $setOnInsert: { 
          payload: req.body, 
          status: 'processing', 
          receivedAt: new Date(),
          source: 'phonepe',
          ip: req.ip,
          userAgent: req.headers['user-agent']
        }
      },
      { upsert: true, new: true }
    );

    // If already processed, skip processing
    if (webhookEvent.status === 'processed') {
      EnhancedLogger.webhookLog('INFO', 'Webhook already processed - skipping duplicate', {
        correlationId,
        eventId,
        processedAt: webhookEvent.processedAt
      });
      return;
    }

    // If currently processing, skip to prevent race conditions
    if (webhookEvent.status === 'processing' && webhookEvent.receivedAt < new Date(Date.now() - 10000)) {
      // If processing for more than 10 seconds, mark as failed and retry
      await WebhookEvent.markAsFailed(eventId, 'Processing timeout');
      EnhancedLogger.webhookLog('WARN', 'Webhook processing timeout - marking as failed for retry', {
        correlationId,
        eventId
      });
    } else if (webhookEvent.status === 'processing') {
      EnhancedLogger.webhookLog('INFO', 'Webhook currently processing - skipping duplicate', {
        correlationId,
        eventId
      });
      return;
    }

    // Save raw webhook for audit trail
    await saveRawWebhook(req, correlationId, webhookPayload);

    // Process webhook with bulletproof system and distributed locking
    setImmediate(async () => {
      try {
        // Check Redis health before processing
        const redisHealthy = await isRedisHealthy();
        if (!redisHealthy) {
          EnhancedLogger.webhookLog('WARN', 'Redis not available - processing without distributed lock', {
            correlationId,
            eventId
          });
        }

        // Use distributed lock for critical webhook processing
        const processWithLock = async () => {
          // Get webhook services (lazy initialization)
          const services = await getWebhookServices();
          
          // Create webhook data for bulletproof processing
          const webhookData = {
            orderId: webhookPayload.orderId,
            amount: webhookPayload.amount,
            state: webhookPayload.state,
            isSuccess: webhookPayload.isSuccess,
            isFailure: webhookPayload.isFailure,
            fullPayload: webhookPayload.fullPayload,
            timestamp: Date.now()
          };
          
          // Process webhook with bulletproof processor
          const result = await services.processor.processWebhook(webhookData, correlationId);
          
          // Mark webhook as processed
          await WebhookEvent.markAsProcessed(eventId);
          
          EnhancedLogger.webhookLog('SUCCESS', 'Webhook processed successfully', {
            correlationId,
            eventId,
            orderId: webhookPayload.orderId,
            action: result.action,
            orderId: result.orderId
          });
          
          return result;
        };

        // Process with distributed lock if Redis is available
        const result = redisHealthy 
          ? await withWebhookLock(transactionId, processWithLock, { ttl: 15000 })
          : await processWithLock();
        
      } catch (error) {
        // Mark webhook as failed
        await WebhookEvent.markAsFailed(eventId, error.message);
        
        // If processing fails, enqueue for retry
        try {
          const services = await getWebhookServices();
          
          const webhookData = {
            orderId: webhookPayload.orderId,
            amount: webhookPayload.amount,
            state: webhookPayload.state,
            isSuccess: webhookPayload.isSuccess,
            isFailure: webhookPayload.isFailure,
            fullPayload: webhookPayload.fullPayload,
            timestamp: Date.now()
          };
          
          await services.queueManager.enqueueWebhook(webhookData, correlationId, 'high');
          
          EnhancedLogger.webhookLog('INFO', 'Webhook enqueued for retry processing', {
            correlationId,
            eventId,
            orderId: webhookPayload.orderId,
            error: error.message
          });
        } catch (queueError) {
          EnhancedLogger.criticalAlert('WEBHOOK: Both processing and queuing failed', {
            correlationId,
            eventId,
            orderId: webhookPayload.orderId,
            processingError: error.message,
            queueError: queueError.message
          });
        }
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
 * Verify PhonePe webhook signature according to official documentation
 * PhonePe uses Authorization header with SHA256(username:password)
 */
async function verifyPhonePeSignature(req, correlationId) {
  try {
    const xVerifyHeader = req.headers['x-verify'];
    const xVerifyIndexHeader = req.headers['x-verify-index'];
    
    if (!xVerifyHeader || !xVerifyIndexHeader) {
      EnhancedLogger.webhookLog('ERROR', 'Missing X-VERIFY or X-VERIFY-INDEX headers', {
        correlationId,
        hasXVerify: !!xVerifyHeader,
        hasXVerifyIndex: !!xVerifyIndexHeader,
        availableHeaders: Object.keys(req.headers).filter(h => h.toLowerCase().includes('verify'))
      });
      return false;
    }

    const saltIndex = parseInt(xVerifyIndexHeader);
    const salt = process.env[`PHONEPE_SALT_${saltIndex}`];
    
    if (!salt) {
      EnhancedLogger.criticalAlert('WEBHOOK: PhonePe salt not configured for index', {
        correlationId,
        saltIndex,
        availableSalts: Object.keys(process.env).filter(k => k.startsWith('PHONEPE_SALT_'))
      });
      return false;
    }

    // PhonePe signature: HMAC-SHA256(payload + /pg/v1/pay + saltIndex) + '###' + saltIndex
    const payload = typeof req.body === 'string' ? req.body : JSON.stringify(req.body || {});
    const message = payload + '/pg/v1/pay' + saltIndex;
    const expectedSignature = crypto
      .createHmac('sha256', salt)
      .update(message)
      .digest('hex') + '###' + saltIndex;

    // Use timing-safe comparison to prevent timing attacks
    const isValid = crypto.timingSafeEqual(
      Buffer.from(xVerifyHeader, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    );
    
    if (isValid) {
      EnhancedLogger.webhookLog('SUCCESS', 'PhonePe webhook signature verified', {
        correlationId,
        ip: req.ip,
        payloadLength: payload.length,
        saltIndex
      });
    } else {
      EnhancedLogger.webhookLog('ERROR', 'Invalid PhonePe webhook signature', {
        correlationId,
        ip: req.ip,
        userAgent: req.headers['user-agent'],
        expectedSignature: expectedSignature.substring(0, 20) + '...',
        receivedSignature: xVerifyHeader.substring(0, 20) + '...'
      });
    }

    return isValid;
    
  } catch (error) {
    EnhancedLogger.webhookLog('ERROR', 'PhonePe signature verification failed', {
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
          // Get webhook services and process with bulletproof processor
          const services = await getWebhookServices();
          const result = await services.processor.processWebhook(webhookPayload, webhook.correlationId);
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

/**
 * Webhook idempotency management endpoints
 */
export async function getWebhookEvents(req, res) {
  try {
    const { status, limit = 50, offset = 0 } = req.query;
    
    let query = {};
    if (status) {
      query.status = status;
    }
    
    const events = await WebhookEvent.find(query)
      .sort({ receivedAt: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(offset));
    
    const total = await WebhookEvent.countDocuments(query);
    
    successResponse(res, {
      events,
      total,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
    
  } catch (error) {
    EnhancedLogger.webhookLog('ERROR', 'Failed to get webhook events', {
      error: error.message
    });
    errorResponse(res, 500, 'Failed to get webhook events', error.message);
  }
}

/**
 * Get webhook event by ID
 */
export async function getWebhookEventById(req, res) {
  try {
    const { eventId } = req.params;
    
    const event = await WebhookEvent.findByEventId(eventId);
    if (!event) {
      return errorResponse(res, 404, 'Webhook event not found');
    }
    
    successResponse(res, { event });
    
  } catch (error) {
    EnhancedLogger.webhookLog('ERROR', 'Failed to get webhook event', {
      eventId: req.params.eventId,
      error: error.message
    });
    errorResponse(res, 500, 'Failed to get webhook event', error.message);
  }
}

/**
 * Retry failed webhook events
 */
export async function retryFailedWebhookEvents(req, res) {
  try {
    const { hoursAgo = 24 } = req.body;
    
    const failedEvents = await WebhookEvent.getFailedWebhooks(parseInt(hoursAgo));
    
    const retryResults = [];
    
    for (const event of failedEvents) {
      try {
        if (event.canRetry()) {
          // Reset status to processing for retry
          event.status = 'processing';
          event.errorMessage = null;
          await event.save();
          
          // Parse and process the webhook
          const webhookPayload = parseWebhookPayload(event.payload, event.eventId);
          if (webhookPayload.isValid) {
            const services = await getWebhookServices();
            const result = await services.processor.processWebhook(webhookPayload, event.eventId);
            
            await WebhookEvent.markAsProcessed(event.eventId);
            retryResults.push({ eventId: event.eventId, success: true, result });
          }
        } else {
          retryResults.push({ 
            eventId: event.eventId, 
            success: false, 
            error: 'Max retries exceeded' 
          });
        }
      } catch (error) {
        await WebhookEvent.markAsFailed(event.eventId, error.message);
        retryResults.push({ 
          eventId: event.eventId, 
          success: false, 
          error: error.message 
        });
      }
    }

    EnhancedLogger.webhookLog('INFO', 'Webhook event retry completed', {
      totalFound: failedEvents.length,
      retryResults: retryResults.length,
      successful: retryResults.filter(r => r.success).length
    });

    successResponse(res, {
      message: 'Webhook event retry completed',
      processed: retryResults.length,
      successful: retryResults.filter(r => r.success).length,
      results: retryResults
    });
    
  } catch (error) {
    EnhancedLogger.webhookLog('ERROR', 'Webhook event retry failed', {
      error: error.message
    });
    errorResponse(res, 500, 'Retry operation failed', error.message);
  }
}

/**
 * Cleanup old webhook events
 */
export async function cleanupWebhookEvents(req, res) {
  try {
    const { daysOld = 30 } = req.body;
    
    const result = await WebhookEvent.cleanupOldEvents(parseInt(daysOld));
    
    EnhancedLogger.webhookLog('INFO', 'Webhook events cleanup completed', {
      deletedCount: result.deletedCount,
      daysOld: parseInt(daysOld)
    });

    successResponse(res, {
      message: 'Webhook events cleanup completed',
      deletedCount: result.deletedCount,
      daysOld: parseInt(daysOld)
    });
    
  } catch (error) {
    EnhancedLogger.webhookLog('ERROR', 'Webhook events cleanup failed', {
      error: error.message
    });
    errorResponse(res, 500, 'Cleanup operation failed', error.message);
  }
}
