/**
 * ATOMIC ORDER COMMIT SERVICE
 * 
 * Ensures stock is decremented atomically only when payment is confirmed.
 * Prevents overselling by using atomic MongoDB operations with conditional filters.
 * 
 * Critical for preventing:
 * - Race conditions in stock deduction
 * - Overselling when multiple users buy the same last item
 * - Partial failures in multi-item orders
 */

import mongoose from 'mongoose';
import productModel from '../models/productModel.js';
import orderModel from '../models/orderModel.js';
import { confirmStockReservation } from '../utils/stock.js';
import { deductStockAtomic } from '../utils/atomicStockOperations.js';
import EnhancedLogger from '../utils/enhancedLogger.js';

/**
 * ATOMIC: Commit order and deduct stock only when payment is confirmed
 * This is the ONLY place where stock should be decremented after payment success
 * 
 * @param {string} orderId - Order ID to commit
 * @param {Object} paymentInfo - Payment information
 * @param {Object} options - Additional options including session
 * @returns {Promise<Object>} - Commit result
 */
export async function commitOrder(orderId, paymentInfo, options = {}) {
  const { session, correlationId } = options;
  
  try {
    EnhancedLogger.webhookLog('INFO', 'Starting atomic order commit', {
      correlationId,
      orderId,
      paymentInfo: {
        transactionId: paymentInfo.phonepeTransactionId || paymentInfo.transactionId,
        amount: paymentInfo.amount,
        status: paymentInfo.status
      }
    });

    // 1. Find and validate order (use mock order if provided for testing)
    const order = options.mockOrder || await orderModel.findById(orderId).session(session);
    if (!order) {
      throw new Error(`Order not found: ${orderId}`);
    }

    // 2. Validate order state
    if (order.status !== 'DRAFT' && order.status !== 'PENDING') {
      throw new Error(`Order not in commitable state: ${order.status}`);
    }

    if (order.paymentStatus === 'PAID') {
      EnhancedLogger.webhookLog('INFO', 'Order already committed - idempotent processing', {
        correlationId,
        orderId,
        currentStatus: order.status,
        paymentStatus: order.paymentStatus
      });
      return {
        success: true,
        orderId,
        action: 'already_committed',
        stockDeducted: order.stockConfirmed || false
      };
    }

    // 3. Get items to process
    let itemsToProcess = order.cartItems && order.cartItems.length > 0 
      ? order.cartItems 
      : order.items;

    if (!itemsToProcess || itemsToProcess.length === 0) {
      throw new Error('Order has no items to process');
    }

    // Debug: Log the raw order data
    console.log('🔍 DEBUG: Raw order data:', {
      orderId: order._id,
      orderStatus: order.status,
      paymentStatus: order.paymentStatus,
      cartItems: order.cartItems,
      items: order.items,
      cartItemsLength: order.cartItems?.length,
      itemsLength: order.items?.length
    });

    // CRITICAL FIX: Handle both cartItems and items arrays
    // Some order models create items array instead of cartItems
    if (!order.cartItems || order.cartItems.length === 0) {
      if (order.items && order.items.length > 0) {
        // Convert items array to cartItems format for processing
        const convertedItems = order.items.map(item => ({
          productId: item.productId || item._id, // Use _id as fallback
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          size: item.size
        }));
        itemsToProcess = convertedItems;
        EnhancedLogger.webhookLog('WARN', 'Using items array instead of cartItems', {
          correlationId,
          orderId,
          itemsCount: itemsToProcess.length
        });
      } else {
        throw new Error('Order has no cartItems or items to process.');
      }
    }

    EnhancedLogger.webhookLog('INFO', 'Processing order items for stock deduction', {
      correlationId,
      orderId,
      itemCount: itemsToProcess.length,
      items: itemsToProcess.map(item => ({
        productId: item.productId || item._id,
        productIdType: typeof (item.productId || item._id),
        size: item.size,
        quantity: item.quantity,
        name: item.name || item.productName
      }))
    });

    // 4. ATOMIC: Deduct stock for each item with rollback tracking
    const stockResults = [];
    const successfulDeductions = [];
    let hasFailures = false;

    for (const item of itemsToProcess) {
      const productId = item.productId || item._id || item.id || item.product;
      const size = item.size;
      const quantity = item.quantity;

      // Debug logging to see what's happening
      EnhancedLogger.webhookLog('DEBUG', 'Processing item for stock deduction', {
        correlationId,
        orderId,
        item: {
          productId: productId,
          productIdType: typeof productId,
          size: size,
          quantity: quantity,
          name: item.name || item.productName
        }
      });

      if (!productId || !size || !quantity || quantity <= 0) {
        throw new Error(`Invalid item data: ${JSON.stringify(item)}`);
      }

      try {
        // 🚨 CRITICAL FIX: Use atomic stock deduction directly (no reservation system)
        let stockDeducted = await deductStockAtomic(
          productId,
          size,
          quantity,
          { session, correlationId }
        );

        // 🚨 CRITICAL FIX: With atomic operations, emergency fallback is no longer needed
        // If stock confirmation fails, it means there's a real stock issue that needs investigation
        if (!stockDeducted) {
          EnhancedLogger.webhookLog('ERROR', 'Stock confirmation failed - no emergency fallback available', {
            correlationId,
            orderId,
            productId,
            size,
            quantity,
            reason: 'Emergency deduction removed for safety - investigate stock issue'
          });
          throw new Error(`Stock confirmation failed for product ${productId} - investigate stock availability`);
        }

        const result = {
          productId,
          size,
          quantity,
          name: item.name || item.productName,
          success: stockDeducted,
          method: stockDeducted ? (stockDeducted ? 'confirmation' : 'emergency') : 'failed'
        };

        stockResults.push(result);

        if (stockDeducted) {
          successfulDeductions.push(result);
          EnhancedLogger.webhookLog('SUCCESS', 'Stock deducted successfully', {
            correlationId,
            orderId,
            productId,
            size,
            quantity,
            method: result.method
          });
        } else {
          hasFailures = true;
          EnhancedLogger.criticalAlert('WEBHOOK: Stock deduction failed', {
            correlationId,
            orderId,
            productId,
            size,
            quantity,
            itemName: item.name || item.productName
          });
        }

      } catch (error) {
        hasFailures = true;
        const result = {
          productId,
          size,
          quantity,
          name: item.name || item.productName,
          success: false,
          error: error.message
        };
        
        stockResults.push(result);
        
        EnhancedLogger.criticalAlert('WEBHOOK: Stock deduction error', {
          correlationId,
          orderId,
          productId,
          size,
          quantity,
          error: error.message
        });
      }
    }

    // 5. Handle partial failures with rollback
    if (hasFailures) {
      const failedItems = stockResults.filter(r => !r.success);
      
      EnhancedLogger.criticalAlert('WEBHOOK: Partial stock deduction failure - rolling back', {
        correlationId,
        orderId,
        successfulDeductions: successfulDeductions.length,
        failedItems: failedItems.length,
        totalItems: itemsToProcess.length
      });

      // Rollback successful deductions
      await rollbackSuccessfulDeductions(successfulDeductions, session, correlationId);

      throw new Error(`Stock deduction failed for ${failedItems.length} items. Rollback completed.`);
    }

    // 6. ATOMIC: Update order status to confirmed
    const updateResult = await orderModel.findByIdAndUpdate(
      orderId,
      {
        status: 'CONFIRMED',
        orderStatus: 'CONFIRMED',
        paymentStatus: 'PAID',
        stockConfirmed: true,
        stockConfirmedAt: new Date(),
        confirmedAt: new Date(),
        paidAt: new Date(),
        payment: {
          ...order.payment,
          transactionId: paymentInfo.phonepeTransactionId || paymentInfo.transactionId,
          gatewayResponse: paymentInfo.rawPayload || paymentInfo,
          completedAt: new Date()
        },
        stockConfirmationResults: stockResults,
        webhookProcessedAt: new Date(),
        updatedAt: new Date()
      },
      { session, new: true }
    );

    if (!updateResult) {
      throw new Error('Failed to update order status');
    }

    EnhancedLogger.webhookLog('SUCCESS', 'Order committed successfully', {
      correlationId,
      orderId,
      stockResults,
      totalItems: itemsToProcess.length,
      successfulItems: successfulDeductions.length
    });

    return {
      success: true,
      orderId,
      action: 'order_committed',
      stockDeducted: true,
      stockResults,
      totalItems: itemsToProcess.length,
      successfulItems: successfulDeductions.length
    };

  } catch (error) {
    EnhancedLogger.criticalAlert('WEBHOOK: Order commit failed', {
      correlationId,
      orderId,
      error: error.message,
      stack: error.stack
    });
    
    throw error;
  }
}

