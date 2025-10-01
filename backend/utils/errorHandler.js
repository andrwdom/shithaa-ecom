/**
 * Production-Grade Error Handling System
 * Provides structured error handling, logging, and monitoring
 */

import * as Sentry from '@sentry/node';

// Error severity levels
export const ErrorSeverity = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical'
};

// Error categories
export const ErrorCategory = {
  VALIDATION: 'validation',
  BUSINESS_LOGIC: 'business_logic',
  INTEGRATION: 'integration',
  SYSTEM: 'system',
  SECURITY: 'security',
  PERFORMANCE: 'performance'
};

/**
 * Structured Application Error
 */
export class ApplicationError extends Error {
  constructor(message, options = {}) {
    super(message);
    this.name = 'ApplicationError';
    this.statusCode = options.statusCode || 500;
    this.severity = options.severity || ErrorSeverity.MEDIUM;
    this.category = options.category || ErrorCategory.SYSTEM;
    this.context = options.context || {};
    this.userMessage = options.userMessage || 'An error occurred. Please try again.';
    this.canRetry = options.canRetry || false;
    this.correlationId = options.correlationId || null;
    this.timestamp = new Date();
    
    // Capture stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ApplicationError);
    }
  }

  /**
   * Convert to JSON for logging/API responses
   */
  toJSON() {
    return {
      name: this.name,
      message: this.message,
      statusCode: this.statusCode,
      severity: this.severity,
      category: this.category,
      context: this.context,
      userMessage: this.userMessage,
      canRetry: this.canRetry,
      correlationId: this.correlationId,
      timestamp: this.timestamp,
      stack: this.stack
    };
  }

  /**
   * Create user-safe API response
   */
  toAPIResponse() {
    return {
      success: false,
      error: {
        message: this.userMessage,
        code: this.category,
        canRetry: this.canRetry,
        correlationId: this.correlationId,
        timestamp: this.timestamp
      },
      ...(process.env.NODE_ENV === 'development' && {
        debug: {
          originalMessage: this.message,
          context: this.context
        }
      })
    };
  }
}

/**
 * Specific error types for common scenarios
 */
export class ValidationError extends ApplicationError {
  constructor(message, context = {}) {
    super(message, {
      statusCode: 400,
      severity: ErrorSeverity.LOW,
      category: ErrorCategory.VALIDATION,
      userMessage: message,
      canRetry: false,
      context
    });
    this.name = 'ValidationError';
  }
}

export class BusinessLogicError extends ApplicationError {
  constructor(message, context = {}) {
    super(message, {
      statusCode: 400,
      severity: ErrorSeverity.MEDIUM,
      category: ErrorCategory.BUSINESS_LOGIC,
      userMessage: message,
      canRetry: false,
      context
    });
    this.name = 'BusinessLogicError';
  }
}

export class StockError extends ApplicationError {
  constructor(message, context = {}) {
    super(message, {
      statusCode: 400,
      severity: ErrorSeverity.HIGH,
      category: ErrorCategory.BUSINESS_LOGIC,
      userMessage: 'Stock availability issue. Please try again or contact support.',
      canRetry: true,
      context
    });
    this.name = 'StockError';
  }
}

export class PaymentError extends ApplicationError {
  constructor(message, context = {}) {
    super(message, {
      statusCode: 400,
      severity: ErrorSeverity.HIGH,
      category: ErrorCategory.INTEGRATION,
      userMessage: 'Payment processing failed. Please try again.',
      canRetry: true,
      context
    });
    this.name = 'PaymentError';
  }
}

export class SystemError extends ApplicationError {
  constructor(message, context = {}) {
    super(message, {
      statusCode: 500,
      severity: ErrorSeverity.CRITICAL,
      category: ErrorCategory.SYSTEM,
      userMessage: 'System temporarily unavailable. Please try again later.',
      canRetry: true,
      context
    });
    this.name = 'SystemError';
  }
}

/**
 * Error Handler Class
 */
export class ErrorHandler {
  constructor(options = {}) {
    this.enableSentry = options.enableSentry !== false;
    this.enableConsoleLogging = options.enableConsoleLogging !== false;
    this.enableFileLogging = options.enableFileLogging || false;
    this.logFilePath = options.logFilePath || 'logs/errors.log';
  }

  /**
   * Handle and log an error
   */
  handleError(error, context = {}) {
    // Ensure we have an ApplicationError
    const appError = this.normalizeError(error, context);
    
    // Log the error
    this.logError(appError);
    
    // Report to monitoring services
    this.reportError(appError);
    
    return appError;
  }

  /**
   * Convert any error to ApplicationError
   */
  normalizeError(error, context = {}) {
    if (error instanceof ApplicationError) {
      // Add additional context if provided
      error.context = { ...error.context, ...context };
      return error;
    }

    // Handle specific error types
    if (error.name === 'ValidationError') {
      return new ValidationError(error.message, context);
    }

    if (error.name === 'MongoError' || error.name === 'MongoServerError') {
      return new SystemError('Database operation failed', {
        ...context,
        originalError: error.message,
        code: error.code
      });
    }

    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
      return new SystemError('External service unavailable', {
        ...context,
        originalError: error.message,
        code: error.code
      });
    }

