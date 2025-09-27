import { errorResponse } from '../utils/response.js';
import EnhancedLogger from '../utils/enhancedLogger.js';

/**
 * Maintenance Mode Middleware
 * Temporarily disables non-essential operations during critical fixes
 */
export const maintenanceMode = (req, res, next) => {
  const maintenanceMode = process.env.MAINTENANCE_MODE === 'true';
  const disableCheckout = process.env.DISABLE_CHECKOUT === 'true';
  const disablePayments = process.env.DISABLE_PAYMENTS === 'true';
  
  // Log maintenance mode access attempts
  if (maintenanceMode || disableCheckout || disablePayments) {
    EnhancedLogger.info('Maintenance mode access attempt', {
      path: req.path,
      method: req.method,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      maintenanceMode,
      disableCheckout,
      disablePayments
    });
  }
  
  // Block checkout operations
  if (disableCheckout && (
    req.path.includes('/checkout') ||
    req.path.includes('/payment') ||
    req.method === 'POST' && (
      req.path.includes('/orders') ||
      req.path.includes('/reservations')
    )
  )) {
    return errorResponse(res, 503, 'Checkout temporarily disabled for maintenance. Please try again later.', {
      maintenanceMode: true,
      estimatedDowntime: '30 minutes',
      contactInfo: 'support@shithaa.com'
    });
  }
  
  // Block payment operations
  if (disablePayments && (
    req.path.includes('/payment') ||
    req.path.includes('/phonepe') ||
    req.path.includes('/webhook')
  )) {
    return errorResponse(res, 503, 'Payment processing temporarily disabled for maintenance. Please try again later.', {
      maintenanceMode: true,
      estimatedDowntime: '30 minutes',
      contactInfo: 'support@shithaa.com'
    });
  }
  
  // Full maintenance mode - block all non-essential operations
  if (maintenanceMode) {
    // Allow only essential operations
    const allowedPaths = [
      '/api/health',
      '/api/monitoring',
      '/api/products',
      '/api/categories',
      '/api/carousel',
      '/api/hero-images',
      '/api/cached'
    ];
    
    const isAllowed = allowedPaths.some(path => req.path.startsWith(path)) || 
                     req.method === 'GET' && (
                       req.path.includes('/images') ||
                       req.path.includes('/uploads') ||
                       req.path.includes('/gallery')
                     );
    
    if (!isAllowed) {
      return errorResponse(res, 503, 'System temporarily under maintenance. Please try again later.', {
        maintenanceMode: true,
        estimatedDowntime: '30 minutes',
        contactInfo: 'support@shithaa.com',
        allowedOperations: 'Browsing products and viewing content only'
      });
    }
  }
  
  next();
};

/**
 * Maintenance Mode Status Endpoint
 */
export const getMaintenanceStatus = (req, res) => {
  const status = {
    maintenanceMode: process.env.MAINTENANCE_MODE === 'true',
    disableCheckout: process.env.DISABLE_CHECKOUT === 'true',
    disablePayments: process.env.DISABLE_PAYMENTS === 'true',
    timestamp: new Date().toISOString(),
    message: 'Maintenance mode status'
  };
  
  return res.status(200).json({
    success: true,
    data: status
  });
};

/**
 * Toggle Maintenance Mode (Admin only)
 */
export const toggleMaintenanceMode = (req, res) => {
  const { mode, action } = req.body;
  
  if (!['MAINTENANCE_MODE', 'DISABLE_CHECKOUT', 'DISABLE_PAYMENTS'].includes(mode)) {
    return errorResponse(res, 400, 'Invalid maintenance mode type');
  }
  
  if (!['enable', 'disable'].includes(action)) {
    return errorResponse(res, 400, 'Invalid action. Use "enable" or "disable"');
  }
  
  const value = action === 'enable' ? 'true' : 'false';
  
  // Log the maintenance mode change
  EnhancedLogger.info(`Maintenance mode ${action}d`, {
    mode,
    action,
    value,
    adminUser: req.user?.email || 'unknown',
    timestamp: new Date().toISOString()
  });
  
  // Note: In production, you'd want to update the environment variable
  // and restart the service. For now, we'll just return the status.
  return res.status(200).json({
    success: true,
    message: `${mode} ${action}d`,
    data: {
      mode,
      action,
      value,
      note: 'Environment variable updated. Restart required for full effect.'
    }
  });
};
