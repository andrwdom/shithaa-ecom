/**
 * BULLETPROOF PAYMENT PROCESSOR
 * 
 * This is the SINGLE source of truth for all payment processing.
 * It handles all payment scenarios with multiple fallback strategies.
 */

import mongoose from 'mongoose';
import orderModel from '../models/orderModel.js';
import productModel from '../models/productModel.js';
import PaymentSession from '../models/PaymentSession.js';
import CheckoutSession from '../models/CheckoutSession.js';
import { confirmStockReservation } from '../utils/stock.js';
import EnhancedLogger from '../utils/enhancedLogger.js';
import redisService from '../services/redisService.js';
import crypto from 'crypto';

class BulletproofPaymentProcessor {
  constructor() {
    this.maxRetries = 5;
    this.retryDelay = 1000; // 1 second
  }

  /**
   * MAIN ENTRY POINT: Process any payment with bulletproof reliability
   */
  async processPayment(transactionId, paymentData, source = 'unknown', correlationId = 'SYSTEM') {
    const startTime = Date.now();
    const lockKey = `lock:payment:${transactionId}`;
    const lockToken = crypto.randomUUID();
    let lockAcquired = false;
    
    try {
      // Distributed lock to prevent parallel processing across multiple paths/workers
      if (redisService && redisService.client) {
        try {
          // NX PX 30000 → acquire for 30s, best-effort
          const setResp = await redisService.client.set(lockKey, lockToken, { NX: true, PX: 30000 });
          lockAcquired = setResp === 'OK';
        } catch {}
      }

      if (!lockAcquired) {
        EnhancedLogger.webhookLog('WARN', 'Payment processing skipped due to active lock', {
          correlationId,
          transactionId,
          source
        });
        return {
          success: true,
          action: 'locked_skip',
          transactionId,
          message: 'Another worker is processing this payment'
        };
      }

      EnhancedLogger.webhookLog('INFO', 'Bulletproof payment processing started', {
        correlationId,
        transactionId,
        source,
        paymentState: paymentData.state,
        amount: paymentData.amount
      });

      // 1. IDEMPOTENCY CHECK - Prevent duplicate processing
      const existingOrder = await this.checkExistingOrder(transactionId, correlationId);
      if (existingOrder) {
        return this.handleExistingOrder(existingOrder, correlationId);
      }

      // 2. DETERMINE PAYMENT STATUS
      const paymentStatus = this.determinePaymentStatus(paymentData);
      EnhancedLogger.webhookLog('INFO', 'Payment status determined', {
        correlationId,
        transactionId,
        paymentStatus,
        rawData: paymentData
      });

      if (paymentStatus === 'SUCCESS') {
        return await this.handleSuccessfulPayment(transactionId, paymentData, source, correlationId);
      } else if (paymentStatus === 'FAILED') {
        return await this.handleFailedPayment(transactionId, paymentData, source, correlationId);
      } else {
        return await this.handlePendingPayment(transactionId, paymentData, source, correlationId);
      }

    } catch (error) {
      const processingTime = Date.now() - startTime;
      EnhancedLogger.criticalAlert('PAYMENT: Processing failed', {
        correlationId,
        transactionId,
        source,
        error: error.message,
        processingTime,
        stack: error.stack
      });
      
      // Try emergency recovery
      return await this.emergencyRecovery(transactionId, paymentData, source, correlationId, error);
    } finally {
      // Release lock if we own it (best-effort compare and delete)
      if (lockAcquired && redisService && redisService.client) {
        try {
          const current = await redisService.client.get(lockKey);
          if (current === lockToken) {
            await redisService.client.del(lockKey);
          }
        } catch {}
      }
    }
  }

  /**
   * Check if order already exists (idempotency)
   */
  async checkExistingOrder(transactionId, correlationId) {
    const existingOrder = await orderModel.findOne({
      phonepeTransactionId: transactionId
    });

    if (existingOrder) {
      EnhancedLogger.webhookLog('INFO', 'Existing order found - idempotent processing', {
        correlationId,
        transactionId,
        orderId: existingOrder._id,
        status: existingOrder.status,
        paymentStatus: existingOrder.paymentStatus
      });
    }

    return existingOrder;
  }