/**
 * Rollback successful stock deductions when partial failure occurs
 * This prevents stock from being stuck in deducted state
 */
async function rollbackSuccessfulDeductions(successfulDeductions, session, correlationId) {
  try {
    EnhancedLogger.webhookLog('INFO', 'Starting rollback of successful deductions', {
      correlationId,
      deductionCount: successfulDeductions.length
    });

    for (const deduction of successfulDeductions) {
      try {
        // Add back the deducted stock
        const result = await productModel.updateOne(
          {
            _id: deduction.productId,
            'sizes.size': deduction.size
          },
          {
            $inc: { 'sizes.$[elem].stock': deduction.quantity }
          },
          {
            session,
            arrayFilters: [{ 'elem.size': deduction.size }]
          }
        );

        if (result.modifiedCount > 0) {
          EnhancedLogger.webhookLog('SUCCESS', 'Stock rollback successful', {
            correlationId,
            productId: deduction.productId,
            size: deduction.size,
            quantity: deduction.quantity
          });
        } else {
          EnhancedLogger.webhookLog('WARN', 'Stock rollback failed - no matching document', {
            correlationId,
            productId: deduction.productId,
            size: deduction.size,
            quantity: deduction.quantity
          });
        }
      } catch (rollbackError) {
        EnhancedLogger.criticalAlert('WEBHOOK: Stock rollback error', {
          correlationId,
          productId: deduction.productId,
          size: deduction.size,
          quantity: deduction.quantity,
          error: rollbackError.message
        });
      }
    }

    EnhancedLogger.webhookLog('INFO', 'Rollback completed', {
      correlationId,
      processedDeductions: successfulDeductions.length
    });

  } catch (error) {
    EnhancedLogger.criticalAlert('WEBHOOK: Rollback process failed', {
      correlationId,
      error: error.message
    });
  }
}

