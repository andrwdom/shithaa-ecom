/**
 * ATOMIC PAYMENT ROUTES
 * Routes for the new atomic payment system
 */

import express from 'express';
import {
  createAtomicPaymentSession,
  handleAtomicPaymentCallback,
  verifyAtomicPayment,
  cancelAtomicOrder,
  getAtomicPaymentHealth
} from '../controllers/atomicPaymentController.js';
import { metricsMiddleware } from '../utils/monitoringSystem.js';

const router = express.Router();

// Apply metrics middleware to all routes
router.use(metricsMiddleware);

// Create payment session (replaces complex checkout flow)
router.post('/create-session', createAtomicPaymentSession);

// PhonePe callback handler (atomic stock deduction)
router.post('/phonepe/callback', handleAtomicPaymentCallback);

// Verify payment status
router.get('/verify/:transactionId', verifyAtomicPayment);

// Cancel order (before payment)
router.post('/cancel/:orderId', cancelAtomicOrder);

// Health check endpoint
router.get('/health', getAtomicPaymentHealth);

export default router;
