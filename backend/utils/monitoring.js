/**
 * Production Monitoring and Alerting System
 * Designed for high-traffic e-commerce with 30k+ users
 */

import fs from 'fs';
import path from 'path';

class ProductionMonitor {
    constructor() {
        this.metrics = {
            requests: 0,
            errors: 0,
            responseTime: [],
            memoryUsage: [],
            dbConnections: 0,
            stockReservations: 0,
            payments: 0,
            failedPayments: 0
        };
        
        this.alerts = [];
        this.thresholds = {
            maxResponseTime: 5000, // 5 seconds
            maxMemoryUsage: 500, // 500MB
            maxErrorRate: 0.05, // 5%
            maxDbConnections: 10,
            minStockAvailability: 0.1 // 10%
        };
        
        this.startTime = Date.now();
        this.lastAlertTime = 0;
        this.alertCooldown = 60000; // 1 minute between alerts
    }

    // Track request metrics
    trackRequest(responseTime, isError = false) {
        this.metrics.requests++;
        this.metrics.responseTime.push(responseTime);
        
        if (isError) {
            this.metrics.errors++;
        }
        
        // Keep only last 1000 response times for memory efficiency
        if (this.metrics.responseTime.length > 1000) {
            this.metrics.responseTime = this.metrics.responseTime.slice(-1000);
        }
        
        this.checkThresholds();
    }

    // Track memory usage
    trackMemoryUsage() {
        const memUsage = process.memoryUsage();
        const memUsageMB = Math.round(memUsage.heapUsed / 1024 / 1024);
        
        this.metrics.memoryUsage.push(memUsageMB);
        
        // Keep only last 100 memory readings
        if (this.metrics.memoryUsage.length > 100) {
            this.metrics.memoryUsage = this.metrics.memoryUsage.slice(-100);
        }
    }

    // Track stock operations
    trackStockReservation(success = true) {
        if (success) {
            this.metrics.stockReservations++;
        }
    }

    // Track payment operations
    trackPayment(success = true) {
        if (success) {
            this.metrics.payments++;
        } else {
            this.metrics.failedPayments++;
        }
    }

    // Check if thresholds are exceeded
    checkThresholds() {
        const now = Date.now();
        
        // Cooldown check
        if (now - this.lastAlertTime < this.alertCooldown) {
            return;
        }
        
        const avgResponseTime = this.getAverageResponseTime();
        const errorRate = this.getErrorRate();
        const avgMemoryUsage = this.getAverageMemoryUsage();
        
        // Check response time threshold
        if (avgResponseTime > this.thresholds.maxResponseTime) {
            this.triggerAlert('HIGH_RESPONSE_TIME', {
                current: avgResponseTime,
                threshold: this.thresholds.maxResponseTime,
                message: `Average response time ${avgResponseTime}ms exceeds threshold`
            });
        }
        
        // Check error rate threshold
        if (errorRate > this.thresholds.maxErrorRate) {
            this.triggerAlert('HIGH_ERROR_RATE', {
                current: errorRate,
                threshold: this.thresholds.maxErrorRate,
                message: `Error rate ${(errorRate * 100).toFixed(2)}% exceeds threshold`
            });
        }
        
        // Check memory usage threshold
        if (avgMemoryUsage > this.thresholds.maxMemoryUsage) {
            this.triggerAlert('HIGH_MEMORY_USAGE', {
                current: avgMemoryUsage,
                threshold: this.thresholds.maxMemoryUsage,
                message: `Memory usage ${avgMemoryUsage}MB exceeds threshold`
            });
        }
    }

    // Trigger alert
    triggerAlert(type, data) {
        const alert = {
            type,
            timestamp: new Date().toISOString(),
            data,
            uptime: process.uptime(),
            metrics: this.getCurrentMetrics()
        };
        
        this.alerts.push(alert);
        this.lastAlertTime = Date.now();
        
        // Log alert
        console.error('🚨 PRODUCTION ALERT:', alert);
        
        // Write to log file
        this.writeAlertToFile(alert);
        
        // Keep only last 100 alerts
        if (this.alerts.length > 100) {
            this.alerts = this.alerts.slice(-100);
        }
    }

