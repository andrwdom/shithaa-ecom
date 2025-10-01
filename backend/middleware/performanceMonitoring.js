/**
 * 🚀 PERFORMANCE MONITORING MIDDLEWARE - Amazon-Level Application Monitoring
 * 
 * This middleware provides comprehensive performance monitoring for:
 * - Request/Response times
 * - Database query performance
 * - Memory and CPU usage
 * - Error tracking and alerting
 * - Real-time performance metrics
 */

import { performanceMonitor } from '../utils/queryOptimizer.js';
import { getDatabaseStatus } from '../config/database.js';

// =====================================================================================
// REQUEST PERFORMANCE MONITORING
// =====================================================================================

export class RequestPerformanceMonitor {
    constructor() {
        this.requestStats = new Map();
        this.slowRequestThreshold = 1000; // 1 second
        this.alertThreshold = 5000; // 5 seconds
    }

    /**
     * 📊 Middleware to track request performance
     */
    middleware() {
        return (req, res, next) => {
            const startTime = Date.now();
            const requestId = this.generateRequestId();
            
            // Add request ID to request object
            req.requestId = requestId;
            req.startTime = startTime;

            // Track request start
            this.trackRequestStart(req, requestId);

            // Override res.end to capture response metrics
            const originalEnd = res.end;
            res.end = (...args) => {
                const endTime = Date.now();
                const duration = endTime - startTime;
                
                // Track request completion
                this.trackRequestEnd(req, res, duration);
                
                // Call original end method
                originalEnd.apply(res, args);
            };

            next();
        };
    }

    /**
     * 🏁 Track request start
     */
    trackRequestStart(req, requestId) {
        const requestInfo = {
            requestId,
            method: req.method,
            url: req.url,
            userAgent: req.get('User-Agent'),
            ip: req.ip,
            startTime: req.startTime,
            headers: {
                contentType: req.get('Content-Type'),
                contentLength: req.get('Content-Length'),
                authorization: req.get('Authorization') ? 'present' : 'absent'
            }
        };

        this.requestStats.set(requestId, requestInfo);

        // Log high-detail requests in development
        if (process.env.NODE_ENV === 'development') {
            console.log(`🚀 REQ START [${requestId}] ${req.method} ${req.url}`);
        }
    }

    /**
     * 🏁 Track request completion
     */
    trackRequestEnd(req, res, duration) {
        const requestInfo = this.requestStats.get(req.requestId);
        if (!requestInfo) return;

        // Update request info with completion data
        requestInfo.endTime = Date.now();
        requestInfo.duration = duration;
        requestInfo.statusCode = res.statusCode;
        requestInfo.responseSize = res.get('Content-Length') || 0;

        // Performance analysis
        const performance = this.analyzeRequestPerformance(requestInfo);

        // Log performance metrics
        this.logRequestPerformance(requestInfo, performance);

        // Alert on slow requests
        if (duration > this.alertThreshold) {
            this.alertSlowRequest(requestInfo);
        }

        // Clean up old stats to prevent memory leaks
        setTimeout(() => {
            this.requestStats.delete(req.requestId);
        }, 60000); // Keep for 1 minute
    }

    /**
     * 🔍 Analyze request performance
     */
    analyzeRequestPerformance(requestInfo) {
        const { duration, statusCode, method, url } = requestInfo;

        return {
            isSlow: duration > this.slowRequestThreshold,
            isError: statusCode >= 400,
            isSuccess: statusCode >= 200 && statusCode < 300,
            category: this.categorizeRequest(method, url),
            severity: this.getPerformanceSeverity(duration, statusCode)
        };
    }

    /**
     * 📝 Log request performance
     */
    logRequestPerformance(requestInfo, performance) {
        const { requestId, method, url, duration, statusCode } = requestInfo;
        
        const icon = performance.isError ? '❌' : 
                    performance.isSlow ? '🐌' : '✅';
        
        const logLevel = performance.isError ? 'error' : 
                        performance.isSlow ? 'warn' : 'info';

        const message = `${icon} REQ END [${requestId}] ${method} ${url} - ${statusCode} - ${duration}ms`;

        if (logLevel === 'error' || logLevel === 'warn' || process.env.NODE_ENV === 'development') {
            console.log(message);
        }

        // Store performance metrics for analytics
        this.storePerformanceMetric(requestInfo, performance);
    }

    /**
     * 🚨 Alert on slow requests
     */
    alertSlowRequest(requestInfo) {
        const { method, url, duration, requestId } = requestInfo;
        
        console.error(`🚨 SLOW REQUEST ALERT [${requestId}]`);
        console.error(`   Route: ${method} ${url}`);
        console.error(`   Duration: ${duration}ms`);
        console.error(`   Threshold: ${this.alertThreshold}ms`);
        
        // In production, you would send this to your monitoring service
        // e.g., Sentry, DataDog, New Relic, etc.
    }

