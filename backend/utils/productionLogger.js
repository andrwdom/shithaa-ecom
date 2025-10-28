/**
 * PRODUCTION-GRADE STRUCTURED LOGGER
 * 
 * Similar to what Amazon/Stripe use for payment systems
 * 
 * Features:
 * - Correlation IDs to track requests across systems
 * - Structured JSON format for parsing/alerting
 * - Multiple log levels with file separation
 * - Payment-specific logging with timing
 * - Automatic rotation and size limits
 * - No sensitive data logging
 */

import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure logs directory exists
const logsDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Custom format for structured logging
const structuredFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Console format for development
const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: 'HH:mm:ss.SSS' }),
  winston.format.colorize(),
  winston.format.printf(({ timestamp, level, message, correlationId, ...meta }) => {
    let log = `${timestamp} [${level}]`;
    if (correlationId) log += ` [${correlationId}]`;
    log += `: ${message}`;
    
    // Add important metadata
    if (Object.keys(meta).length > 0) {
      const important = {};
      if (meta.transactionId) important.txn = meta.transactionId;
      if (meta.orderId) important.order = meta.orderId;
      if (meta.path) important.path = meta.path;
      if (meta.duration) important.duration = `${meta.duration}ms`;
      if (Object.keys(important).length > 0) {
        log += ` ${JSON.stringify(important)}`;
      }
    }
    
    return log;
  })
);

// Create transports
const transports = [];

// Console transport (always enabled)
transports.push(
  new winston.transports.Console({
    format: consoleFormat,
    level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug')
  })
);