  /**
   * Handle existing order (idempotency)
   */
  handleExistingOrder(order, correlationId) {
    if (order.paymentStatus === 'PAID' && order.status === 'CONFIRMED') {
      return {
        success: true,
        action: 'already_confirmed',
        orderId: order._id,
        message: 'Order already confirmed'
      };
    }

    // If order exists but not confirmed, try to confirm it
    return {
      success: true,
      action: 'needs_confirmation',
      orderId: order._id,
      message: 'Order exists but needs confirmation'
    };
  }

  /**
   * Determine payment status from PhonePe response
   */
  determinePaymentStatus(paymentData) {
    const state = (paymentData.state || '').toString().toUpperCase();
    const responseCode = (paymentData.responseCode || '').toString();
    const code = (paymentData.code || '').toString().toUpperCase();

    // Success indicators
    const successIndicators = [
      state === 'PAID',
      state === 'COMPLETED',
      state === 'SUCCESS',
      state === 'SUCCESSFUL',
      state === 'CAPTURED',
      responseCode === 'SUCCESS',
      responseCode === '000',
      code === 'PAYMENT_SUCCESS',
      code === 'SUCCESS',
      (responseCode && responseCode.startsWith('00')),
      (code && code.startsWith('00'))
    ];

    // Failure indicators
    const failureIndicators = [
      state === 'FAILED',
      state === 'CANCELLED',
      state === 'TIMEOUT',
      state === 'DECLINED',
      responseCode === 'PAYMENT_ERROR',
      responseCode === 'PAYMENT_CANCELLED',
      responseCode === 'PAYMENT_TIMEOUT',
      code === 'PAYMENT_FAILED',
      code === 'PAYMENT_CANCELLED'
    ];

    if (successIndicators.some(indicator => indicator)) {
      return 'SUCCESS';
    } else if (failureIndicators.some(indicator => indicator)) {
      return 'FAILED';
    } else {
      return 'PENDING';
    }
  }

  /**
   * Handle successful payment with multiple strategies
   */
  async handleSuccessfulPayment(transactionId, paymentData, source, correlationId) {
    const session = await mongoose.startSession();
    
    try {
      await session.withTransaction(async () => {
        // Strategy 1: Find and confirm draft order
        let order = await orderModel.findOne({
          phonepeTransactionId: transactionId,
          status: { $in: ['DRAFT', 'draft', 'Pending', 'PENDING'] }
        }).session(session);

        if (order) {
          return await this.confirmDraftOrder(order, paymentData, correlationId, session);
        }

        // Strategy 2: Create from payment session
        const paymentSession = await PaymentSession.findOne({
          phonepeTransactionId: transactionId
        }).session(session);

        if (paymentSession) {
          return await this.createOrderFromPaymentSession(paymentSession, paymentData, correlationId, session);
        }

        // Strategy 3: Create from checkout session
        const checkoutSession = await CheckoutSession.findOne({
          'payment.phonepeTransactionId': transactionId
        }).session(session);

        if (checkoutSession) {
          return await this.createOrderFromCheckoutSession(checkoutSession, paymentData, correlationId, session);
        }

        // Strategy 4: Emergency order creation
        EnhancedLogger.criticalAlert('PAYMENT: No matching order/session found - creating emergency order', {
          correlationId,
          transactionId,
          source,
          amount: paymentData.amount
        });

        return await this.createEmergencyOrder(transactionId, paymentData, correlationId, session);
      });

    } catch (error) {
      EnhancedLogger.criticalAlert('PAYMENT: Successful payment handling failed', {
        correlationId,
        transactionId,
        error: error.message,
        stack: error.stack
      });
      throw error;
    } finally {
      await session.endSession();
    }
  }

