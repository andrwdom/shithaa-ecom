/**
 * 🚀 PERFORMANCE MONITORING ROUTES - Real-time Performance Dashboard
 * 
 * Provides endpoints for monitoring application and database performance:
 * - Real-time performance metrics
 * - Database query analysis  
 * - System health monitoring
 * - Performance optimization recommendations
 */

import express from 'express';
import { 
    getSystemStatus,
    getRequestStats,
    systemMonitor 
} from '../middleware/performanceMonitoring.js';
import { 
    performanceMonitor,
    DatabaseOptimizer,
    QueryAnalyzer
} from '../utils/queryOptimizer.js';
import { checkDatabaseHealth } from '../config/database.js';
import productModel from '../models/productModel.js';
import orderModel from '../models/orderModel.js';
import userModel from '../models/userModel.js';

const router = express.Router();

// =====================================================================================
// REAL-TIME PERFORMANCE MONITORING ENDPOINTS
// =====================================================================================

/**
 * GET /api/performance/dashboard - Get comprehensive performance dashboard
 */
router.get('/dashboard', async (req, res) => {
    try {
        const [
            systemStatus,
            requestStats,
            queryStats,
            dbHealth
        ] = await Promise.all([
            getSystemStatus(),
            getRequestStats(),
            performanceMonitor.getStats(),
            checkDatabaseHealth()
        ]);

        // Calculate performance scores
        const performanceScore = calculatePerformanceScore(systemStatus, queryStats);

        res.json({
            success: true,
            dashboard: {
                timestamp: new Date().toISOString(),
                performanceScore,
                system: systemStatus,
                requests: requestStats,
                queries: {
                    stats: queryStats,
                    summary: {
                        totalQueries: queryStats.reduce((sum, stat) => sum + stat.count, 0),
                        averageTime: queryStats.reduce((sum, stat) => sum + stat.avgTime, 0) / queryStats.length || 0,
                        slowQueries: queryStats.reduce((sum, stat) => sum + stat.slowQueries, 0),
                        fastestQuery: Math.min(...queryStats.map(s => s.avgTime)) || 0,
                        slowestQuery: Math.max(...queryStats.map(s => s.avgTime)) || 0
                    }
                },
                database: dbHealth,
                recommendations: generatePerformanceRecommendations(systemStatus, queryStats)
            }
        });

    } catch (error) {
        console.error('Performance dashboard error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to fetch performance dashboard' 
        });
    }
});

/**
 * GET /api/performance/system - Get detailed system metrics
 */
router.get('/system', async (req, res) => {
    try {
        const systemStatus = getSystemStatus();
        const trends = systemMonitor.getPerformanceTrends();

        res.json({
            success: true,
            system: systemStatus,
            trends,
            alerts: generateSystemAlerts(systemStatus)
        });

    } catch (error) {
        console.error('System metrics error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to fetch system metrics' 
        });
    }
});

/**
 * GET /api/performance/queries - Get database query performance analysis
 */
router.get('/queries', async (req, res) => {
    try {
        const queryStats = performanceMonitor.getStats();
        
        // Get slow query analysis
        const slowQueries = await DatabaseOptimizer.getSlowQueryAnalysis(10);

        // Categorize queries by performance
        const categorizedQueries = categorizeQueryPerformance(queryStats);

        res.json({
            success: true,
            queries: {
                stats: queryStats,
                slowQueries,
                categories: categorizedQueries,
                summary: {
                    totalQueries: queryStats.reduce((sum, stat) => sum + stat.count, 0),
                    averageTime: queryStats.reduce((sum, stat) => sum + stat.avgTime, 0) / queryStats.length || 0,
                    performance: {
                        excellent: categorizedQueries.excellent.length,
                        good: categorizedQueries.good.length,
                        warning: categorizedQueries.warning.length,
                        critical: categorizedQueries.critical.length
                    }
                },
                recommendations: generateQueryOptimizationRecommendations(queryStats)
            }
        });

    } catch (error) {
        console.error('Query performance error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to fetch query performance data' 
        });
    }
});

