import orderModel from '../models/orderModel.js';
import PaymentSession from '../models/paymentSessionModel.js';
import CheckoutSession from '../models/CheckoutSession.js';
import RawWebhook from '../models/RawWebhook.js';
import crypto from 'crypto';
import { releaseStockReservation, confirmStockReservation } from '../utils/stock.js';
import { commitOrder } from './orderCommit.js';
import EnhancedLogger from '../utils/enhancedLogger.js';
import mongoose from 'mongoose';

/**
 * BULLETPROOF WEBHOOK SERVICE
 * - Guaranteed payment capture with multiple failsafe mechanisms
 * - Automatic retries with exponential backoff
 * - Zero payment loss tolerance
 * - Comprehensive error handling and monitoring
 */
class BulletproofWebhookService {
  constructor() {
    this.maxRetries = 5;
    this.baseDelay = 1000; // 1 second
    this.maxDelay = 300000; // 5 minutes
  }

  /**
   * Process webhook with comprehensive failsafe mechanisms
   */
  async processWebhook(webhookPayload, correlationId, attempt = 1) {
    try {
      EnhancedLogger.webhookLog('INFO', `Processing webhook attempt ${attempt}`, {
        correlationId,
        attempt,
        maxRetries: this.maxRetries,
        orderId: webhookPayload.orderId
      });

      const result = await this.handleWebhookWithTransaction(webhookPayload, correlationId);
      
      EnhancedLogger.webhookLog('SUCCESS', 'Webhook processed successfully', {
        correlationId,
        attempt,
        result: result.action,
        orderId: result.orderId
      });
      
      return result;
      
    } catch (error) {
      EnhancedLogger.webhookLog('ERROR', `Webhook processing failed (attempt ${attempt})`, {
        correlationId,
        attempt,
        error: error.message,
        orderId: webhookPayload.orderId
      });

      if (attempt < this.maxRetries) {
        const delay = Math.min(this.baseDelay * Math.pow(2, attempt - 1), this.maxDelay);
        
        EnhancedLogger.webhookLog('INFO', `Retrying webhook in ${delay}ms`, {
          correlationId,
          nextAttempt: attempt + 1,
          delay
        });
        
        await this.sleep(delay);
        return this.processWebhook(webhookPayload, correlationId, attempt + 1);
        
      } else {
        await this.handleFinalFailure(webhookPayload, correlationId, error);
        throw error;
      }
    }
  }

