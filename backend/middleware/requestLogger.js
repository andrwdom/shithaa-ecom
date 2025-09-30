/**
 * Request Logging Middleware
 * Tracks all API requests with timing and status
 */

import Logger from '../utils/logger.js';

/**
 * Enhanced request logger middleware
 */
export const requestLogger = (req, res, next) => {
  const startTime = Date.now();
  
  // Generate request ID if not present
  if (!req.headers['x-request-id']) {
    req.headers['x-request-id'] = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  // Log request start (only in development or for important endpoints)
  if (process.env.NODE_ENV === 'development' || req.url.includes('/api/order') || req.url.includes('/api/payment')) {
    Logger.info('request_start', {
      method: req.method,
      url: req.url,
      ip: req.ip,
      requestId: req.headers['x-request-id']
    });
  }
  
  // Capture response
  const originalSend = res.send;
  res.send = function(data) {
    const duration = Date.now() - startTime;
    
    // Log request completion
    Logger.request(req, duration, res.statusCode);
    
    // Call original send
    originalSend.call(this, data);
  };
  
  // Handle errors
  res.on('finish', () => {
    if (res.statusCode >= 400) {
      const duration = Date.now() - startTime;
      Logger.error('request_failed', new Error(`Request failed with status ${res.statusCode}`), {
        method: req.method,
        url: req.url,
        statusCode: res.statusCode,
        duration,
        ip: req.ip,
        requestId: req.headers['x-request-id']
      });
    }
  });
  
  next();
};

/**
 * Quick request logger (lighter version for high-traffic endpoints)
 */
export const quickRequestLogger = (req, res, next) => {
  // Only log errors and slow requests
  const startTime = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    
    // Only log if error or slow
    if (res.statusCode >= 400 || duration > 1000) {
      Logger.request(req, duration, res.statusCode);
    }
  });
  
  next();
};

/**
 * File request logger (for image/static file serving)
 */
export const fileRequestLogger = (req, res, next) => {
  // Very minimal logging for static files
  if (req.url.includes('/uploads') || req.url.includes('/images')) {
    const startTime = Date.now();
    
    res.on('finish', () => {
      // Only log errors or very slow requests
      const duration = Date.now() - startTime;
      if (res.statusCode >= 400 || duration > 3000) {
        Logger.warn('file_request_issue', {
          url: req.url,
          statusCode: res.statusCode,
          duration
        });
      }
    });
  }
  
  next();
};

export default requestLogger;