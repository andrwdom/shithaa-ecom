/**
 * Enterprise-Grade Logging System
 * Similar to what Amazon/Flipkart use for their e-commerce platforms
 * 
 * Features:
 * - Structured JSON logging
 * - Multiple log levels
 * - Request tracing
 * - Performance tracking
 * - Error context
 * - Production-ready
 */

import winston from 'winston';
import { existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Ensure logs directory exists
const logsDir = join(__dirname, '../logs');
if (!existsSync(logsDir)) {
  mkdirSync(logsDir, { recursive: true });
}

// Custom format for better readability
const customFormat = winston.format.printf(({ level, message, timestamp, ...metadata }) => {
  let msg = `${timestamp} [${level}]: ${message}`;
  
  if (Object.keys(metadata).length > 0) {
    msg += ` ${JSON.stringify(metadata)}`;
  }
  
  return msg;
});

// Create Winston logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json()
  ),
  defaultMeta: { 
    service: 'shithaa-backend',
    environment: process.env.NODE_ENV || 'development'
  },
  transports: [
    // Error logs
    new winston.transports.File({ 
      filename: join(logsDir, 'error.log'), 
      level: 'error',
      maxsize: 10485760, // 10MB
      maxFiles: 5,
    }),
    
    // All logs
    new winston.transports.File({ 
      filename: join(logsDir, 'combined.log'),
      maxsize: 10485760, // 10MB
      maxFiles: 10,
    }),
  ],
});

// Add console logging in development
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple(),
      customFormat
    ),
  }));
}

// Structured logging helpers
class Logger {
  /**
   * Log an informational message
   * @param {string} event - Event name (e.g., 'order_created', 'user_login')
   * @param {object} data - Structured data
   */
  static info(event, data = {}) {
    logger.info(event, data);
  }

  /**
   * Log a warning
   * @param {string} event - Event name
   * @param {object} data - Structured data
   */
  static warn(event, data = {}) {
    logger.warn(event, data);
  }

  /**
   * Log an error with full context
   * @param {string} event - Event name
   * @param {Error|string} error - Error object or message
   * @param {object} context - Additional context
   */
  static error(event, error, context = {}) {
    const errorData = {
      message: error.message || error,
      stack: error.stack,
      ...context
    };
    
    logger.error(event, errorData);
  }

  /**
   * Log debug information (only in development)
   * @param {string} event - Event name
   * @param {object} data - Structured data
   */
  static debug(event, data = {}) {
    if (process.env.NODE_ENV !== 'production') {
      logger.debug(event, data);
    }
  }

  /**
   * Log API request
   * @param {object} req - Express request object
   * @param {number} duration - Request duration in ms
   * @param {number} statusCode - Response status code
   */
  static request(req, duration, statusCode) {
    const logData = {
      method: req.method,
      url: req.url,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      duration,
      statusCode,
      requestId: req.headers['x-request-id']
    };

    if (statusCode >= 500) {
      logger.error('request_error', logData);
    } else if (statusCode >= 400) {
      logger.warn('request_warning', logData);
    } else if (duration > 1000) {
      logger.warn('slow_request', logData);
    } else {
      logger.info('request', logData);
    }
  }

  /**
   * Log user activity
   * @param {string} userId - User ID
   * @param {string} action - Action performed
   * @param {object} details - Action details
   */
  static userActivity(userId, action, details = {}) {
    logger.info('user_activity', {
      userId,
      action,
      ...details,
      timestamp: Date.now()
    });
  }

  /**
   * Log order event
   * @param {string} orderId - Order ID
   * @param {string} event - Event type (created, paid, shipped, etc.)
   * @param {object} details - Event details
   */
  static order(orderId, event, details = {}) {
    logger.info('order_event', {
      orderId,
      event,
      ...details,
      timestamp: Date.now()
    });
  }

  /**
   * Log payment event
   * @param {string} paymentId - Payment ID
   * @param {string} event - Event type (initiated, success, failed)
   * @param {object} details - Payment details
   */
  static payment(paymentId, event, details = {}) {
    logger.info('payment_event', {
      paymentId,
      event,
      ...details,
      timestamp: Date.now()
    });
  }

  /**
   * Log performance metric
   * @param {string} metric - Metric name
   * @param {number} value - Metric value
   * @param {object} tags - Additional tags
   */
  static performance(metric, value, tags = {}) {
    logger.info('performance_metric', {
      metric,
      value,
      ...tags,
      timestamp: Date.now()
    });
  }

  /**
   * Log security event
   * @param {string} event - Security event
   * @param {object} details - Event details
   */
  static security(event, details = {}) {
    logger.warn('security_event', {
      event,
      ...details,
      timestamp: Date.now()
    });
  }
}

// Export the logger
export default Logger;
export { logger }; // Export raw winston logger if needed
