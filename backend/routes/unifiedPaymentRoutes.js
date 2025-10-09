/**
 * UNIFIED PAYMENT ROUTES
 * 
 * This replaces all payment routes with a single, bulletproof system.
 */

import express from 'express';
import { 
  unifiedPhonePeCallback,
  unifiedPhonePeWebhook,
  unifiedPaymentVerification,
  paymentHealthCheck
} from '../controllers/unifiedPaymentController.js';
import { verifyToken, optionalAuth } from '../middleware/auth.js';

const router = express.Router();

// UNIFIED PHONE PEAK ROUTES
// These replace all existing payment routes

// 1. Unified callback (replaces phonePeCallback)
router.post('/phonepe/callback', unifiedPhonePeCallback);

// 2. Unified webhook (replaces all webhook handlers)
router.post('/phonepe/webhook', unifiedPhonePeWebhook);

// 3. Unified verification (replaces verifyPhonePePayment)
router.get('/phonepe/verify/:merchantTransactionId', optionalAuth, unifiedPaymentVerification);

// 4. Health check
router.get('/health', paymentHealthCheck);

// LEGACY ROUTES (for backward compatibility)
// These will be deprecated once the unified system is proven

// Legacy callback (will be removed)
router.post('/phonepe/legacy-callback', unifiedPhonePeCallback);

// Legacy webhook (will be removed)
router.post('/phonepe/legacy-webhook', unifiedPhonePeWebhook);

// Legacy verification (will be removed)
router.get('/phonepe/legacy-verify/:merchantTransactionId', optionalAuth, unifiedPaymentVerification);

export default router;