    /**
     * 📊 Store performance metrics for analysis
     */
    storePerformanceMetric(requestInfo, performance) {
        // This could be stored in Redis, InfluxDB, or other time-series database
        // For now, we'll use a simple in-memory store
        
        const metric = {
            timestamp: requestInfo.endTime,
            method: requestInfo.method,
            url: requestInfo.url,
            duration: requestInfo.duration,
            statusCode: requestInfo.statusCode,
            category: performance.category,
            severity: performance.severity
        };

        // In a real implementation, this would be sent to your analytics service
        if (process.env.NODE_ENV === 'development') {
            // console.log('📊 Metric stored:', metric);
        }
    }

    /**
     * 🏷️ Categorize requests for analytics
     */
    categorizeRequest(method, url) {
        if (url.includes('/api/products')) return 'product_api';
        if (url.includes('/api/orders')) return 'order_api';
        if (url.includes('/api/users') || url.includes('/api/auth')) return 'auth_api';
        if (url.includes('/api/admin')) return 'admin_api';
        if (url.includes('/uploads') || url.includes('/images')) return 'static_files';
        return 'other';
    }

    /**
     * 📈 Get performance severity level
     */
    getPerformanceSeverity(duration, statusCode) {
        if (statusCode >= 500) return 'critical';
        if (statusCode >= 400) return 'error';
        if (duration > this.alertThreshold) return 'critical';
        if (duration > this.slowRequestThreshold) return 'warning';
        return 'normal';
    }

    /**
     * 🆔 Generate unique request ID
     */
    generateRequestId() {
        return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * 📊 Get performance statistics
     */
    getStats() {
        const activeRequests = Array.from(this.requestStats.values());
        const completedRequests = activeRequests.filter(req => req.endTime);

        return {
            activeRequests: activeRequests.length - completedRequests.length,
            completedRequests: completedRequests.length,
            averageResponseTime: completedRequests.reduce((sum, req) => sum + req.duration, 0) / completedRequests.length || 0,
            slowRequests: completedRequests.filter(req => req.duration > this.slowRequestThreshold).length,
            errorRequests: completedRequests.filter(req => req.statusCode >= 400).length
        };
    }
}

// =====================================================================================
// SYSTEM PERFORMANCE MONITORING
// =====================================================================================

export class SystemPerformanceMonitor {
    constructor() {
        this.metrics = [];
        this.maxMetrics = 100; // Keep last 100 metrics
        this.monitoringInterval = null;
    }

    /**
     * 🚀 Start system monitoring
     */
    startMonitoring(intervalMs = 10000) { // Every 10 seconds
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
        }

        this.monitoringInterval = setInterval(async () => {
            const metric = await this.collectSystemMetrics();
            this.storeMetric(metric);
            this.analyzeSystemHealth(metric);
        }, intervalMs);

        console.log(`📊 System performance monitoring started (interval: ${intervalMs}ms)`);
    }

