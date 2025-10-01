/**
 * PRODUCTION-GRADE MONITORING SYSTEM
 * 
 * Provides comprehensive monitoring, alerting, and health checks
 * for critical business operations
 */

import * as Sentry from '@sentry/node';
import { circuitBreakerManager } from './circuitBreaker.js';
import { globalErrorHandler } from './errorHandler.js';
import { atomicStockManager } from './atomicStockManager.js';

/**
 * Business Metrics Collector
 */
export class BusinessMetrics {
  constructor() {
    this.metrics = new Map();
    this.resetInterval = 60000; // Reset every minute
    this.setupPeriodicReset();
  }

  /**
   * Record a metric
   */
  record(metricName, value = 1, tags = {}) {
    const key = this.createMetricKey(metricName, tags);
    const existing = this.metrics.get(key) || { count: 0, sum: 0, min: Infinity, max: -Infinity, tags, name: metricName };
    
    existing.count += 1;
    existing.sum += value;
    existing.min = Math.min(existing.min, value);
    existing.max = Math.max(existing.max, value);
    existing.lastRecorded = new Date();
    
    this.metrics.set(key, existing);
  }

  /**
   * Increment a counter
   */
  increment(metricName, tags = {}) {
    this.record(metricName, 1, tags);
  }

  /**
   * Record timing metric
   */
  timing(metricName, startTime, tags = {}) {
    const duration = Date.now() - startTime;
    this.record(metricName, duration, { ...tags, unit: 'ms' });
    return duration;
  }

  /**
   * Get all metrics
   */
  getMetrics() {
    const result = {};
    for (const [key, metric] of this.metrics) {
      result[key] = {
        ...metric,
        average: metric.count > 0 ? metric.sum / metric.count : 0
      };
    }
    return result;
  }