// =====================================================================================
// DATABASE ANALYSIS ENDPOINTS
// =====================================================================================

/**
 * POST /api/performance/analyze-query - Analyze specific query performance
 */
router.post('/analyze-query', async (req, res) => {
    try {
        const { collection, query, options = {} } = req.body;

        if (!collection || !query) {
            return res.status(400).json({
                success: false,
                message: 'Collection and query are required'
            });
        }

        // Select model based on collection name
        let model;
        switch (collection.toLowerCase()) {
            case 'products':
                model = productModel;
                break;
            case 'orders':
                model = orderModel;
                break;
            case 'users':
                model = userModel;
                break;
            default:
                return res.status(400).json({
                    success: false,
                    message: 'Unsupported collection'
                });
        }

        // Analyze query execution plan
        const analysis = await QueryAnalyzer.explainQuery(model, query, options);
        
        // Generate optimization recommendations
        const recommendations = generateQueryRecommendations(analysis);

        res.json({
            success: true,
            analysis: {
                collection,
                query,
                options,
                execution: analysis,
                recommendations,
                timestamp: new Date().toISOString()
            }
        });

    } catch (error) {
        console.error('Query analysis error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to analyze query',
            error: error.message 
        });
    }
});

/**
 * GET /api/performance/database-health - Comprehensive database health check
 */
router.get('/database-health', async (req, res) => {
    try {
        const dbHealth = await checkDatabaseHealth();
        
        // Additional health checks
        const connectionStats = await getConnectionPoolStats();
        const indexAnalysis = await getIndexEfficiencyAnalysis();

        res.json({
            success: true,
            health: {
                ...dbHealth,
                connectionPool: connectionStats,
                indexes: indexAnalysis,
                recommendations: generateDatabaseHealthRecommendations(dbHealth, indexAnalysis)
            }
        });

    } catch (error) {
        console.error('Database health check error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to check database health' 
        });
    }
});

// =====================================================================================
// OPTIMIZATION ENDPOINTS
// =====================================================================================

/**
 * POST /api/performance/reset-stats - Reset performance statistics
 */
router.post('/reset-stats', (req, res) => {
    try {
        performanceMonitor.reset();
        
        res.json({
            success: true,
            message: 'Performance statistics reset successfully',
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Reset stats error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to reset statistics' 
        });
    }
});

/**
 * GET /api/performance/recommendations - Get performance optimization recommendations
 */
router.get('/recommendations', async (req, res) => {
    try {
        const systemStatus = getSystemStatus();
        const queryStats = performanceMonitor.getStats();
        const dbHealth = await checkDatabaseHealth();

        const recommendations = {
            system: generateSystemRecommendations(systemStatus),
            queries: generateQueryOptimizationRecommendations(queryStats),
            database: generateDatabaseHealthRecommendations(dbHealth, null),
            priority: prioritizeRecommendations(systemStatus, queryStats)
        };

        res.json({
            success: true,
            recommendations,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Recommendations error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to generate recommendations' 
        });
    }
});

// =====================================================================================
// HELPER FUNCTIONS
// =====================================================================================

/**
 * 📊 Calculate overall performance score (0-100)
 */
function calculatePerformanceScore(systemStatus, queryStats) {
    if (!systemStatus || !queryStats.length) return 0;

    let score = 100;
    const metrics = systemStatus.metrics;

    // Memory usage impact (0-30 points)
    if (metrics.memory.heapUtilization > 85) score -= 30;
    else if (metrics.memory.heapUtilization > 70) score -= 15;
    else if (metrics.memory.heapUtilization > 50) score -= 5;

    // Database connection impact (0-40 points)
    if (!metrics.database.connected) score -= 40;

    // Query performance impact (0-30 points)
    const avgQueryTime = queryStats.reduce((sum, stat) => sum + stat.avgTime, 0) / queryStats.length;
    const slowQueries = queryStats.reduce((sum, stat) => sum + stat.slowQueries, 0);
    
    if (avgQueryTime > 1000) score -= 30;
    else if (avgQueryTime > 500) score -= 20;
    else if (avgQueryTime > 100) score -= 10;
    
    if (slowQueries > 20) score -= 20;
    else if (slowQueries > 10) score -= 10;
    else if (slowQueries > 5) score -= 5;

    return Math.max(0, score);
}

