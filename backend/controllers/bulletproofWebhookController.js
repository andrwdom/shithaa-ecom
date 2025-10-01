import mongoose from 'mongoose';
import bulletproofOrderService from '../services/bulletproofOrderService.js';
import EnhancedLogger from '../utils/enhancedLogger.js';

/**
 * BULLETPROOF WEBHOOK CONTROLLER
 * This controller ensures webhooks are processed with maximum reliability
 * Multiple failsafe mechanisms to prevent order loss
 */

/**
 * Main webhook endpoint with bulletproof processing
 */
export const bulletproofWebhookHandler = async (req, res) => {
  const correlationId = req.headers['x-request-id'] || `WEBHOOK-${Date.now()}`;
  
  try {
    // Log incoming webhook
    EnhancedLogger.webhookLog('INFO', 'Bulletproof webhook received', {
      correlationId,
      headers: req.headers,
      body: req.body
    });

    // Validate webhook payload
    const { orderId, state, amount, responseCode } = req.body;
    
    if (!orderId) {
      return res.status(400).json({
        success: false,
        message: 'Missing orderId in webhook payload'
      });
    }

    // Determine if payment was successful
    const isSuccess = ['SUCCESS', 'PAYMENT_SUCCESS', 'COMPLETED', 'PAID'].includes(state?.toUpperCase());
    const isFailure = ['FAILED', 'FAILURE', 'CANCELLED', 'TIMEOUT'].includes(state?.toUpperCase());

    if (isSuccess) {
      console.log(`🛡️ [${correlationId}] BULLETPROOF: Processing successful payment for ${orderId}`);
      
      // Use bulletproof order service to confirm order
      const result = await bulletproofOrderService.confirmOrderWithFailsafes(
        orderId,
        req.body,
        correlationId
      );

      if (result.success) {
        console.log(`✅ [${correlationId}] BULLETPROOF: Order confirmed successfully via ${result.method}`);
        
        EnhancedLogger.webhookLog('SUCCESS', 'Order confirmed via bulletproof webhook', {
          correlationId,
          orderId,
          method: result.method,
          attempt: result.attempt || 1
        });

        return res.status(200).json({
          success: true,
          message: 'Order confirmed successfully',
          method: result.method,
          orderId: orderId
        });
      } else {
        console.error(`❌ [${correlationId}] BULLETPROOF: All confirmation strategies failed`);
        
        EnhancedLogger.criticalAlert('WEBHOOK: All confirmation strategies failed', {
          correlationId,
          orderId,
          payload: req.body
        });

        return res.status(500).json({
          success: false,
          message: 'Failed to confirm order after multiple attempts'
        });
      }
    } else if (isFailure) {
      console.log(`❌ [${correlationId}] BULLETPROOF: Processing failed payment for ${orderId}`);
      
      // Handle payment failure
      await bulletproofOrderService.handlePaymentFailure(orderId, req.body, correlationId);
      
      return res.status(200).json({
        success: true,
        message: 'Payment failure processed'
      });
    } else {
      console.log(`⚠️ [${correlationId}] BULLETPROOF: Unknown payment state: ${state}`);
      
      return res.status(200).json({
        success: true,
        message: 'Webhook received but state unknown',
        state: state
      });
    }

  } catch (error) {
    console.error(`💥 [${correlationId}] BULLETPROOF: Webhook processing error:`, error);
    
    EnhancedLogger.criticalAlert('WEBHOOK: Critical processing error', {
      correlationId,
      error: error.message,
      stack: error.stack,
      payload: req.body
    });

    // Even if processing fails, return 200 to prevent webhook retries
    // The reconciliation job will catch and fix any missed orders
    return res.status(200).json({
      success: false,
      message: 'Webhook processing error, will be handled by reconciliation job',
      error: error.message
    });
  }
};

/**
 * Webhook status endpoint for monitoring
 */
export const webhookStatus = async (req, res) => {
  try {
    const stats = await bulletproofOrderService.getOrderStats();
    
    res.json({
      success: true,
      data: {
        ...stats,
        timestamp: new Date(),
        status: 'healthy'
      }
    });
  } catch (error) {
    console.error('Webhook status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get webhook status',
      error: error.message
    });
  }
};

/**
 * Manual order confirmation endpoint (emergency use)
 */
export const manualOrderConfirmation = async (req, res) => {
  const { phonepeTransactionId } = req.body;
  const correlationId = req.headers['x-request-id'] || `MANUAL-${Date.now()}`;
  
  if (!phonepeTransactionId) {
    return res.status(400).json({
      success: false,
      message: 'phonepeTransactionId is required'
    });
  }

  try {
    console.log(`🔧 [${correlationId}] MANUAL: Confirming order ${phonepeTransactionId}`);
    
    const result = await bulletproofOrderService.confirmOrderWithFailsafes(
      phonepeTransactionId,
      { manual: true },
      correlationId
    );

    if (result.success) {
      res.json({
        success: true,
        message: 'Order confirmed successfully',
        method: result.method,
        orderId: phonepeTransactionId
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to confirm order'
      });
    }
  } catch (error) {
    console.error(`❌ [${correlationId}] MANUAL: Confirmation failed:`, error);
    
    res.status(500).json({
      success: false,
      message: 'Manual confirmation failed',
      error: error.message
    });
  }
};

/**
 * Bulk order reconciliation endpoint
 */
export const bulkReconciliation = async (req, res) => {
  const correlationId = req.headers['x-request-id'] || `BULK-${Date.now()}`;
  
  try {
    console.log(`🔄 [${correlationId}] BULK: Starting bulk reconciliation`);
    
    // Trigger reconciliation job
    await bulletproofOrderService.reconcileStuckDraftOrders();
    
    const stats = await bulletproofOrderService.getOrderStats();
    
    res.json({
      success: true,
      message: 'Bulk reconciliation completed',
      stats: stats
    });
  } catch (error) {
    console.error(`❌ [${correlationId}] BULK: Reconciliation failed:`, error);
    
    res.status(500).json({
      success: false,
      message: 'Bulk reconciliation failed',
      error: error.message
    });
  }
};