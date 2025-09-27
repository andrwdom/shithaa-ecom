import express from 'express';
import RawWebhook from '../models/RawWebhook.js';

const router = express.Router();

// Receives raw body — make sure this is mounted BEFORE any body parser that consumes the raw body
router.post('/webhook/phonepe', express.raw({ type: '*/*', limit: '1mb' }), async (req, res) => {
  try {
    const rawStr = req.body && req.body.toString ? req.body.toString() : JSON.stringify(req.body || {});
    await RawWebhook.create({
      provider: 'phonepe',
      headers: req.headers,
      raw: rawStr,
      receivedAt: new Date()
    });
    // Fast ACK so gateway stops retries
    res.status(200).send('ok');
  } catch (err) {
    console.error('RAW WEBHOOK SAVE FAILED', err);
    // If raw save fails, return 500 so provider retries — but only if unavoidable.
    res.status(500).send('error');
  }
});

export default router;
