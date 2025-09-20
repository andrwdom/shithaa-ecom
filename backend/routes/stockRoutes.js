import express from 'express';
import { 
    getStockHealthReport, 
    cleanupExpiredReservations,
    cleanupStockReservations 
} from '../utils/stock.js';

const router = express.Router();

/**
 * GET /api/stock/health
 * Get stock system health report
 */
router.get('/health', async (req, res) => {
    try {
        const report = await getStockHealthReport();
        
        if (report.success) {
            res.json({
                success: true,
                data: report,
                timestamp: new Date().toISOString()
            });
        } else {
            res.status(500).json({
                success: false,
                message: 'Failed to generate stock health report',
                error: report.error
            });
        }
    } catch (error) {
        console.error('Stock health endpoint error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
});

/**
 * POST /api/stock/cleanup
 * Manually trigger expired reservation cleanup
 */
router.post('/cleanup', async (req, res) => {
    try {
        const { dryRun = false } = req.body;
        
        if (dryRun) {
            res.json({
                success: true,
                message: 'Dry run mode - no changes made',
                data: { dryRun: true }
            });
            return;
        }
        
        const result = await cleanupExpiredReservations();
        
        if (result.success) {
            res.json({
                success: true,
                message: 'Stock cleanup completed successfully',
                data: result,
                timestamp: new Date().toISOString()
            });
        } else {
            res.status(500).json({
                success: false,
                message: 'Stock cleanup failed',
                error: result.error
            });
        }
    } catch (error) {
        console.error('Stock cleanup endpoint error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
});

/**
 * POST /api/stock/reset
 * Emergency reset all stock reservations (use with caution)
 */
router.post('/reset', async (req, res) => {
    try {
        const { confirm = false } = req.body;
        
        if (!confirm) {
            return res.status(400).json({
                success: false,
                message: 'Reset operation requires confirmation. Send { "confirm": true } in request body.',
                warning: 'This will reset ALL stock reservations and may cause inventory issues!'
            });
        }
        
        const result = await cleanupStockReservations();
        
        if (result.success) {
            res.json({
                success: true,
                message: 'Stock reservations reset successfully',
                data: result,
                timestamp: new Date().toISOString()
            });
        } else {
            res.status(500).json({
                success: false,
                message: 'Stock reset failed',
                error: result.error
            });
        }
    } catch (error) {
        console.error('Stock reset endpoint error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
});

/**
 * GET /api/stock/status
 * Quick status check for monitoring
 */
router.get('/status', async (req, res) => {
    try {
        const report = await getStockHealthReport();
        
        if (report.success) {
            const status = report.healthScore >= 80 ? 'healthy' : 
                          report.healthScore >= 60 ? 'warning' : 'critical';
            
            res.json({
                success: true,
                status,
                healthScore: report.healthScore,
                summary: report.summary,
                timestamp: new Date().toISOString()
            });
        } else {
            res.status(500).json({
                success: false,
                status: 'error',
                message: 'Failed to check stock status',
                error: report.error
            });
        }
    } catch (error) {
        console.error('Stock status endpoint error:', error);
        res.status(500).json({
            success: false,
            status: 'error',
            message: 'Internal server error',
            error: error.message
        });
    }
});

export default router;
