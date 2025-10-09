/**
 * UNIFIED PAYMENT CONTROLLER
 * 
 * This is the SINGLE entry point for all payment processing.
 * It replaces all other payment controllers to prevent race conditions.
 */

import bulletproofPaymentProcessor from '../services/bulletproofPaymentProcessor.js';
import EnhancedLogger from '../utils/enhancedLogger.js';

/**
 * UNIFIED PHONE PEAK CALLBACK HANDLER
 * 
 * This replaces phonePeCallback, handleAtomicPaymentCallback, and webhook handlers
 */
export const unifiedPhonePeCallback = async (req, res) => {
  const correlationId = req.headers['x-request-id'] || `unified_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  try {
    EnhancedLogger.webhookLog('INFO', 'Unified PhonePe callback received', {
      correlationId,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      body: req.body
    });

    // Extract payment data
    const { merchantTransactionId, state, responseCode, responseMessage } = req.body;
    
    if (!merchantTransactionId) {
      return res.status(400).json({
        success: false,
        message: 'Missing merchant transaction ID',
        correlationId
      });
    }

    // Process payment with bulletproof processor
    const result = await bulletproofPaymentProcessor.processPayment(
      merchantTransactionId,
      {
        state,
        responseCode,
        responseMessage,
        ...req.body
      },
      'callback',
      correlationId
    );

    // Send response based on result
    if (result.success) {
      EnhancedLogger.webhookLog('SUCCESS', 'Unified callback processed successfully', {
        correlationId,
        transactionId: merchantTransactionId,
        action: result.action,
        orderId: result.orderId
      });

      return res.status(200).json({
        success: true,
        message: 'Payment processed successfully',
        correlationId,
        action: result.action,
        orderId: result.orderId
      });
    } else {
      EnhancedLogger.webhookLog('ERROR', 'Unified callback processing failed', {
        correlationId,
        transactionId: merchantTransactionId,
        error: result.message
      });

      return res.status(500).json({
        success: false,
        message: result.message || 'Payment processing failed',
        correlationId
      });
    }

  } catch (error) {
    EnhancedLogger.criticalAlert('UNIFIED_CALLBACK: Processing failed', {
      correlationId,
      error: error.message,
      stack: error.stack,
      body: req.body
    });

    // Always return 200 to prevent PhonePe retries
    return res.status(200).json({
      success: false,
      message: 'Payment processing failed - will retry',
      correlationId
    });
  }
};

/**
 * UNIFIED PHONE PEAK WEBHOOK HANDLER
 * 
 * This replaces all webhook handlers
 */
export const unifiedPhonePeWebhook = async (req, res) => {
  const correlationId = req.headers['x-request-id'] || `webhook_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  try {
    // IMMEDIATE ACKNOWLEDGMENT - Critical for preventing retries
    res.status(200).json({
      success: true,
      message: 'Webhook received and queued for processing',
      correlationId,
      timestamp: new Date().toISOString()
    });

    EnhancedLogger.webhookLog('INFO', 'Unified PhonePe webhook received', {
      correlationId,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      body: req.body
    });

    // Process webhook asynchronously
    setImmediate(async () => {
      try {
        // Extract payment data from webhook payload
        const webhookData = req.body;
        const transactionId = webhookData.payload?.merchantTransactionId || 
                             webhookData.payload?.transactionId ||
                             webhookData.merchantTransactionId ||
                             webhookData.transactionId;

        if (!transactionId) {
          EnhancedLogger.webhookLog('ERROR', 'No transaction ID in webhook', {
            correlationId,
            webhookData
          });
          return;
        }

        // Process payment with bulletproof processor
        const result = await bulletproofPaymentProcessor.processPayment(
          transactionId,
          webhookData.payload || webhookData,
          'webhook',
          correlationId
        );

        EnhancedLogger.webhookLog('SUCCESS', 'Unified webhook processed successfully', {
          correlationId,
          transactionId,
          action: result.action,
          orderId: result.orderId
        });

      } catch (error) {
        EnhancedLogger.criticalAlert('UNIFIED_WEBHOOK: Processing failed', {
          correlationId,
          error: error.message,
          stack: error.stack
        });
      }
    });

  } catch (error) {
    EnhancedLogger.criticalAlert('UNIFIED_WEBHOOK: Handler failed', {
      correlationId,
      error: error.message,
      stack: error.stack
    });

    // Already sent 200, so no response needed
  }
};

/**
 * UNIFIED PAYMENT VERIFICATION
 * 
 * This replaces verifyPhonePePayment
 */
export const unifiedPaymentVerification = async (req, res) => {
  const correlationId = req.headers['x-request-id'] || `verify_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  try {
    const { merchantTransactionId } = req.params;
    
    if (!merchantTransactionId) {
      return res.status(400).json({
        success: false,
        message: 'Missing merchant transaction ID',
        correlationId
      });
    }

    EnhancedLogger.webhookLog('INFO', 'Unified payment verification requested', {
      correlationId,
      transactionId: merchantTransactionId
    });

    // Check if order exists and is confirmed
    const order = await (await import('../models/orderModel.js')).default.findOne({
      phonepeTransactionId: merchantTransactionId
    });

    if (order) {
      if (order.paymentStatus === 'PAID' && order.status === 'CONFIRMED') {
        return res.status(200).json({
          success: true,
          message: 'Payment verified successfully',
          correlationId,
          data: {
            orderId: order._id,
            status: order.status,
            paymentStatus: order.paymentStatus,
            amount: order.total,
            confirmedAt: order.confirmedAt
          }
        });
      } else {
        return res.status(200).json({
          success: false,
          message: 'Payment not yet confirmed',
          correlationId,
          data: {
            orderId: order._id,
            status: order.status,
            paymentStatus: order.paymentStatus
          }
        });
      }
    }

    // If no order found, try to process the payment
    try {
      const result = await bulletproofPaymentProcessor.processPayment(
        merchantTransactionId,
        { state: 'PENDING' }, // Assume pending if no order found
        'verification',
        correlationId
      );

      return res.status(200).json({
        success: result.success,
        message: result.message || 'Payment processing result',
        correlationId,
        data: result
      });

    } catch (processingError) {
      EnhancedLogger.webhookLog('ERROR', 'Payment verification processing failed', {
        correlationId,
        transactionId: merchantTransactionId,
        error: processingError.message
      });

      return res.status(200).json({
        success: false,
        message: 'Payment verification failed',
        correlationId,
        error: processingError.message
      });
    }

  } catch (error) {
    EnhancedLogger.criticalAlert('UNIFIED_VERIFICATION: Processing failed', {
      correlationId,
      error: error.message,
      stack: error.stack
    });

    return res.status(500).json({
      success: false,
      message: 'Payment verification failed',
      correlationId,
      error: error.message
    });
  }
};

/**
 * HEALTH CHECK ENDPOINT
 */
export const paymentHealthCheck = async (req, res) => {
  try {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'unified-payment-processor',
      version: '1.0.0'
    };

    res.status(200).json(health);
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
};