// Payment logs (CRITICAL - all payment events)
transports.push(
  new DailyRotateFile({
    filename: path.join(logsDir, 'payment-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    maxSize: '50m',
    maxFiles: '30d',
    format: structuredFormat,
    level: 'debug'
  })
);

// Webhook logs (track all webhook activity)
transports.push(
  new DailyRotateFile({
    filename: path.join(logsDir, 'webhook-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    maxSize: '50m',
    maxFiles: '30d',
    format: structuredFormat,
    level: 'debug'
  })
);

// Error logs (all errors)
transports.push(
  new DailyRotateFile({
    filename: path.join(logsDir, 'error-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    maxSize: '50m',
    maxFiles: '30d',
    format: structuredFormat,
    level: 'error'
  })
);

// Critical alerts (payments stuck, race conditions detected)
transports.push(
  new DailyRotateFile({
    filename: path.join(logsDir, 'critical-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    maxSize: '50m',
    maxFiles: '90d', // Keep critical logs for 90 days
    format: structuredFormat,
    level: 'error'
  })
);

// All logs combined
transports.push(
  new DailyRotateFile({
    filename: path.join(logsDir, 'combined-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    maxSize: '100m',
    maxFiles: '14d',
    format: structuredFormat
  })
);

// Create logger instance
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'debug',
  format: structuredFormat,
  defaultMeta: {
    service: 'shithaa-backend',
    environment: process.env.NODE_ENV || 'development',
    hostname: process.env.HOSTNAME || 'unknown',
    pid: process.pid
  },
  transports
});

// Helper to generate correlation ID
function generateCorrelationId(prefix = 'corr') {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Helper to redact sensitive data
function redactSensitive(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  
  const sensitiveKeys = [
    'password', 'secret', 'key', 'token', 'jwt', 'api_key', 'auth',
    'authorization', 'salt', 'hash', 'phonepeApiKey', 'merchantKey'
  ];
  
  const redacted = Array.isArray(obj) ? [...obj] : { ...obj };
  
  for (const key in redacted) {
    if (sensitiveKeys.some(sensitive => key.toLowerCase().includes(sensitive))) {
      redacted[key] = '***REDACTED***';
    } else if (typeof redacted[key] === 'object' && redacted[key] !== null) {
      redacted[key] = redactSensitive(redacted[key]);
    }
  }
  
  return redacted;
}

/**
 * Production Logger Class
 */
class ProductionLogger {
  /**
   * Log payment event with correlation tracking
   */
  payment(level, message, data = {}) {
    const logData = {
      ...redactSensitive(data),
      logType: 'PAYMENT',
      timestamp: new Date().toISOString()
    };
    
    logger.log(level, `[PAYMENT] ${message}`, logData);
  }

  /**
   * Log webhook event with path tracking
   */
  webhook(level, message, data = {}) {
    const logData = {
      ...redactSensitive(data),
      logType: 'WEBHOOK',
      timestamp: new Date().toISOString()
    };
    
    logger.log(level, `[WEBHOOK] ${message}`, logData);
  }

  /**
   * Log order state transition
   */
  orderTransition(orderId, fromState, toState, data = {}) {
    const logData = {
      ...redactSensitive(data),
      logType: 'ORDER_TRANSITION',
      orderId,
      fromState,
      toState,
      timestamp: new Date().toISOString()
    };
    
    logger.info(`[ORDER_TRANSITION] ${orderId}: ${fromState} → ${toState}`, logData);
  }

  /**
   * Track race condition detection
   */
  raceConditionDetected(transactionId, path, data = {}) {
    const logData = {
      ...redactSensitive(data),
      logType: 'RACE_CONDITION',
      transactionId,
      path,
      timestamp: new Date().toISOString()
    };
    
    logger.error(`[RACE_CONDITION] Detected for ${transactionId} at path ${path}`, logData);
    
    // Also log to critical
    this.critical(`Race condition detected: ${transactionId} at ${path}`, logData);
  }

  /**
   * Critical alert (sent to monitoring)
   */
  critical(message, data = {}) {
    const logData = {
      ...redactSensitive(data),
      logType: 'CRITICAL',
      timestamp: new Date().toISOString(),
      alertLevel: 'CRITICAL'
    };
    
    logger.error(`[CRITICAL] ${message}`, logData);
    
    // In production, this could trigger PagerDuty/Slack alerts
    if (process.env.NODE_ENV === 'production') {
      console.error(`🚨 CRITICAL ALERT: ${message}`);
    }
  }

  /**
   * Track payment path execution
   */
  trackPath(correlationId, path, transactionId, action, data = {}) {
    const logData = {
      correlationId,
      path,
      transactionId,
      action,
      ...redactSensitive(data),
      logType: 'PATH_TRACKING',
      timestamp: new Date().toISOString()
    };
    
    logger.info(`[PATH] ${path} - ${action}`, logData);
  }

  /**
   * Track timing for performance monitoring
   */
  trackTiming(operation, duration, data = {}) {
    const logData = {
      ...redactSensitive(data),
      operation,
      duration,
      logType: 'TIMING',
      timestamp: new Date().toISOString()
    };
    
    const level = duration > 3000 ? 'warn' : duration > 1000 ? 'info' : 'debug';
    logger.log(level, `[TIMING] ${operation} took ${duration}ms`, logData);
  }

  /**
   * Standard logging methods
   */
  debug(message, data = {}) {
    logger.debug(message, redactSensitive(data));
  }

  info(message, data = {}) {
    logger.info(message, redactSensitive(data));
  }

  warn(message, data = {}) {
    logger.warn(message, redactSensitive(data));
  }

  error(message, error = null, data = {}) {
    const errorData = {
      ...redactSensitive(data),
      error: error ? {
        message: error.message,
        stack: error.stack,
        name: error.name,
        code: error.code
      } : null
    };
    
    logger.error(message, errorData);
  }

  /**
   * Helper to create child logger with correlation ID
   */
  child(correlationId) {
    return {
      correlationId,
      payment: (level, message, data = {}) => 
        this.payment(level, message, { ...data, correlationId }),
      webhook: (level, message, data = {}) => 
        this.webhook(level, message, { ...data, correlationId }),
      trackPath: (path, transactionId, action, data = {}) =>
        this.trackPath(correlationId, path, transactionId, action, data),
      info: (message, data = {}) => 
        this.info(message, { ...data, correlationId }),
      warn: (message, data = {}) => 
        this.warn(message, { ...data, correlationId }),
      error: (message, error = null, data = {}) => 
        this.error(message, error, { ...data, correlationId }),
      debug: (message, data = {}) => 
        this.debug(message, { ...data, correlationId })
    };
  }
}

// Export singleton instance
const productionLogger = new ProductionLogger();

export default productionLogger;
export { generateCorrelationId, ProductionLogger };