/**
 * 🎯 Generate performance recommendations
 */
function generatePerformanceRecommendations(systemStatus, queryStats) {
    const recommendations = [];

    if (systemStatus && systemStatus.metrics.memory.heapUtilization > 85) {
        recommendations.push({
            type: 'memory',
            priority: 'high',
            message: 'High memory usage detected. Consider implementing memory optimization strategies.',
            action: 'Optimize memory usage'
        });
    }

    const slowQueries = queryStats.reduce((sum, stat) => sum + stat.slowQueries, 0);
    if (slowQueries > 10) {
        recommendations.push({
            type: 'queries',
            priority: 'high',
            message: `${slowQueries} slow queries detected. Review and optimize database queries.`,
            action: 'Optimize database queries'
        });
    }

    return recommendations;
}

/**
 * 🔍 Categorize query performance
 */
function categorizeQueryPerformance(queryStats) {
    return {
        excellent: queryStats.filter(q => q.avgTime < 10),
        good: queryStats.filter(q => q.avgTime >= 10 && q.avgTime < 50),
        warning: queryStats.filter(q => q.avgTime >= 50 && q.avgTime < 100),
        critical: queryStats.filter(q => q.avgTime >= 100)
    };
}

/**
 * 📈 Generate system alerts
 */
function generateSystemAlerts(systemStatus) {
    const alerts = [];

    if (!systemStatus) return alerts;

    const metrics = systemStatus.metrics;
    
    if (metrics.memory.heapUtilization > 90) {
        alerts.push({
            type: 'memory',
            level: 'critical',
            message: `Critical memory usage: ${metrics.memory.heapUtilization}%`
        });
    }

    if (!metrics.database.connected) {
        alerts.push({
            type: 'database',
            level: 'critical',
            message: 'Database connection lost'
        });
    }

    return alerts;
}

/**
 * 🗃️ Get connection pool statistics
 */
async function getConnectionPoolStats() {
    // This would typically come from MongoDB driver statistics
    // For now, return mock data
    return {
        maxPoolSize: 20,
        currentConnections: 8,
        availableConnections: 12,
        utilization: 40
    };
}

/**
 * 📊 Get index efficiency analysis
 */
async function getIndexEfficiencyAnalysis() {
    // This would analyze index usage statistics
    // For now, return mock data
    return {
        totalIndexes: 45,
        efficientIndexes: 38,
        underutilizedIndexes: 5,
        missingIndexes: 2,
        efficiency: 84
    };
}

/**
 * 🔧 Generate query recommendations
 */
function generateQueryRecommendations(analysis) {
    const recommendations = [];
    
    if (analysis.indexesUsed === 'COLLSCAN') {
        recommendations.push({
            type: 'INDEX_MISSING',
            message: 'Query is performing a collection scan. Consider adding an appropriate index.',
            priority: 'HIGH'
        });
    }
    
    if (analysis.efficiency < 0.1) {
        recommendations.push({
            type: 'LOW_EFFICIENCY',
            message: 'Query is examining many more documents than returned. Consider refining the query or adding compound indexes.',
            priority: 'MEDIUM'
        });
    }
    
    return recommendations;
}

/**
 * 💡 Generate system recommendations
 */
function generateSystemRecommendations(systemStatus) {
    // Implementation would analyze system metrics and provide recommendations
    return [];
}

/**
 * 🚀 Generate query optimization recommendations
 */
function generateQueryOptimizationRecommendations(queryStats) {
    // Implementation would analyze query patterns and suggest optimizations
    return [];
}

/**
 * 🏥 Generate database health recommendations
 */
function generateDatabaseHealthRecommendations(dbHealth, indexAnalysis) {
    // Implementation would analyze database health and suggest improvements
    return [];
}

/**
 * 🎯 Prioritize recommendations
 */
function prioritizeRecommendations(systemStatus, queryStats) {
    // Implementation would prioritize recommendations based on impact
    return [];
}

export default router;