    /**
     * 🛑 Stop system monitoring
     */
    stopMonitoring() {
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
            this.monitoringInterval = null;
            console.log('📊 System performance monitoring stopped');
        }
    }

    /**
     * 📊 Collect system performance metrics
     */
    async collectSystemMetrics() {
        const process = global.process;
        const memUsage = process.memoryUsage();
        const cpuUsage = process.cpuUsage();
        
        // Database status
        const dbStatus = getDatabaseStatus();
        
        // Query performance stats
        const queryStats = performanceMonitor.getStats();
        
        return {
            timestamp: new Date().toISOString(),
            system: {
                uptime: process.uptime(),
                pid: process.pid,
                version: process.version,
                platform: process.platform,
                arch: process.arch
            },
            memory: {
                rss: Math.round(memUsage.rss / 1024 / 1024), // MB
                heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024), // MB
                heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024), // MB
                external: Math.round(memUsage.external / 1024 / 1024), // MB
                heapUtilization: Math.round((memUsage.heapUsed / memUsage.heapTotal) * 100) // %
            },
            cpu: {
                user: cpuUsage.user,
                system: cpuUsage.system
            },
            database: {
                connected: dbStatus.connected,
                readyState: dbStatus.readyState,
                status: dbStatus.readyStateDescription
            },
            queries: {
                totalQueries: queryStats.reduce((sum, stat) => sum + stat.count, 0),
                averageQueryTime: queryStats.reduce((sum, stat) => sum + stat.avgTime, 0) / queryStats.length || 0,
                slowQueries: queryStats.reduce((sum, stat) => sum + stat.slowQueries, 0)
            }
        };
    }

    /**
     * 💾 Store performance metric
     */
    storeMetric(metric) {
        this.metrics.push(metric);
        
        // Keep only recent metrics to prevent memory bloat
        if (this.metrics.length > this.maxMetrics) {
            this.metrics.shift();
        }
    }

    /**
     * 🔍 Analyze system health
     */
    analyzeSystemHealth(metric) {
        const alerts = [];

        // Memory alerts
        if (metric.memory.heapUtilization > 85) {
            alerts.push({
                type: 'memory',
                severity: 'critical',
                message: `High memory usage: ${metric.memory.heapUtilization}%`,
                value: metric.memory.heapUtilization,
                threshold: 85
            });
        }

        // Database connection alerts
        if (!metric.database.connected) {
            alerts.push({
                type: 'database',
                severity: 'critical',
                message: 'Database connection lost',
                value: metric.database.status
            });
        }

        // Query performance alerts
        if (metric.queries.slowQueries > 10) {
            alerts.push({
                type: 'queries',
                severity: 'warning',
                message: `High number of slow queries: ${metric.queries.slowQueries}`,
                value: metric.queries.slowQueries,
                threshold: 10
            });
        }

        // Send alerts if any
        if (alerts.length > 0) {
            this.sendAlerts(alerts);
        }
    }

    /**
     * 🚨 Send performance alerts
     */
    sendAlerts(alerts) {
        alerts.forEach(alert => {
            const icon = alert.severity === 'critical' ? '🚨' : '⚠️';
            console.log(`${icon} SYSTEM ALERT [${alert.type.toUpperCase()}] ${alert.message}`);
        });

        // In production, send to monitoring service (Slack, PagerDuty, etc.)
    }

    /**
     * 📈 Get performance trends
     */
    getPerformanceTrends() {
        if (this.metrics.length < 2) return null;

        const recent = this.metrics.slice(-10); // Last 10 metrics
        const older = this.metrics.slice(-20, -10); // Previous 10 metrics

        const recentAvg = this.calculateAverages(recent);
        const olderAvg = this.calculateAverages(older);

        return {
            memory: {
                current: recentAvg.memory.heapUtilization,
                previous: olderAvg.memory.heapUtilization,
                trend: recentAvg.memory.heapUtilization - olderAvg.memory.heapUtilization
            },
            queries: {
                current: recentAvg.queries.averageQueryTime,
                previous: olderAvg.queries.averageQueryTime,
                trend: recentAvg.queries.averageQueryTime - olderAvg.queries.averageQueryTime
            }
        };
    }

    /**
     * 🧮 Calculate metric averages
     */
    calculateAverages(metrics) {
        if (metrics.length === 0) return {};

        return {
            memory: {
                heapUtilization: metrics.reduce((sum, m) => sum + m.memory.heapUtilization, 0) / metrics.length
            },
            queries: {
                averageQueryTime: metrics.reduce((sum, m) => sum + m.queries.averageQueryTime, 0) / metrics.length
            }
        };
    }

    /**
     * 📊 Get current system status
     */
    getCurrentStatus() {
        const latest = this.metrics[this.metrics.length - 1];
        if (!latest) return null;

        const trends = this.getPerformanceTrends();

        return {
            timestamp: latest.timestamp,
            status: this.getOverallStatus(latest),
            metrics: latest,
            trends,
            health: {
                memory: latest.memory.heapUtilization < 85 ? 'good' : 'warning',
                database: latest.database.connected ? 'good' : 'critical',
                queries: latest.queries.slowQueries < 10 ? 'good' : 'warning'
            }
        };
    }

    /**
     * 🎯 Get overall system status
     */
    getOverallStatus(metric) {
        if (!metric.database.connected) return 'critical';
        if (metric.memory.heapUtilization > 85) return 'warning';
        if (metric.queries.slowQueries > 10) return 'warning';
        return 'healthy';
    }
}

// =====================================================================================
// MIDDLEWARE INSTANCES AND EXPORTS
// =====================================================================================

// Create singleton instances
export const requestMonitor = new RequestPerformanceMonitor();
export const systemMonitor = new SystemPerformanceMonitor();

// Middleware exports
export const performanceMiddleware = requestMonitor.middleware();

// Utility functions
export const startSystemMonitoring = () => systemMonitor.startMonitoring();
export const stopSystemMonitoring = () => systemMonitor.stopMonitoring();
export const getSystemStatus = () => systemMonitor.getCurrentStatus();
export const getRequestStats = () => requestMonitor.getStats();

export default {
    RequestPerformanceMonitor,
    SystemPerformanceMonitor,
    requestMonitor,
    systemMonitor,
    performanceMiddleware,
    startSystemMonitoring,
    stopSystemMonitoring,
    getSystemStatus,
    getRequestStats
};