  /**
   * Handle webhook processing within MongoDB transaction
   */
  async handleWebhookWithTransaction(webhookPayload, correlationId) {
    const session = await mongoose.startSession();
    session.startTransaction();
    
    try {
      const result = await this.processPaymentWebhook(webhookPayload, correlationId, session);
      await session.commitTransaction();
      return result;
      
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  /**
   * Core payment webhook processing with multiple recovery strategies
   */
  async processPaymentWebhook(webhookData, correlationId, session) {
    const { orderId, isSuccess, isFailure, state } = webhookData;

    EnhancedLogger.webhookLog('INFO', 'Processing payment webhook', {
      correlationId,
      orderId,
      state,
      isSuccess,
      isFailure
    });

    if (isSuccess) {
      return await this.handlePaymentSuccess(orderId, webhookData, correlationId, session);
    } else if (isFailure) {
      return await this.handlePaymentFailure(orderId, webhookData, correlationId, session);
    } else {
      EnhancedLogger.webhookLog('WARN', 'Unknown payment state', {
        correlationId,
        orderId,
        state
      });
      return { action: 'ignored', reason: 'unknown_state', state, orderId };
    }
  }

  /**
   * Handle successful payment with multiple failsafe strategies
   */
  async handlePaymentSuccess(orderId, webhookData, correlationId, session) {
    // Strategy 1: Find and confirm draft order (primary path)
    let order = await orderModel.findOne({ 
      phonepeTransactionId: orderId,
      status: 'DRAFT'
    }).session(session);

    if (order) {
      return await this.confirmDraftOrder(order, webhookData, correlationId, session);
    }

    // Strategy 2: Check if already confirmed (idempotency)
    order = await orderModel.findOne({ 
      phonepeTransactionId: orderId,
      paymentStatus: 'PAID'
    }).session(session);

    if (order) {
      EnhancedLogger.webhookLog('INFO', 'Order already confirmed - idempotent processing', {
        correlationId,
        orderId: order._id,
        phonepeTransactionId: orderId
      });
      return { action: 'already_confirmed', orderId: order._id, phonepeTransactionId: orderId };
    }

    // Strategy 3: Create from payment session (fallback)
    const paymentSession = await PaymentSession.findOne({
      phonepeTransactionId: orderId
    }).session(session);

    if (paymentSession) {
      return await this.createOrderFromPaymentSession(paymentSession, webhookData, correlationId, session);
    }

    // Strategy 4: Create from checkout session (backup)
    const checkoutSession = await CheckoutSession.findOne({
      'payment.phonepeTransactionId': orderId
    }).session(session);

    if (checkoutSession) {
      return await this.createOrderFromCheckoutSession(checkoutSession, webhookData, correlationId, session);
    }

    // Strategy 5: Emergency order creation (prevent payment loss)
    EnhancedLogger.criticalAlert('WEBHOOK: No matching order/session found - creating emergency order', {
      correlationId,
      phonepeTransactionId: orderId,
      amount: webhookData.amount
    });

    return await this.createEmergencyOrder(orderId, webhookData, correlationId, session);
  }

  /**
   * Confirm draft order and stock reservations using atomic commitOrder
   */
  async confirmDraftOrder(order, webhookData, correlationId, session) {
    try {
      // Use the atomic commitOrder service for stock deduction
      const paymentInfo = {
        phonepeTransactionId: webhookData.orderId,
        transactionId: webhookData.orderId,
        amount: webhookData.amount,
        status: webhookData.state,
        rawPayload: webhookData.fullPayload || webhookData
      };

      const commitResult = await commitOrder(
        order._id,
        paymentInfo,
        { session, correlationId }
      );

      EnhancedLogger.webhookLog('SUCCESS', 'Draft order confirmed with atomic commit', {
        correlationId,
        orderId: order._id,
        phonepeTransactionId: order.phonepeTransactionId,
        userEmail: order.userInfo?.email,
        commitResult
      });

      return { 
        action: 'order_confirmed', 
        orderId: order._id,
        phonepeTransactionId: order.phonepeTransactionId,
        stockConfirmed: commitResult.stockDeducted,
        stockResults: commitResult.stockResults
      };

    } catch (error) {
      EnhancedLogger.criticalAlert('WEBHOOK: Order commit failed', {
        correlationId,
        orderId: order._id,
        phonepeTransactionId: order.phonepeTransactionId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Create order from payment session (fallback recovery)
   */
  async createOrderFromPaymentSession(paymentSession, webhookData, correlationId, session) {
    const checkoutSession = await CheckoutSession.findById(paymentSession.checkoutSessionId).session(session);
    
    if (!checkoutSession) {
      throw new Error(`Checkout session not found: ${paymentSession.checkoutSessionId}`);
    }

    const orderData = {
      orderId: `WEBHOOK-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      phonepeTransactionId: webhookData.orderId,
      status: 'CONFIRMED',
      paymentStatus: 'PAID',
      items: checkoutSession.items || [],
      userInfo: checkoutSession.userInfo || paymentSession.userInfo || {},
      shippingInfo: checkoutSession.shippingInfo || paymentSession.shippingInfo || {},
      orderSummary: checkoutSession.orderSummary || {},
      total: webhookData.amount ? webhookData.amount / 100 : checkoutSession.orderSummary?.total || 0,
      paymentMethod: 'PhonePe',
      createdAt: new Date(),
      confirmedAt: new Date(),
      webhookProcessedAt: new Date(),
      webhookData: webhookData.fullPayload,
      meta: {
        source: 'webhook_recovery_payment_session',
        correlationId,
        paymentSessionId: paymentSession._id,
        checkoutSessionId: checkoutSession._id,
        recoveryMethod: 'payment_session_fallback'
      }
    };

    const order = await orderModel.create([orderData], { session });
    
    // Use atomic commitOrder for stock deduction
    const paymentInfo = {
      phonepeTransactionId: webhookData.orderId,
      transactionId: webhookData.orderId,
      amount: webhookData.amount,
      status: webhookData.state,
      rawPayload: webhookData.fullPayload || webhookData
    };

    const commitResult = await commitOrder(
      order[0]._id,
      paymentInfo,
      { session, correlationId }
    );

    EnhancedLogger.webhookLog('SUCCESS', 'Order created from payment session with atomic commit', {
      correlationId,
      orderId: order[0]._id,
      phonepeTransactionId: webhookData.orderId,
      paymentSessionId: paymentSession._id,
      commitResult
    });

    return { 
      action: 'order_recovered_from_payment_session', 
      orderId: order[0]._id,
      phonepeTransactionId: webhookData.orderId,
      recoveryMethod: 'payment_session',
      stockConfirmed: commitResult.stockDeducted
    };
  }

  /**
   * Create order from checkout session (backup recovery)
   */
  async createOrderFromCheckoutSession(checkoutSession, webhookData, correlationId, session) {
    const orderData = {
      orderId: `CHECKOUT-WEBHOOK-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      phonepeTransactionId: webhookData.orderId,
      status: 'CONFIRMED',
      paymentStatus: 'PAID',
      items: checkoutSession.items || [],
      userInfo: checkoutSession.userInfo || {},
      shippingInfo: checkoutSession.shippingInfo || {},
      orderSummary: checkoutSession.orderSummary || {},
      total: webhookData.amount ? webhookData.amount / 100 : checkoutSession.orderSummary?.total || 0,
      paymentMethod: 'PhonePe',
      createdAt: new Date(),
      confirmedAt: new Date(),
      webhookProcessedAt: new Date(),
      webhookData: webhookData.fullPayload,
      meta: {
        source: 'webhook_recovery_checkout_session',
        correlationId,
        checkoutSessionId: checkoutSession._id,
        recoveryMethod: 'checkout_session_fallback'
      }
    };

    const order = await orderModel.create([orderData], { session });
    
    // Use atomic commitOrder for stock deduction
    const paymentInfo = {
      phonepeTransactionId: webhookData.orderId,
      transactionId: webhookData.orderId,
      amount: webhookData.amount,
      status: webhookData.state,
      rawPayload: webhookData.fullPayload || webhookData
    };

    const commitResult = await commitOrder(
      order[0]._id,
      paymentInfo,
      { session, correlationId }
    );

    EnhancedLogger.webhookLog('SUCCESS', 'Order created from checkout session with atomic commit', {
      correlationId,
      orderId: order[0]._id,
      phonepeTransactionId: webhookData.orderId,
      checkoutSessionId: checkoutSession._id,
      commitResult
    });

    return { 
      action: 'order_recovered_from_checkout_session', 
      orderId: order[0]._id,
      phonepeTransactionId: webhookData.orderId,
      recoveryMethod: 'checkout_session',
      stockConfirmed: commitResult.stockDeducted
    };
  }

  /**
   * Emergency order creation to prevent payment loss
   */
  async createEmergencyOrder(phonepeTransactionId, webhookData, correlationId, session) {
    const orderData = {
      orderId: `EMERGENCY-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      phonepeTransactionId,
      status: 'CONFIRMED',
      paymentStatus: 'PAID',
      total: webhookData.amount ? webhookData.amount / 100 : 0,
      items: [], // Will be filled manually by admin
      userInfo: {
        email: 'emergency@shithaa.in',
        name: 'Emergency Recovery Order'
      },
      shippingInfo: {
        fullName: 'EMERGENCY ORDER - REQUIRES MANUAL PROCESSING',
        email: 'emergency@shithaa.in',
        phone: '0000000000',
        addressLine1: 'Emergency Recovery Order',
        city: 'Manual Processing',
        state: 'Emergency',
        postalCode: '000000',
        country: 'India'
      },
      paymentMethod: 'PhonePe',
      createdAt: new Date(),
      confirmedAt: new Date(),
      webhookProcessedAt: new Date(),
      webhookData: webhookData.fullPayload,
      meta: {
        source: 'emergency_webhook_recovery',
        correlationId,
        requiresManualProcessing: true,
        emergencyReason: 'PAYMENT_CAPTURED_NO_ORDER_CONTEXT',
        alert: 'REQUIRES IMMEDIATE MANUAL INTERVENTION'
      }
    };

    const order = await orderModel.create([orderData], { session });
    
    EnhancedLogger.criticalAlert('WEBHOOK: EMERGENCY ORDER CREATED - MANUAL PROCESSING REQUIRED', {
      correlationId,
      orderId: order[0]._id,
      phonepeTransactionId,
      amount: webhookData.amount,
      message: 'Payment captured but no order context found. IMMEDIATE manual intervention required.'
    });

    return { 
      action: 'emergency_order_created', 
      orderId: order[0]._id,
      phonepeTransactionId,
      requiresManualProcessing: true,
      alert: 'CRITICAL_MANUAL_INTERVENTION_REQUIRED'
    };
  }

  /**
   * Handle payment failure
   */
  async handlePaymentFailure(orderId, webhookData, correlationId, session) {
    const order = await orderModel.findOne({ 
      phonepeTransactionId: orderId,
      status: 'DRAFT'
    }).session(session);

    if (order) {
      // Cancel order and release stock
      order.status = 'CANCELLED';
      order.paymentStatus = 'FAILED';
      order.cancelledAt = new Date();
      order.cancellationReason = `Payment failed: ${webhookData.state}`;
      order.webhookProcessedAt = new Date();
      
      if (webhookData.fullPayload) {
        order.webhookData = webhookData.fullPayload;
      }
      
      await order.save({ session });

      // Release all stock reservations
      if (order.items) {
        for (const item of order.items) {
          await releaseStockReservation(item.productId, item.size, item.quantity, { session });
        }
      }

      EnhancedLogger.webhookLog('INFO', 'Order cancelled due to payment failure', {
        correlationId,
        orderId: order._id,
        phonepeTransactionId: orderId,
        failureReason: webhookData.state
      });

      return { 
        action: 'order_cancelled', 
        orderId: order._id,
        phonepeTransactionId: orderId,
        reason: webhookData.state
      };
    }

    // No order found for failure - log but don't error
    EnhancedLogger.webhookLog('WARN', 'Payment failure webhook for non-existent order', {
      correlationId,
      phonepeTransactionId: orderId,
      state: webhookData.state
    });

    return { 
      action: 'failure_ignored', 
      reason: 'no_matching_order',
      phonepeTransactionId: orderId,
      state: webhookData.state
    };
  }

  /**
   * Handle final processing failure
   */
  async handleFinalFailure(webhookData, correlationId, error) {
    EnhancedLogger.criticalAlert('WEBHOOK: FINAL PROCESSING FAILURE - MANUAL INTERVENTION REQUIRED', {
      correlationId,
      error: error.message,
      orderId: webhookData.orderId,
      attempts: this.maxRetries,
      webhookData: webhookData.fullPayload,
      criticality: 'MAXIMUM',
      action_required: 'IMMEDIATE_MANUAL_REVIEW'
    });

    // If successful payment failed to process, create emergency order
    if (webhookData.isSuccess) {
      try {
        const session = await mongoose.startSession();
        session.startTransaction();
        
        await this.createEmergencyOrder(webhookData.orderId, webhookData, correlationId, session);
        await session.commitTransaction();
        session.endSession();
        
      } catch (emergencyError) {
        EnhancedLogger.criticalAlert('WEBHOOK: EMERGENCY ORDER CREATION ALSO FAILED - PAYMENT LOSS IMMINENT', {
          correlationId,
          originalError: error.message,
          emergencyError: emergencyError.message,
          phonepeTransactionId: webhookData.orderId,
          criticality: 'CATASTROPHIC'
        });
      }
    }
  }

  /**
   * Utility: Sleep for specified milliseconds
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export default BulletproofWebhookService;