    // Write alert to file
    writeAlertToFile(alert) {
        try {
            const logDir = path.join(process.cwd(), 'logs');
            if (!fs.existsSync(logDir)) {
                fs.mkdirSync(logDir, { recursive: true });
            }
            
            const alertFile = path.join(logDir, 'alerts.log');
            const logEntry = `${alert.timestamp} [${alert.type}] ${alert.data.message}\n`;
            
            fs.appendFileSync(alertFile, logEntry);
        } catch (error) {
            console.error('Failed to write alert to file:', error);
        }
    }

    // Get current metrics
    getCurrentMetrics() {
        return {
            requests: this.metrics.requests,
            errors: this.metrics.errors,
            errorRate: this.getErrorRate(),
            avgResponseTime: this.getAverageResponseTime(),
            avgMemoryUsage: this.getAverageMemoryUsage(),
            uptime: process.uptime(),
            stockReservations: this.metrics.stockReservations,
            payments: this.metrics.payments,
            failedPayments: this.metrics.failedPayments,
            paymentSuccessRate: this.getPaymentSuccessRate()
        };
    }

    // Get average response time
    getAverageResponseTime() {
        if (this.metrics.responseTime.length === 0) return 0;
        return Math.round(
            this.metrics.responseTime.reduce((a, b) => a + b, 0) / this.metrics.responseTime.length
        );
    }

    // Get error rate
    getErrorRate() {
        if (this.metrics.requests === 0) return 0;
        return this.metrics.errors / this.metrics.requests;
    }

    // Get average memory usage
    getAverageMemoryUsage() {
        if (this.metrics.memoryUsage.length === 0) return 0;
        return Math.round(
            this.metrics.memoryUsage.reduce((a, b) => a + b, 0) / this.metrics.memoryUsage.length
        );
    }

    // Get payment success rate
    getPaymentSuccessRate() {
        const totalPayments = this.metrics.payments + this.metrics.failedPayments;
        if (totalPayments === 0) return 1;
        return this.metrics.payments / totalPayments;
    }

    // Get health status
    getHealthStatus() {
        const metrics = this.getCurrentMetrics();
        
        const status = {
            healthy: true,
            issues: [],
            metrics
        };
        
        if (metrics.avgResponseTime > this.thresholds.maxResponseTime) {
            status.healthy = false;
            status.issues.push('High response time');
        }
        
        if (metrics.errorRate > this.thresholds.maxErrorRate) {
            status.healthy = false;
            status.issues.push('High error rate');
        }
        
        if (metrics.avgMemoryUsage > this.thresholds.maxMemoryUsage) {
            status.healthy = false;
            status.issues.push('High memory usage');
        }
        
        if (metrics.paymentSuccessRate < 0.95) {
            status.healthy = false;
            status.issues.push('Low payment success rate');
        }
        
        return status;
    }

    // Reset metrics (call periodically)
    resetMetrics() {
        this.metrics = {
            requests: 0,
            errors: 0,
            responseTime: [],
            memoryUsage: [],
            dbConnections: 0,
            stockReservations: 0,
            payments: 0,
            failedPayments: 0
        };
    }
}

// Create singleton instance
const monitor = new ProductionMonitor();

// Export monitoring functions
export const trackRequest = (responseTime, isError) => monitor.trackRequest(responseTime, isError);
export const trackMemoryUsage = () => monitor.trackMemoryUsage();
export const trackStockReservation = (success) => monitor.trackStockReservation(success);
export const trackPayment = (success) => monitor.trackPayment(success);
export const getHealthStatus = () => monitor.getHealthStatus();
export const getCurrentMetrics = () => monitor.getCurrentMetrics();
export const resetMetrics = () => monitor.resetMetrics();

// Start memory tracking
setInterval(() => {
    monitor.trackMemoryUsage();
}, 30000); // Every 30 seconds

// Reset metrics every hour
setInterval(() => {
    monitor.resetMetrics();
}, 3600000); // Every hour

export default monitor;