    // Default case - create generic ApplicationError
    return new ApplicationError(error.message || 'Unknown error', {
      statusCode: 500,
      severity: ErrorSeverity.MEDIUM,
      category: ErrorCategory.SYSTEM,
      context: {
        ...context,
        originalErrorName: error.name,
        originalStack: error.stack
      }
    });
  }

  /**
   * Log error with structured format
   */
  logError(error) {
    const logData = {
      timestamp: new Date().toISOString(),
      level: this.severityToLogLevel(error.severity),
      message: error.message,
      error: error.toJSON()
    };

    if (this.enableConsoleLogging) {
      const emoji = this.getSeverityEmoji(error.severity);
      const colorCode = this.getSeverityColor(error.severity);
      
      console.error(
        `${emoji} [${error.severity.toUpperCase()}] ${error.category} - ${error.message}`,
        colorCode ? `\x1b[${colorCode}m` : '',
        '\n📋 Context:', JSON.stringify(error.context, null, 2),
        error.correlationId ? `\n🔍 Correlation ID: ${error.correlationId}` : '',
        '\x1b[0m'
      );
    }

    // File logging (if enabled)
    if (this.enableFileLogging) {
      try {
        const fs = require('fs');
        const path = require('path');
        
        const logDir = path.dirname(this.logFilePath);
        if (!fs.existsSync(logDir)) {
          fs.mkdirSync(logDir, { recursive: true });
        }
        
        fs.appendFileSync(this.logFilePath, JSON.stringify(logData) + '\n');
      } catch (fileError) {
        console.error('Failed to write to error log file:', fileError);
      }
    }
  }

  /**
   * Report error to monitoring services
   */
  reportError(error) {
    if (this.enableSentry && error.severity !== ErrorSeverity.LOW) {
      try {
        Sentry.withScope((scope) => {
          scope.setLevel(this.severityToSentryLevel(error.severity));
          scope.setTag('category', error.category);
          scope.setTag('canRetry', error.canRetry);
          
          if (error.correlationId) {
            scope.setTag('correlationId', error.correlationId);
          }
          
          scope.setContext('error_details', error.context);
          
          Sentry.captureException(error);
        });
      } catch (sentryError) {
        console.error('Failed to report error to Sentry:', sentryError);
      }
    }
  }

  severityToLogLevel(severity) {
    const mapping = {
      [ErrorSeverity.LOW]: 'warn',
      [ErrorSeverity.MEDIUM]: 'error',
      [ErrorSeverity.HIGH]: 'error',
      [ErrorSeverity.CRITICAL]: 'error'
    };
    return mapping[severity] || 'error';
  }

  severityToSentryLevel(severity) {
    const mapping = {
      [ErrorSeverity.LOW]: 'warning',
      [ErrorSeverity.MEDIUM]: 'error',
      [ErrorSeverity.HIGH]: 'error',
      [ErrorSeverity.CRITICAL]: 'fatal'
    };
    return mapping[severity] || 'error';
  }

  getSeverityEmoji(severity) {
    const mapping = {
      [ErrorSeverity.LOW]: '⚠️',
      [ErrorSeverity.MEDIUM]: '❌',
      [ErrorSeverity.HIGH]: '🚨',
      [ErrorSeverity.CRITICAL]: '🔥'
    };
    return mapping[severity] || '❌';
  }

  getSeverityColor(severity) {
    const mapping = {
      [ErrorSeverity.LOW]: '33', // yellow
      [ErrorSeverity.MEDIUM]: '31', // red
      [ErrorSeverity.HIGH]: '91', // bright red
      [ErrorSeverity.CRITICAL]: '95' // bright magenta
    };
    return mapping[severity] || '31';
  }
}

// Global error handler instance
export const globalErrorHandler = new ErrorHandler();

/**
 * Express error handling middleware
 */
export const expressErrorHandler = (err, req, res, next) => {
  const correlationId = req.headers['x-request-id'] || req.headers['x-correlation-id'] || 'unknown';
  
  const context = {
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    userAgent: req.headers['user-agent'],
    body: req.method !== 'GET' ? req.body : undefined,
    params: req.params,
    query: req.query,
    correlationId
  };

  const appError = globalErrorHandler.handleError(err, context);
  const response = appError.toAPIResponse();
  
  res.status(appError.statusCode).json(response);
};

/**
 * Async error wrapper for Express routes
 */
export const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Create standardized success response
 */
export const createSuccessResponse = (data, message = 'Success') => {
  return {
    success: true,
    message,
    data,
    timestamp: new Date()
  };
};

/**
 * Helper function to throw structured errors
 */
export const throwError = (message, options = {}) => {
  throw new ApplicationError(message, options);
};

export default { 
  ErrorHandler, 
  ApplicationError, 
  ValidationError, 
  BusinessLogicError, 
  StockError, 
  PaymentError, 
  SystemError,
  globalErrorHandler,
  expressErrorHandler,
  asyncHandler,
  createSuccessResponse,
  throwError
};
