import express from 'express';
import RawWebhook from '../models/RawWebhook.js';
import { verifyPhonePeSignature } from '../utils/phonepeSignature.js';
import EnhancedLogger from '../utils/enhancedLogger.js';

const router = express.Router();

// Helper function to verify PhonePe signature from request according to official documentation
function verifyPhonePeRequest(req) {
  try {
    const authorizationHeader = req.headers['authorization'];
    if (!authorizationHeader) {
      return false;
    }
    
    const username = process.env.PHONEPE_WEBHOOK_USERNAME;
    const password = process.env.PHONEPE_WEBHOOK_PASSWORD;
    
    if (!username || !password) {
      EnhancedLogger.warn('PhonePe signature verification missing credentials', { 
        hasUsername: !!username, 
        hasPassword: !!password 
      });
      return false;
    }
    
    return verifyPhonePeSignature(username, password, authorizationHeader);
  } catch (error) {
    EnhancedLogger.error('PhonePe signature verification error', { error: error.message });
    return false;
  }
}

// PhonePe webhook - with proper signature verification
router.post('/webhook/phonepe', express.raw({ type: '*/*', limit: '1mb' }), async (req, res) => {
  try {
    // Verify PhonePe signature before processing
    if (!verifyPhonePeRequest(req)) {
      EnhancedLogger.warn('PhonePe webhook invalid signature', { 
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        hasAuthorization: !!req.headers['authorization']
      });
      return res.status(401).json({ success: false, error: 'Invalid signature' });
    }
    
    const rawStr = req.body && req.body.toString ? req.body.toString() : JSON.stringify(req.body || {});
    
    // Save raw webhook immediately
    await RawWebhook.create({
      provider: 'phonepe',
      headers: req.headers,
      raw: rawStr,
      receivedAt: new Date()
    });
    
    EnhancedLogger.info('PhonePe raw webhook saved successfully', { 
      ip: req.ip,
      payloadSize: rawStr.length 
    });
    
    // Fast ACK so gateway stops retries
    res.status(200).json({ success: true });
  } catch (err) {
    EnhancedLogger.error('PhonePe raw webhook save failed', { 
      error: err.message,
      ip: req.ip 
    });
    // If raw save fails, return 500 so provider retries
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Note: Razorpay removed - not used in this codebase

// Generic webhook endpoint for any provider - WITH PROPER SIGNATURE VERIFICATION
router.post('/webhook/:provider', express.raw({ type: '*/*', limit: '1mb' }), async (req, res) => {
  try {
    const { provider } = req.params;
    const providerLower = provider.toLowerCase();
    
    // SECURITY: Only allow PhonePe provider
    if (providerLower !== 'phonepe') {
      EnhancedLogger.warn('Rejected webhook from unknown provider', { 
        provider,
        ip: req.ip 
      });
      return res.status(400).json({ error: 'Unknown webhook provider' });
    }
    
    // SECURITY: Perform proper PhonePe signature verification
    const signatureValid = verifyPhonePeRequest(req);
    if (!signatureValid) {
      EnhancedLogger.warn('PhonePe webhook signature verification failed', { 
        ip: req.ip,
        hasAuthorization: !!req.headers['authorization']
      });
      return res.status(401).json({ error: 'Invalid PhonePe signature' });
    }
    
    const rawStr = req.body && req.body.toString ? req.body.toString() : JSON.stringify(req.body || {});
    
    // Save raw webhook immediately
    await RawWebhook.create({
      provider: providerLower,
      headers: req.headers,
      raw: rawStr,
      receivedAt: new Date()
    });
    
    EnhancedLogger.info(`Raw ${providerLower} webhook saved successfully`, { 
      ip: req.ip,
      payloadSize: rawStr.length 
    });
    
    // Fast ACK so gateway stops retries
    res.status(200).json({ success: true });
  } catch (err) {
    EnhancedLogger.error('Raw webhook save failed', { 
      error: err.message,
      provider: req.params.provider,
      ip: req.ip 
    });
    // If raw save fails, return 500 so provider retries
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

export default router;