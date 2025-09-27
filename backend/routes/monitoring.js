import express from 'express';
import {
  getSystemHealth,
  getPaymentFlowStatus,
  getMissingOrders,
  getSystemMetrics,
  getRecentActivity
} from '../controllers/monitoringController.js';

const router = express.Router();

// System health endpoint
router.get('/health', getSystemHealth);

// Payment flow status
router.get('/payment-flow', getPaymentFlowStatus);

// Missing orders
router.get('/missing-orders', getMissingOrders);

// System metrics
router.get('/metrics', getSystemMetrics);

// Recent activity
router.get('/recent-activity', getRecentActivity);

export default router;
