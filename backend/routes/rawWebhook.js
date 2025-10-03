import express from 'express';
import RawWebhook from '../models/RawWebhook.js';

const router = express.Router();

// Note: PhonePe webhook is now handled at /api/payment/phonepe/webhook
// This matches the PhonePe dashboard configuration

// Razorpay webhook - receives raw body and saves immediately
router.post('/webhook/razorpay', express.raw({ type: '*/*', limit: '1mb' }), async (req, res) => {
  try {
    const rawStr = req.body && req.body.toString ? req.body.toString() : JSON.stringify(req.body || {});
    
    // Save raw webhook immediately
    await RawWebhook.create({
      provider: 'razorpay',
      headers: req.headers,
      raw: rawStr,
      receivedAt: new Date()
    });
    
    console.log('✅ Raw Razorpay webhook saved successfully');
    
    // Fast ACK so gateway stops retries
    res.status(200).send('ok');
  } catch (err) {
    console.error('❌ RAW WEBHOOK SAVE FAILED', err);
    // If raw save fails, return 500 so provider retries
    res.status(500).send('error');
  }
});

// Generic webhook endpoint for any provider - SECURITY RESTRICTED
router.post('/webhook/:provider', express.raw({ type: '*/*', limit: '1mb' }), async (req, res) => {
  try {
    const { provider } = req.params;
    
    // SECURITY: Only allow known providers
    const allowedProviders = ['phonepe', 'razorpay'];
    if (!allowedProviders.includes(provider.toLowerCase())) {
      console.log(`❌ Rejected webhook from unknown provider: ${provider}`);
      return res.status(400).json({ error: 'Unknown webhook provider' });
    }
    
    // SECURITY: Basic signature check for known providers
    if (provider.toLowerCase() === 'phonepe' && !req.headers['x-verify']) {
      console.log(`❌ PhonePe webhook missing X-VERIFY header`);
      return res.status(401).json({ error: 'Missing signature header' });
    }
    
    if (provider.toLowerCase() === 'razorpay' && !req.headers['x-razorpay-signature']) {
      console.log(`❌ Razorpay webhook missing signature header`);
      return res.status(401).json({ error: 'Missing signature header' });
    }
    
    const rawStr = req.body && req.body.toString ? req.body.toString() : JSON.stringify(req.body || {});
    
    // Save raw webhook immediately
    await RawWebhook.create({
      provider: provider,
      headers: req.headers,
      raw: rawStr,
      receivedAt: new Date()
    });
    
    console.log(`✅ Raw ${provider} webhook saved successfully`);
    
    // Fast ACK so gateway stops retries
    res.status(200).send('ok');
  } catch (err) {
    console.error('❌ RAW WEBHOOK SAVE FAILED', err);
    // If raw save fails, return 500 so provider retries
    res.status(500).send('error');
  }
});

export default router;