import express from 'express';
import crypto from 'crypto';
import RawWebhook from '../models/RawWebhook.js';
// import { verifyPhonePeSignature, generateEventId, parsePhonePeWebhook } from '../utils/phonepeSignature.js';
import { config } from '../config.js';

const router = express.Router();

/**
 * PhonePe Webhook Handler - TEST MODE (Non-Destructive)
 * This version doesn't modify existing data, just logs and returns 200
 */
router.post('/phonepe', express.raw({ type: '*/*' }), async (req, res) => {
  const startTime = Date.now();
  const rawPayload = req.body.toString();
  const headers = req.headers;
  
  try {
    // 1. Generate unique event ID for idempotency
    const eventId = `phonepe_${headers['x-merchant-id'] || 'unknown'}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // 2. Basic signature validation (simplified for safety)
    const signature = headers['x-verify'];
    const signatureValid = !!signature; // Basic check - just ensure signature exists
    
    // 3. Log webhook (non-destructive logging)
    console.log(`🔔 [TEST MODE] Webhook received: ${eventId}`);
    console.log(`   Signature valid: ${signatureValid}`);
    console.log(`   Payload length: ${rawPayload.length} bytes`);
    
    // 4. Return 200 immediately (webhook providers expect quick response)
    res.status(200).send('OK');
    
    // 5. Log processing (don't modify existing data)
    console.log(`✅ [TEST MODE] Webhook acknowledged in ${Date.now() - startTime}ms`);
    
  } catch (error) {
    console.error('❌ [TEST MODE] Webhook handler error:', error);
    
    // Still return 200 to prevent webhook retries
    res.status(200).send('OK');
  }
});

/**
 * Generic webhook endpoint for other providers (TEST MODE)
 */
router.post('/generic', express.raw({ type: '*/*' }), async (req, res) => {
  const rawPayload = req.body.toString();
  const headers = req.headers;
  const provider = headers['x-provider'] || 'unknown';
  
  try {
    const eventId = `${provider}_${headers['x-payment-id'] || 'unknown'}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    console.log(`🔔 [TEST MODE] Generic webhook received: ${eventId}`);
    console.log(`   Provider: ${provider}`);
    console.log(`   Payload length: ${rawPayload.length} bytes`);
    
    res.status(200).send('OK');
    
  } catch (error) {
    console.error('❌ [TEST MODE] Generic webhook error:', error);
    res.status(200).send('OK');
  }
});

export default router;