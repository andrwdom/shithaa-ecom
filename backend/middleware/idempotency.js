import mongoose from 'mongoose';
import { log } from '../utils/structuredLogger.js';

// Idempotency key schema
const idempotencyKeySchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true },
  requestHash: { type: String, required: true },
  response: { type: mongoose.Schema.Types.Mixed },
  status: { type: String, enum: ['processing', 'completed', 'failed'], default: 'processing' },
  createdAt: { type: Date, default: Date.now, expires: 3600 }, // TTL: 1 hour
  completedAt: Date,
  error: String
});

const IdempotencyKey = mongoose.models.IdempotencyKey || mongoose.model('IdempotencyKey', idempotencyKeySchema);

/**
 * Generate idempotency key from request
 * 🚨 CRITICAL FIX: Use deterministic key generation for webhooks
 */
export const generateIdempotencyKey = (req) => {
  const crypto = require('crypto');
  
  // For webhook requests, use transaction-specific data for true idempotency
  if (req.url.includes('/webhook') || req.url.includes('/payment')) {
    const { transactionId, orderId, amount, status } = req.body;
    
    if (transactionId && orderId && amount !== undefined && status) {
      // 🚨 CRITICAL FIX: Use deterministic key without timestamps
      // Format: sha256(transactionId|orderId|amount|status) - no timestamps for true idempotency
      const keyData = `${transactionId}|${orderId}|${amount}|${status}`;
      
      return crypto.createHash('sha256')
        .update(keyData)
        .digest('hex');
    }
  }
  
  // For other requests, use the original method
  const keyData = {
    method: req.method,
    url: req.url,
    body: req.body,
    headers: {
      'user-agent': req.headers['user-agent'],
      'content-type': req.headers['content-type']
    }
  };
  
  return crypto.createHash('sha256')
    .update(JSON.stringify(keyData))
    .digest('hex');
};

/**
 * Idempotency middleware for webhook processing
 */
export const webhookIdempotency = async (req, res, next) => {
  try {
    const idempotencyKey = req.headers['idempotency-key'] || generateIdempotencyKey(req);
    const requestHash = crypto.createHash('sha256')
      .update(JSON.stringify(req.body))
      .digest('hex');
    
    // Check if we've already processed this request
    const existingKey = await IdempotencyKey.findOne({ key: idempotencyKey });
    
    if (existingKey) {
      if (existingKey.status === 'completed') {
        log.info('Idempotent webhook request - returning cached response', {
          idempotencyKey: idempotencyKey.substring(0, 10) + '...',
          originalRequestTime: existingKey.createdAt
        });
        
        return res.status(200).json(existingKey.response);
      }
      
      if (existingKey.status === 'processing') {
        log.warn('Duplicate webhook request received while processing', {
          idempotencyKey: idempotencyKey.substring(0, 10) + '...',
          requestTime: existingKey.createdAt
        });
        
        return res.status(409).json({ 
          success: false, 
          message: 'Request already being processed',
          idempotencyKey: idempotencyKey.substring(0, 10) + '...'
        });
      }
      
      if (existingKey.status === 'failed') {
        log.info('Retrying failed webhook request', {
          idempotencyKey: idempotencyKey.substring(0, 10) + '...',
          previousError: existingKey.error
        });
        
        // Update status to processing for retry
        existingKey.status = 'processing';
        existingKey.requestHash = requestHash;
        await existingKey.save();
      }
    } else {
      // Create new idempotency key
      await IdempotencyKey.create({
        key: idempotencyKey,
        requestHash,
        status: 'processing'
      });
      
      log.info('New webhook request - processing', {
        idempotencyKey: idempotencyKey.substring(0, 10) + '...'
      });
    }
    
    // Store idempotency key in request for later use
    req.idempotencyKey = idempotencyKey;
    
    // Override res.json to capture response for idempotency
    const originalJson = res.json;
    res.json = function(data) {
      // Store response for idempotency
      IdempotencyKey.findOneAndUpdate(
        { key: idempotencyKey },
        {
          response: data,
          status: res.statusCode >= 200 && res.statusCode < 300 ? 'completed' : 'failed',
          completedAt: new Date(),
          error: res.statusCode >= 400 ? data.message || 'Unknown error' : null
        }
      ).catch(err => {
        log.error('Failed to update idempotency key', {
          idempotencyKey: idempotencyKey.substring(0, 10) + '...',
          error: err.message
        });
      });
      
      // Call original json method
      return originalJson.call(this, data);
    };
    
    next();
  } catch (error) {
    log.error('Idempotency middleware error', {
      error: error.message,
      stack: error.stack
    });
    
    // Continue processing even if idempotency fails
    next();
  }
};

/**
 * Idempotency middleware for order creation
 */
export const orderIdempotency = async (req, res, next) => {
  try {
    const idempotencyKey = req.headers['idempotency-key'] || generateIdempotencyKey(req);
    
    // Check if order already exists with this idempotency key
    const existingOrder = await mongoose.model('order').findOne({ idempotencyKey });
    
    if (existingOrder) {
      log.info('Idempotent order creation - returning existing order', {
        idempotencyKey: idempotencyKey.substring(0, 10) + '...',
        orderId: existingOrder._id,
        orderStatus: existingOrder.status
      });
      
      return res.status(200).json({
        success: true,
        message: 'Order already exists',
        order: existingOrder,
        idempotent: true
      });
    }
    
    // Store idempotency key in request for order creation
    req.idempotencyKey = idempotencyKey;
    next();
  } catch (error) {
    log.error('Order idempotency middleware error', {
      error: error.message,
      stack: error.stack
    });
    
    // Continue processing even if idempotency fails
    next();
  }
};

export default { webhookIdempotency, orderIdempotency, generateIdempotencyKey };
