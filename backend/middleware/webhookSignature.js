import crypto from 'crypto';
import { log } from '../utils/structuredLogger.js';

/**
 * PhonePe webhook signature verification
 * PhonePe sends webhook signature in Authorization header as SHA256(username:password)
 */
export const verifyPhonePeSignature = (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const username = process.env.PHONEPE_CALLBACK_USERNAME || '';
    const password = process.env.PHONEPE_CALLBACK_PASSWORD || '';
    
    if (!username || !password) {
      log.security('warn', 'PhonePe webhook credentials not configured', {
        hasUsername: !!username,
        hasPassword: !!password
      });
      return res.status(401).json({ success: false, message: 'Webhook credentials not configured' });
    }
    
    const expected = crypto.createHash('sha256').update(`${username}:${password}`).digest('hex');
    
    if (authHeader !== expected) {
      log.security('error', 'Invalid PhonePe webhook signature', {
        expected: expected.substring(0, 10) + '...',
        received: authHeader ? authHeader.substring(0, 10) + '...' : 'null',
        ip: req.ip,
        userAgent: req.headers['user-agent']
      });
      return res.status(401).json({ success: false, message: 'Invalid webhook signature' });
    }
    
    log.security('info', 'PhonePe webhook signature verified', {
      ip: req.ip,
      userAgent: req.headers['user-agent']
    });
    
    next();
  } catch (error) {
    log.security('error', 'PhonePe signature verification failed', {
      error: error.message,
      ip: req.ip
    });
    return res.status(500).json({ success: false, message: 'Signature verification failed' });
  }
};

/**
 * Razorpay webhook signature verification
 * Razorpay sends webhook signature in X-Razorpay-Signature header
 */
export const verifyRazorpaySignature = (req, res, next) => {
  try {
    const signature = req.headers['x-razorpay-signature'];
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || '';
    
    if (!webhookSecret) {
      log.security('warn', 'Razorpay webhook secret not configured');
      return res.status(401).json({ success: false, message: 'Webhook secret not configured' });
    }
    
    if (!signature) {
      log.security('error', 'Missing Razorpay webhook signature', {
        ip: req.ip,
        userAgent: req.headers['user-agent']
      });
      return res.status(401).json({ success: false, message: 'Missing webhook signature' });
    }
    
    // Get raw body for signature verification
    const rawBody = req.body;
    if (!rawBody) {
      log.security('error', 'Missing raw body for Razorpay signature verification');
      return res.status(400).json({ success: false, message: 'Missing request body' });
    }
    
    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(rawBody)
      .digest('hex');
    
    if (signature !== expectedSignature) {
      log.security('error', 'Invalid Razorpay webhook signature', {
        expected: expectedSignature.substring(0, 10) + '...',
        received: signature.substring(0, 10) + '...',
        ip: req.ip,
        userAgent: req.headers['user-agent']
      });
      return res.status(401).json({ success: false, message: 'Invalid webhook signature' });
    }
    
    log.security('info', 'Razorpay webhook signature verified', {
      ip: req.ip,
      userAgent: req.headers['user-agent']
    });
    
    next();
  } catch (error) {
    log.security('error', 'Razorpay signature verification failed', {
      error: error.message,
      ip: req.ip
    });
    return res.status(500).json({ success: false, message: 'Signature verification failed' });
  }
};

/**
 * Generic webhook signature verification
 * Supports multiple providers based on headers
 */
export const verifyWebhookSignature = (req, res, next) => {
  const provider = req.params?.provider || req.headers['x-webhook-provider'] || 'unknown';
  
  switch (provider.toLowerCase()) {
    case 'phonepe':
      return verifyPhonePeSignature(req, res, next);
    case 'razorpay':
      return verifyRazorpaySignature(req, res, next);
    default:
      log.security('warn', 'Unknown webhook provider', { provider });
      return res.status(400).json({ success: false, message: 'Unknown webhook provider' });
  }
};