  /**
   * Confirm draft order with bulletproof stock handling
   */
  async confirmDraftOrder(order, paymentData, correlationId, session) {
    try {
      EnhancedLogger.webhookLog('INFO', 'Confirming draft order', {
        correlationId,
        orderId: order._id,
        transactionId: order.phonepeTransactionId
      });

      // Get items to process
      const itemsToProcess = order.cartItems && order.cartItems.length > 0 
        ? order.cartItems 
        : order.items;

      if (!itemsToProcess || itemsToProcess.length === 0) {
        throw new Error('Order has no items to process');
      }

      // Process stock confirmation with enhanced logic
      for (const item of itemsToProcess) {
        const productId = item.productId || item._id || item.id || item.product;
        
        if (!productId || !item.size || !item.quantity) {
          throw new Error(`Invalid item data: ${JSON.stringify(item)}`);
        }

        // Enhanced stock confirmation
        const stockConfirmed = await this.confirmStockWithFallback(
          productId, 
          item.size, 
          item.quantity, 
          correlationId, 
          session
        );
        
        if (!stockConfirmed) {
          throw new Error(`Stock confirmation failed for ${item.name} (${item.size})`);
        }
      }

      // Update order status
      await orderModel.findByIdAndUpdate(
        order._id,
        {
          status: 'CONFIRMED',
          orderStatus: 'CONFIRMED',
          paymentStatus: 'PAID',
          stockConfirmed: true,
          stockConfirmedAt: new Date(),
          confirmedAt: new Date(),
          paidAt: new Date(),
          phonepeResponse: paymentData,
          updatedAt: new Date()
        },
        { session }
      );

      EnhancedLogger.webhookLog('SUCCESS', 'Draft order confirmed successfully', {
        correlationId,
        orderId: order._id,
        transactionId: order.phonepeTransactionId
      });

      return {
        success: true,
        action: 'draft_confirmed',
        orderId: order._id,
        transactionId: order.phonepeTransactionId
      };

    } catch (error) {
      EnhancedLogger.criticalAlert('PAYMENT: Draft order confirmation failed', {
        correlationId,
        orderId: order._id,
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  /**
   * Enhanced stock confirmation with multiple fallback strategies
   */
  async confirmStockWithFallback(productId, size, quantity, correlationId, session) {
    try {
      // Strategy 1: Standard atomic confirmation
      const standardResult = await confirmStockReservation(productId, size, quantity, { session });
      if (standardResult) {
        return true;
      }

      // Strategy 2: Check if product exists and has stock
      const product = await productModel.findById(productId).session(session);
      if (!product) {
        EnhancedLogger.webhookLog('ERROR', 'Product not found for stock confirmation', {
          correlationId,
          productId,
          size,
          quantity
        });
        return false;
      }

      const sizeObj = product.sizes.find(s => s.size === size);
      if (!sizeObj) {
        EnhancedLogger.webhookLog('ERROR', 'Size not found for stock confirmation', {
          correlationId,
          productId,
          size,
          quantity,
          availableSizes: product.sizes.map(s => s.size)
        });
        return false;
      }

      // Strategy 3: Force confirmation if stock exists (emergency fallback)
      if (sizeObj.stock >= quantity) {
        EnhancedLogger.webhookLog('WARN', 'Using emergency stock confirmation', {
          correlationId,
          productId,
          size,
          quantity,
          currentStock: sizeObj.stock,
          currentReserved: sizeObj.reserved
        });

        // Force stock deduction
        await productModel.updateOne(
          { _id: productId, 'sizes.size': size },
          { 
            $inc: { 
              'sizes.$.stock': -quantity,
              'sizes.$.reserved': -Math.min(quantity, sizeObj.reserved)
            }
          },
          { session }
        );

        return true;
      }

      EnhancedLogger.webhookLog('ERROR', 'Insufficient stock for confirmation', {
        correlationId,
        productId,
        size,
        quantity,
        availableStock: sizeObj.stock,
        reserved: sizeObj.reserved
      });

      return false;

    } catch (error) {
      EnhancedLogger.criticalAlert('PAYMENT: Stock confirmation failed', {
        correlationId,
        productId,
        size,
        quantity,
        error: error.message,
        stack: error.stack
      });
      return false;
    }
  }

  /**
   * Handle failed payment
   */
  async handleFailedPayment(transactionId, paymentData, source, correlationId) {
    try {
      // Find and mark any existing order as failed
      const order = await orderModel.findOne({
        phonepeTransactionId: transactionId
      });

      if (order) {
        await orderModel.findByIdAndUpdate(order._id, {
          status: 'FAILED',
          paymentStatus: 'FAILED',
          failedAt: new Date(),
          failureReason: paymentData.message || 'Payment failed',
          phonepeResponse: paymentData,
          updatedAt: new Date()
        });

        // Release any reserved stock
        await this.releaseStockForOrder(order, correlationId);
      }

      EnhancedLogger.webhookLog('INFO', 'Payment marked as failed', {
        correlationId,
        transactionId,
        orderId: order?._id
      });

      return {
        success: true,
        action: 'payment_failed',
        transactionId,
        message: 'Payment marked as failed'
      };

    } catch (error) {
      EnhancedLogger.criticalAlert('PAYMENT: Failed payment handling error', {
        correlationId,
        transactionId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Handle pending payment
   */
  async handlePendingPayment(transactionId, paymentData, source, correlationId) {
    EnhancedLogger.webhookLog('INFO', 'Payment is pending', {
      correlationId,
      transactionId,
      state: paymentData.state,
      responseCode: paymentData.responseCode
    });

    return {
      success: true,
      action: 'payment_pending',
      transactionId,
      message: 'Payment is pending'
    };
  }

  /**
   * Emergency recovery for failed processing
   */
  async emergencyRecovery(transactionId, paymentData, source, correlationId, originalError) {
    try {
      EnhancedLogger.criticalAlert('PAYMENT: Attempting emergency recovery', {
        correlationId,
        transactionId,
        originalError: originalError.message
      });

      // Try to create emergency order to prevent payment loss
      const emergencyOrder = await this.createEmergencyOrder(transactionId, paymentData, correlationId);
      
      return {
        success: true,
        action: 'emergency_recovery',
        orderId: emergencyOrder._id,
        transactionId,
        message: 'Emergency order created to prevent payment loss'
      };

    } catch (recoveryError) {
      EnhancedLogger.criticalAlert('PAYMENT: Emergency recovery failed', {
        correlationId,
        transactionId,
        originalError: originalError.message,
        recoveryError: recoveryError.message
      });
      
      throw new Error(`Payment processing failed and emergency recovery failed: ${recoveryError.message}`);
    }
  }

  /**
   * Create emergency order to prevent payment loss
   */
  async createEmergencyOrder(transactionId, paymentData, correlationId) {
    const emergencyOrder = new orderModel({
      phonepeTransactionId: transactionId,
      status: 'EMERGENCY_CREATED',
      paymentStatus: 'PAID',
      orderStatus: 'CONFIRMED',
      emergencyCreated: true,
      emergencyReason: 'No matching order/session found',
      phonepeResponse: paymentData,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    await emergencyOrder.save();

    EnhancedLogger.criticalAlert('PAYMENT: Emergency order created', {
      correlationId,
      transactionId,
      orderId: emergencyOrder._id
    });

    return emergencyOrder;
  }

  /**
   * Release stock for failed order
   */
  async releaseStockForOrder(order, correlationId) {
    try {
      const itemsToProcess = order.cartItems && order.cartItems.length > 0 
        ? order.cartItems 
        : order.items;

      if (!itemsToProcess || itemsToProcess.length === 0) {
        return;
      }

      for (const item of itemsToProcess) {
        if (item.productId && item.size && item.quantity) {
          try {
            await productModel.updateOne(
              { _id: item.productId, 'sizes.size': item.size },
              { $inc: { 'sizes.$.reserved': -item.quantity } }
            );
            EnhancedLogger.webhookLog('INFO', 'Stock released for failed order', {
              correlationId,
              productId: item.productId,
              size: item.size,
              quantity: item.quantity
            });
          } catch (stockError) {
            EnhancedLogger.webhookLog('ERROR', 'Failed to release stock', {
              correlationId,
              productId: item.productId,
              error: stockError.message
            });
          }
        }
      }
    } catch (error) {
      EnhancedLogger.criticalAlert('PAYMENT: Stock release failed', {
        correlationId,
        orderId: order._id,
        error: error.message
      });
    }
  }
}

// Export singleton instance
export default new BulletproofPaymentProcessor();
