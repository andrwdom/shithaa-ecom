/**
 * MONITORING & HEALTH CHECK ROUTES
 */

import express from 'express';
import { circuitBreakerManager } from '../utils/circuitBreaker.js';
import { 
  businessMetrics, 
  criticalOperationMonitor, 
  healthCheckSystem 
} from '../utils/monitoringSystem.js';
import { atomicStockManager } from '../utils/atomicStockManager.js';
import { asyncHandler, createSuccessResponse } from '../utils/errorHandler.js';

const router = express.Router();

/**
 * System health check endpoint
 */
router.get('/health', asyncHandler(async (req, res) => {
  const healthReport = await healthCheckSystem.runHealthChecks();
  
  const statusCode = healthReport.status === 'unhealthy' ? 503 : 
                    healthReport.status === 'degraded' ? 200 : 200;
  
  res.status(statusCode).json(createSuccessResponse(healthReport, 'Health check completed'));
}));

/**
 * Circuit breaker status
 */
router.get('/circuit-breakers', asyncHandler(async (req, res) => {
  const statuses = circuitBreakerManager.getAllStatuses();
  const unhealthy = circuitBreakerManager.getUnhealthyBreakers();
  
  res.json(createSuccessResponse({
    circuitBreakers: statuses,
    summary: {
      total: Object.keys(statuses).length,
      healthy: Object.keys(statuses).length - unhealthy.length,
      unhealthy: unhealthy.length
    },
    unhealthyBreakers: unhealthy
  }, 'Circuit breaker status'));
}));

/**
 * Reset circuit breakers (admin endpoint)
 */
router.post('/circuit-breakers/reset', asyncHandler(async (req, res) => {
  const { breakerName } = req.body;
  
  if (breakerName) {
    const breaker = circuitBreakerManager.getCircuitBreaker(breakerName);
    breaker.reset();
    res.json(createSuccessResponse({ breakerName }, `Circuit breaker ${breakerName} reset`));
  } else {
    circuitBreakerManager.resetAll();
    res.json(createSuccessResponse({}, 'All circuit breakers reset'));
  }
}));

/**
 * Business metrics
 */
router.get('/metrics', asyncHandler(async (req, res) => {
  const metrics = businessMetrics.getMetrics();
  
  res.json(createSuccessResponse({
    metrics,
    timestamp: new Date(),
    totalMetrics: Object.keys(metrics).length
  }, 'Business metrics retrieved'));
}));

/**
 * Active alerts
 */
router.get('/alerts', asyncHandler(async (req, res) => {
  const alerts = criticalOperationMonitor.getActiveAlerts();
  
  res.json(createSuccessResponse({
    alerts,
    count: alerts.length,
    hasCritical: alerts.some(a => a.severity === 'critical')
  }, 'Active alerts retrieved'));
}));

/**
 * Stock health report
 */
router.get('/stock-health', asyncHandler(async (req, res) => {
  const report = await atomicStockManager.getStockHealthReport();
  res.json(createSuccessResponse(report, 'Stock health report generated'));
}));

/**
 * Manual stock monitoring trigger (for testing)
 */
router.post('/monitor/stock', asyncHandler(async (req, res) => {
  const report = await criticalOperationMonitor.monitorStockLevels();
  res.json(createSuccessResponse(report, 'Stock monitoring completed'));
}));

/**
 * System overview
 */
router.get('/overview', asyncHandler(async (req, res) => {
  const [healthReport, circuitBreakers, metrics, alerts, stockHealth] = await Promise.all([
    healthCheckSystem.runHealthChecks(),
    Promise.resolve(circuitBreakerManager.getAllStatuses()),
    Promise.resolve(businessMetrics.getMetrics()),
    Promise.resolve(criticalOperationMonitor.getActiveAlerts()),
    atomicStockManager.getStockHealthReport()
  ]);

  const overview = {
    systemHealth: {
      status: healthReport.status,
      summary: healthReport.summary
    },
    circuitBreakers: {
      total: Object.keys(circuitBreakers).length,
      unhealthy: Object.values(circuitBreakers).filter(b => b.state !== 'CLOSED').length
    },
    alerts: {
      total: alerts.length,
      critical: alerts.filter(a => a.severity === 'critical').length
    },
    stock: {
      healthScore: stockHealth.summary.healthScore,
      lowStockCount: stockHealth.summary.lowStockCount,
      outOfStockCount: stockHealth.summary.outOfStockCount
    },
    metrics: {
      totalMetrics: Object.keys(metrics).length,
      timestamp: new Date()
    }
  };

  res.json(createSuccessResponse(overview, 'System overview'));
}));

export default router;
