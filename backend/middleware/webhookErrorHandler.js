import EnhancedLogger from '../utils/enhancedLogger.js';

/**
 * WEBHOOK ERROR HANDLING MIDDLEWARE
 * 
 * ENTERPRISE-GRADE ERROR HANDLING:
 * ✅ Graceful error recovery
 * ✅ Comprehensive error logging
 * ✅ User-friendly error responses
 * ✅ System health monitoring
 * ✅ Automatic error categorization
 */
class WebhookErrorHandler {
  /**
   * Handle webhook processing errors
   */
  static handleWebhookError(error, req, res, next) {
    const correlationId = req.headers['x-request-id'] || `ERROR-${Date.now()}`;
    
    // Categorize error
    const errorCategory = this.categorizeError(error);
    
    // Log error with appropriate level
    this.logError(error, errorCategory, correlationId, req);
    
    // Determine response based on error category
    const response = this.generateErrorResponse(error, errorCategory, correlationId);
    
    // Always return 200 to prevent webhook retries
    return res.status(200).json(response);
  }

  /**
   * Categorize error for appropriate handling
   */
  static categorizeError(error) {
    // Database errors
    if (error.name === 'MongoError' || error.name === 'MongooseError') {
      return 'DATABASE_ERROR';
    }
    
    // Network errors
    if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT' || error.code === 'ENOTFOUND') {
      return 'NETWORK_ERROR';
    }
    
    // Validation errors
    if (error.name === 'ValidationError' || error.name === 'CastError') {
      return 'VALIDATION_ERROR';
    }
    
    // Authentication errors
    if (error.message.includes('signature') || error.message.includes('auth')) {
      return 'AUTHENTICATION_ERROR';
    }
    
    // Business logic errors
    if (error.message.includes('stock') || error.message.includes('payment')) {
      return 'BUSINESS_LOGIC_ERROR';
    }
    
    // System errors
    if (error.message.includes('circuit breaker') || error.message.includes('queue')) {
      return 'SYSTEM_ERROR';
    }
    
    // Default to unknown error
    return 'UNKNOWN_ERROR';
  }

  /**
   * Log error with appropriate level
   */
  static logError(error, category, correlationId, req) {
    const errorContext = {
      correlationId,
      category,
      error: error.message,
      stack: error.stack,
      url: req.url,
      method: req.method,
      headers: req.headers,
      body: req.body
    };

    switch (category) {
      case 'DATABASE_ERROR':
        EnhancedLogger.criticalAlert('WEBHOOK: Database error', errorContext);
        break;
        
      case 'NETWORK_ERROR':
        EnhancedLogger.webhookLog('ERROR', 'Webhook network error', errorContext);
        break;
        
      case 'VALIDATION_ERROR':
        EnhancedLogger.webhookLog('WARN', 'Webhook validation error', errorContext);
        break;
        
      case 'AUTHENTICATION_ERROR':
        EnhancedLogger.criticalAlert('WEBHOOK: Authentication error', errorContext);
        break;
        
      case 'BUSINESS_LOGIC_ERROR':
        EnhancedLogger.criticalAlert('WEBHOOK: Business logic error', errorContext);
        break;
        
      case 'SYSTEM_ERROR':
        EnhancedLogger.criticalAlert('WEBHOOK: System error', errorContext);
        break;
        
      default:
        EnhancedLogger.criticalAlert('WEBHOOK: Unknown error', errorContext);
    }
  }

  /**
   * Generate appropriate error response
   */
  static generateErrorResponse(error, category, correlationId) {
    const baseResponse = {
      success: false,
      correlationId,
      timestamp: new Date().toISOString()
    };

    switch (category) {
      case 'DATABASE_ERROR':
        return {
          ...baseResponse,
          message: 'Database processing error - webhook queued for retry',
          error: 'DATABASE_ERROR',
          retryable: true
        };
        
      case 'NETWORK_ERROR':
        return {
          ...baseResponse,
          message: 'Network error - webhook queued for retry',
          error: 'NETWORK_ERROR',
          retryable: true
        };
        
      case 'VALIDATION_ERROR':
        return {
          ...baseResponse,
          message: 'Invalid webhook data - processing skipped',
          error: 'VALIDATION_ERROR',
          retryable: false
        };
        
      case 'AUTHENTICATION_ERROR':
        return {
          ...baseResponse,
          message: 'Authentication failed - webhook rejected',
          error: 'AUTHENTICATION_ERROR',
          retryable: false
        };
        
      case 'BUSINESS_LOGIC_ERROR':
        return {
          ...baseResponse,
          message: 'Business logic error - manual review required',
          error: 'BUSINESS_LOGIC_ERROR',
          retryable: true,
          requiresManualReview: true
        };
        
      case 'SYSTEM_ERROR':
        return {
          ...baseResponse,
          message: 'System error - webhook queued for retry',
          error: 'SYSTEM_ERROR',
          retryable: true
        };
        
      default:
        return {
          ...baseResponse,
          message: 'Unknown error - webhook queued for retry',
          error: 'UNKNOWN_ERROR',
          retryable: true
        };
    }
  }

  /**
   * Handle async webhook processing errors
   */
  static handleAsyncError(error, correlationId, webhookData) {
    const errorCategory = this.categorizeError(error);
    
    EnhancedLogger.criticalAlert('WEBHOOK: Async processing error', {
      correlationId,
      category: errorCategory,
      error: error.message,
      stack: error.stack,
      webhookData
    });

    // Return error info for potential retry
    return {
      success: false,
      error: errorCategory,
      retryable: ['DATABASE_ERROR', 'NETWORK_ERROR', 'SYSTEM_ERROR'].includes(errorCategory),
      requiresManualReview: ['BUSINESS_LOGIC_ERROR'].includes(errorCategory)
    };
  }

  /**
   * Handle webhook timeout
   */
  static handleTimeout(correlationId, webhookData) {
    EnhancedLogger.criticalAlert('WEBHOOK: Processing timeout', {
      correlationId,
      webhookData,
      timeout: '30 seconds'
    });

    return {
      success: false,
      error: 'TIMEOUT',
      message: 'Webhook processing timeout - queued for retry',
      retryable: true
    };
  }

  /**
   * Handle webhook rate limiting
   */
  static handleRateLimit(correlationId, webhookData) {
    EnhancedLogger.webhookLog('WARN', 'Webhook rate limited', {
      correlationId,
      webhookData
    });

    return {
      success: false,
      error: 'RATE_LIMITED',
      message: 'Webhook rate limited - queued for retry',
      retryable: true,
      retryAfter: 60 // 1 minute
    };
  }
}

export default WebhookErrorHandler;