  createMetricKey(name, tags) {
    const tagString = Object.entries(tags)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}:${v}`)
      .join(',');
    return tagString ? `${name}|${tagString}` : name;
  }

  setupPeriodicReset() {
    setInterval(() => {
      // Keep metrics for 5 minutes, then reset
      const cutoff = new Date(Date.now() - 5 * 60 * 1000);
      for (const [key, metric] of this.metrics) {
        if (metric.lastRecorded < cutoff) {
          this.metrics.delete(key);
        }
      }
    }, this.resetInterval);
  }
}

/**
 * Critical Operation Monitor
 */
export class CriticalOperationMonitor {
  constructor() {
    this.thresholds = {
      stockDepletion: { warning: 10, critical: 5 },
      orderFailureRate: { warning: 0.05, critical: 0.1 }, // 5% warning, 10% critical
      paymentFailureRate: { warning: 0.03, critical: 0.07 }, // 3% warning, 7% critical
      responseTime: { warning: 5000, critical: 10000 }, // 5s warning, 10s critical
      errorRate: { warning: 0.02, critical: 0.05 } // 2% warning, 5% critical
    };
    
    this.alerts = new Map();
    this.suppressionTime = 5 * 60 * 1000; // 5 minutes suppression
  }

  /**
   * Monitor stock levels
   */
  async monitorStockLevels() {
    try {
      const stockReport = await atomicStockManager.getStockHealthReport();
      const { summary, issues } = stockReport;

      // Check critical stock levels
      if (issues.outOfStockProducts.length > 0) {
        this.triggerAlert('critical', 'STOCK_OUT_OF_STOCK', {
          count: issues.outOfStockProducts.length,
          products: issues.outOfStockProducts.slice(0, 5), // First 5 products
          totalProducts: summary.totalProducts
        });
      }

      // Check low stock levels
      if (issues.lowStockProducts.length > this.thresholds.stockDepletion.critical) {
        this.triggerAlert('critical', 'STOCK_CRITICALLY_LOW', {
          count: issues.lowStockProducts.length,
          threshold: this.thresholds.stockDepletion.critical,
          products: issues.lowStockProducts.slice(0, 10)
        });
      } else if (issues.lowStockProducts.length > this.thresholds.stockDepletion.warning) {
        this.triggerAlert('warning', 'STOCK_LOW', {
          count: issues.lowStockProducts.length,
          threshold: this.thresholds.stockDepletion.warning,
          products: issues.lowStockProducts.slice(0, 5)
        });
      }

      return stockReport;

    } catch (error) {
      this.triggerAlert('critical', 'STOCK_MONITORING_FAILED', {
        error: error.message
      });
    }
  }

  /**
   * Monitor circuit breaker health
   */
  monitorCircuitBreakers() {
    const breakers = circuitBreakerManager.getAllStatuses();
    const unhealthy = Object.values(breakers).filter(b => b.state !== 'CLOSED' || b.healthScore < 80);

    if (unhealthy.length > 0) {
      const severity = unhealthy.some(b => b.state === 'OPEN') ? 'critical' : 'warning';
      this.triggerAlert(severity, 'CIRCUIT_BREAKER_UNHEALTHY', {
        unhealthyCount: unhealthy.length,
        totalCount: Object.keys(breakers).length,
        unhealthyBreakers: unhealthy.map(b => ({
          name: b.name,
          state: b.state,
          healthScore: b.healthScore,
          failureCount: b.failureCount
        }))
      });
    }

    return breakers;
  }

  /**
   * Monitor system performance metrics
   */
  monitorPerformanceMetrics(metrics) {
    const orderMetrics = Object.entries(metrics)
      .filter(([key]) => key.includes('order_'))
      .reduce((acc, [key, metric]) => {
        acc[key] = metric;
        return acc;
      }, {});

    const paymentMetrics = Object.entries(metrics)
      .filter(([key]) => key.includes('payment_'))
      .reduce((acc, [key, metric]) => {
        acc[key] = metric;
        return acc;
      }, {});

    // Check order failure rate
    const totalOrders = orderMetrics['order_creation_success']?.count || 0;
    const failedOrders = orderMetrics['order_creation_failed']?.count || 0;
    const orderFailureRate = totalOrders > 0 ? failedOrders / totalOrders : 0;

    if (orderFailureRate > this.thresholds.orderFailureRate.critical) {
      this.triggerAlert('critical', 'HIGH_ORDER_FAILURE_RATE', {
        failureRate: Math.round(orderFailureRate * 100),
        totalOrders,
        failedOrders,
        threshold: Math.round(this.thresholds.orderFailureRate.critical * 100)
      });
    } else if (orderFailureRate > this.thresholds.orderFailureRate.warning) {
      this.triggerAlert('warning', 'ELEVATED_ORDER_FAILURE_RATE', {
        failureRate: Math.round(orderFailureRate * 100),
        totalOrders,
        failedOrders,
        threshold: Math.round(this.thresholds.orderFailureRate.warning * 100)
      });
    }

    // Check payment failure rate
    const totalPayments = paymentMetrics['payment_success']?.count || 0;
    const failedPayments = paymentMetrics['payment_failed']?.count || 0;
    const paymentFailureRate = totalPayments > 0 ? failedPayments / totalPayments : 0;

    if (paymentFailureRate > this.thresholds.paymentFailureRate.critical) {
      this.triggerAlert('critical', 'HIGH_PAYMENT_FAILURE_RATE', {
        failureRate: Math.round(paymentFailureRate * 100),
        totalPayments,
        failedPayments,
        threshold: Math.round(this.thresholds.paymentFailureRate.critical * 100)
      });
    }

    return { orderFailureRate, paymentFailureRate };
  }

  /**
   * Trigger alert with suppression
   */
  triggerAlert(severity, alertType, context = {}) {
    const alertKey = `${severity}_${alertType}`;
    const now = Date.now();
    
    // Check if alert is suppressed
    const lastAlert = this.alerts.get(alertKey);
    if (lastAlert && (now - lastAlert.timestamp) < this.suppressionTime) {
      return; // Suppressed
    }

    // Create alert
    const alert = {
      severity,
      type: alertType,
      context,
      timestamp: now,
      formattedTime: new Date(now).toISOString()
    };

    this.alerts.set(alertKey, alert);

    // Log alert
    const emoji = severity === 'critical' ? '🚨' : '⚠️';
    console.error(`${emoji} ALERT [${severity.toUpperCase()}] ${alertType}:`, context);

    // Send to monitoring services
    this.sendToMonitoringServices(alert);

    return alert;
  }

  /**
   * Send alert to external monitoring services
   */
  sendToMonitoringServices(alert) {
    try {
      // Send to Sentry
      Sentry.withScope((scope) => {
        scope.setLevel(alert.severity === 'critical' ? 'error' : 'warning');
        scope.setTag('alert_type', alert.type);
        scope.setTag('severity', alert.severity);
        scope.setContext('alert_context', alert.context);
        
        Sentry.captureMessage(`Business Alert: ${alert.type}`, alert.severity === 'critical' ? 'error' : 'warning');
      });

      // TODO: Add integrations for:
      // - Slack notifications
      // - Email alerts
      // - PagerDuty
      // - Discord webhooks

    } catch (error) {
      console.error('Failed to send alert to monitoring services:', error);
    }
  }

  /**
   * Get active alerts
   */
  getActiveAlerts() {
    const now = Date.now();
    const activeAlerts = [];

    for (const [key, alert] of this.alerts) {
      if ((now - alert.timestamp) < this.suppressionTime) {
        activeAlerts.push(alert);
      }
    }

    return activeAlerts.sort((a, b) => b.timestamp - a.timestamp);
  }
}

/**
 * Health Check System
 */
export class HealthCheckSystem {
  constructor() {
    this.checks = new Map();
    this.registerDefaultChecks();
  }

  /**
   * Register a health check
   */
  registerCheck(name, checkFunction, options = {}) {
    this.checks.set(name, {
      name,
      check: checkFunction,
      timeout: options.timeout || 5000,
      critical: options.critical || false,
      interval: options.interval || 60000
    });
  }

  /**
   * Register default system checks
   */
  registerDefaultChecks() {
    // Database connectivity check
    this.registerCheck('database', async () => {
      const mongoose = await import('mongoose');
      if (mongoose.connection.readyState !== 1) {
        throw new Error('Database not connected');
      }
      return { status: 'healthy', connection: 'active' };
    }, { critical: true, timeout: 10000 });

    // Circuit breaker health check
    this.registerCheck('circuit_breakers', async () => {
      const statuses = circuitBreakerManager.getAllStatuses();
      const unhealthy = Object.values(statuses).filter(s => s.state !== 'CLOSED');
      
      return {
        status: unhealthy.length === 0 ? 'healthy' : 'degraded',
        totalBreakers: Object.keys(statuses).length,
        unhealthyBreakers: unhealthy.length,
        details: statuses
      };
    }, { critical: false });

    // Stock system health check
    this.registerCheck('stock_system', async () => {
      const report = await atomicStockManager.getStockHealthReport();
      return {
        status: report.summary.healthScore > 80 ? 'healthy' : 'degraded',
        healthScore: report.summary.healthScore,
        summary: report.summary
      };
    }, { critical: true });
  }

  /**
   * Run all health checks
   */
  async runHealthChecks() {
    const results = {};
    const startTime = Date.now();

    for (const [name, checkConfig] of this.checks) {
      try {
        const checkStart = Date.now();
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Health check timeout')), checkConfig.timeout)
        );

        const result = await Promise.race([
          checkConfig.check(),
          timeoutPromise
        ]);

        results[name] = {
          status: 'healthy',
          responseTime: Date.now() - checkStart,
          critical: checkConfig.critical,
          ...result
        };

      } catch (error) {
        results[name] = {
          status: 'unhealthy',
          error: error.message,
          responseTime: Date.now() - checkStart,
          critical: checkConfig.critical
        };
      }
    }

    // Calculate overall health
    const criticalChecks = Object.values(results).filter(r => r.critical);
    const unhealthyCritical = criticalChecks.filter(r => r.status === 'unhealthy');
    const unhealthyAny = Object.values(results).filter(r => r.status === 'unhealthy');

    const overallStatus = unhealthyCritical.length > 0 ? 'unhealthy' : 
                         unhealthyAny.length > 0 ? 'degraded' : 'healthy';

    return {
      status: overallStatus,
      timestamp: new Date(),
      responseTime: Date.now() - startTime,
      checks: results,
      summary: {
        total: Object.keys(results).length,
        healthy: Object.values(results).filter(r => r.status === 'healthy').length,
        degraded: Object.values(results).filter(r => r.status === 'degraded').length,
        unhealthy: Object.values(results).filter(r => r.status === 'unhealthy').length,
        critical: criticalChecks.length,
        unhealthyCritical: unhealthyCritical.length
      }
    };
  }
}

// Global instances
export const businessMetrics = new BusinessMetrics();
export const criticalOperationMonitor = new CriticalOperationMonitor();
export const healthCheckSystem = new HealthCheckSystem();

/**
 * Express middleware to record business metrics
 */
export const metricsMiddleware = (req, res, next) => {
  const startTime = Date.now();
  
  // Record request
  businessMetrics.increment('http_requests_total', {
    method: req.method,
    route: req.route?.path || req.path
  });

  // Hook into response to record timing and status
  const originalSend = res.send;
  res.send = function(data) {
    businessMetrics.timing('http_request_duration', startTime, {
      method: req.method,
      status: res.statusCode,
      route: req.route?.path || req.path
    });

    businessMetrics.increment('http_responses_total', {
      method: req.method,
      status: res.statusCode,
      route: req.route?.path || req.path
    });

    return originalSend.call(this, data);
  };

  next();
};

/**
 * Periodic monitoring job
 */
export const startPeriodicMonitoring = () => {
  console.log('🔍 Starting periodic monitoring system...');
  
  // Monitor every 2 minutes
  setInterval(async () => {
    try {
      console.log('🔍 Running periodic monitoring checks...');
      
      // Monitor stock levels
      await criticalOperationMonitor.monitorStockLevels();
      
      // Monitor circuit breakers
      criticalOperationMonitor.monitorCircuitBreakers();
      
      // Monitor performance metrics
      const metrics = businessMetrics.getMetrics();
      criticalOperationMonitor.monitorPerformanceMetrics(metrics);
      
      console.log('✅ Periodic monitoring completed');
      
    } catch (error) {
      console.error('❌ Periodic monitoring failed:', error);
      globalErrorHandler.handleError(error, { operation: 'periodicMonitoring' });
    }
  }, 2 * 60 * 1000); // Every 2 minutes
};

export default {
  BusinessMetrics,
  CriticalOperationMonitor,
  HealthCheckSystem,
  businessMetrics,
  criticalOperationMonitor,
  healthCheckSystem,
  metricsMiddleware,
  startPeriodicMonitoring
};