/**
 * ATOMIC: Commit order with transaction support (preferred method)
 * Uses MongoDB transactions for complete atomicity
 */
export async function commitOrderWithTransaction(orderId, paymentInfo, options = {}) {
  const { correlationId } = options;
  const session = await mongoose.startSession();
  
  try {
    await session.withTransaction(async () => {
      const result = await commitOrder(orderId, paymentInfo, { ...options, session });
      return result;
    });

    EnhancedLogger.webhookLog('SUCCESS', 'Order committed with transaction', {
      correlationId,
      orderId
    });

  } catch (error) {
    EnhancedLogger.criticalAlert('WEBHOOK: Transactional order commit failed', {
      correlationId,
      orderId,
      error: error.message
    });
    throw error;
  } finally {
    await session.endSession();
  }
}

/**
 * ATOMIC: Batch commit multiple orders
 * Processes multiple orders atomically
 */
export async function commitOrdersBatch(orders, paymentInfo, options = {}) {
  const { correlationId } = options;
  const session = await mongoose.startSession();
  
  try {
    const results = [];
    
    await session.withTransaction(async () => {
      for (const orderId of orders) {
        try {
          const result = await commitOrder(orderId, paymentInfo, { ...options, session });
          results.push({ orderId, success: true, result });
        } catch (error) {
          results.push({ orderId, success: false, error: error.message });
        }
      }
    });

    EnhancedLogger.webhookLog('SUCCESS', 'Batch order commit completed', {
      correlationId,
      totalOrders: orders.length,
      successfulOrders: results.filter(r => r.success).length,
      failedOrders: results.filter(r => !r.success).length
    });

    return results;

  } catch (error) {
    EnhancedLogger.criticalAlert('WEBHOOK: Batch order commit failed', {
      correlationId,
      error: error.message
    });
    throw error;
  } finally {
    await session.endSession();
  }
}

/**
 * Get order commit status
 */
export async function getOrderCommitStatus(orderId, options = {}) {
  const { correlationId } = options;
  
  try {
    const order = await orderModel.findById(orderId);
    
    if (!order) {
      return {
        found: false,
        error: 'Order not found'
      };
    }

    return {
      found: true,
      orderId: order._id,
      status: order.status,
      paymentStatus: order.paymentStatus,
      stockConfirmed: order.stockConfirmed || false,
      stockConfirmedAt: order.stockConfirmedAt,
      confirmedAt: order.confirmedAt,
      paidAt: order.paidAt,
      stockConfirmationResults: order.stockConfirmationResults || []
    };

  } catch (error) {
    EnhancedLogger.webhookLog('ERROR', 'Failed to get order commit status', {
      correlationId,
      orderId,
      error: error.message
    });
    
    return {
      found: false,
      error: error.message
    };
  }
}

export default {
  commitOrder,
  commitOrderWithTransaction,
  commitOrdersBatch,
  getOrderCommitStatus
};
