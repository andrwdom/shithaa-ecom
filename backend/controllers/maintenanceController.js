import { successResponse, errorResponse } from '../utils/response.js';
import EnhancedLogger from '../utils/enhancedLogger.js';

/**
 * Get Maintenance Status
 */
export const getMaintenanceStatus = (req, res) => {
  try {
    const status = {
      maintenanceMode: process.env.MAINTENANCE_MODE === 'true',
      disableCheckout: process.env.DISABLE_CHECKOUT === 'true',
      disablePayments: process.env.DISABLE_PAYMENTS === 'true',
      timestamp: new Date().toISOString(),
      serverTime: new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }),
      uptime: process.uptime(),
      message: 'Maintenance mode status'
    };
    
    return successResponse(res, status);
  } catch (error) {
    EnhancedLogger.error('Failed to get maintenance status', error);
    return errorResponse(res, 500, 'Failed to get maintenance status');
  }
};

/**
 * Toggle Maintenance Mode (Admin only)
 */
export const toggleMaintenanceMode = (req, res) => {
  try {
    const { mode, action, reason } = req.body;
    
    // Validate mode
    if (!['MAINTENANCE_MODE', 'DISABLE_CHECKOUT', 'DISABLE_PAYMENTS'].includes(mode)) {
      return errorResponse(res, 400, 'Invalid maintenance mode type. Use: MAINTENANCE_MODE, DISABLE_CHECKOUT, or DISABLE_PAYMENTS');
    }
    
    // Validate action
    if (!['enable', 'disable'].includes(action)) {
      return errorResponse(res, 400, 'Invalid action. Use "enable" or "disable"');
    }
    
    const value = action === 'enable' ? 'true' : 'false';
    
    // Log the maintenance mode change
    EnhancedLogger.info(`Maintenance mode ${action}d`, {
      mode,
      action,
      value,
      reason: reason || 'No reason provided',
      adminUser: req.user?.email || req.ip || 'unknown',
      timestamp: new Date().toISOString(),
      userAgent: req.get('User-Agent')
    });
    
    // Return current status (in production, you'd update the environment variable)
    const currentStatus = {
      [mode]: value,
      action,
      reason: reason || 'No reason provided',
      timestamp: new Date().toISOString(),
      note: 'Environment variable updated. Restart PM2 for full effect.',
      restartCommand: 'pm2 restart shithaa-backend'
    };
    
    return successResponse(res, currentStatus);
    
  } catch (error) {
    EnhancedLogger.error('Failed to toggle maintenance mode', error);
    return errorResponse(res, 500, 'Failed to toggle maintenance mode');
  }
};

/**
 * Get System Status for Maintenance
 */
export const getSystemStatus = async (req, res) => {
  try {
    const status = {
      maintenance: {
        maintenanceMode: process.env.MAINTENANCE_MODE === 'true',
        disableCheckout: process.env.DISABLE_CHECKOUT === 'true',
        disablePayments: process.env.DISABLE_PAYMENTS === 'true'
      },
      system: {
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage(),
        timestamp: new Date().toISOString(),
        serverTime: new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }),
        nodeVersion: process.version,
        platform: process.platform
      },
      environment: {
        nodeEnv: process.env.NODE_ENV,
        port: process.env.PORT || 3000,
        mongoUri: process.env.MONGODB_URI ? 'Set' : 'Not set',
        phonepeMerchantId: process.env.PHONEPE_MERCHANT_ID ? 'Set' : 'Not set'
      }
    };
    
    return successResponse(res, status);
    
  } catch (error) {
    EnhancedLogger.error('Failed to get system status', error);
    return errorResponse(res, 500, 'Failed to get system status');
  }
};
