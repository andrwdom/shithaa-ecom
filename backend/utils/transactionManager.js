/**
 * MONGODB TRANSACTION MANAGER
 * 
 * Provides robust transaction management for multi-item operations
 * with automatic retry, rollback, and error handling.
 * 
 * CRITICAL: All multi-item operations must use transactions to prevent
 * partial updates and maintain data consistency.
 */

import mongoose from 'mongoose';
import { StockError, ValidationError } from './errorHandler.js';
import { 
  reserveStockAtomic, 
  confirmStockReservationAtomic, 
  releaseStockReservationAtomic,
  deductStockAtomic
} from './atomicStockOperations.js';

/**
 * Transaction configuration
 */
const TRANSACTION_CONFIG = {
  maxRetries: 3,
  retryDelay: 100, // ms
  timeout: 30000, // 30 seconds
  retryJitter: 50 // ms
};

/**
 * Execute a function within a MongoDB transaction with automatic retry
 * @param {Function} operation - Function to execute within transaction
 * @param {Object} options - Transaction options
 * @returns {Promise<any>} - Result of the operation
 */
export async function withTransaction(operation, options = {}) {
  const { 
    maxRetries = TRANSACTION_CONFIG.maxRetries,
    retryDelay = TRANSACTION_CONFIG.retryDelay,
    timeout = TRANSACTION_CONFIG.timeout,
    correlationId = `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  } = options;

  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const session = await mongoose.startSession();
    
    try {
      console.log(`🔄 Transaction attempt ${attempt}/${maxRetries} (${correlationId})`);
      
      let result;
      await session.withTransaction(async () => {
        result = await operation(session, { correlationId, attempt });
      }, {
        readPreference: 'primary',
        readConcern: { level: 'majority' },
        writeConcern: { w: 'majority', j: true },
        maxCommitTimeMS: timeout
      });
      
      console.log(`✅ Transaction completed successfully (${correlationId})`);
      return result;
      
    } catch (error) {
      lastError = error;
      console.error(`❌ Transaction attempt ${attempt} failed (${correlationId}):`, error.message);
      
      // Check if error is retryable
      if (!isRetryableError(error) || attempt === maxRetries) {
        throw error;
      }
      
      // Wait before retry with jitter
      const delay = retryDelay + Math.random() * TRANSACTION_CONFIG.retryJitter;
      await new Promise(resolve => setTimeout(resolve, delay));
      
    } finally {
      await session.endSession();
    }
  }
  
  throw lastError;
}

/**
 * Batch stock reservation with transaction support
 * @param {Array} items - Array of { productId, size, quantity } objects
 * @param {Object} options - Transaction options
 * @returns {Promise<Object>} - Results of the batch reservation
 */
export async function batchReserveStock(items, options = {}) {
  const { correlationId } = options;
  
  if (!Array.isArray(items) || items.length === 0) {
    throw new ValidationError('Invalid items array for batch reservation', {
      itemsCount: items?.length, correlationId
    });
  }

  return await withTransaction(async (session, { correlationId }) => {
    const results = [];
    const failures = [];

    console.log(`🔄 Batch reserving stock for ${items.length} items (${correlationId})`);

    // Reserve each item atomically within the transaction
    for (const item of items) {
      try {
        const { productId, size, quantity } = item;
        
        if (!productId || !size || !quantity || quantity <= 0) {
          throw new ValidationError('Invalid item data for stock reservation', {
            item, correlationId
          });
        }

        const result = await reserveStockAtomic(productId, size, quantity, { 
          session, 
          correlationId 
        });
        
        results.push({
          productId,
          size,
          quantity,
          success: true,
          reserved: result.reserved,
          availableStock: result.availableStock
        });
        
        console.log(`✅ Reserved ${quantity} units of ${productId} size ${size}`);
        
      } catch (error) {
        console.error(`❌ Failed to reserve item:`, item, error.message);
        failures.push({
          ...item,
          success: false,
          error: error.message
        });
      }
    }

    // If any item failed, the transaction will be aborted
    if (failures.length > 0) {
      throw new Error(`Batch reservation failed: ${failures.length} items could not be reserved. First error: ${failures[0].error}`);
    }

    console.log(`✅ Batch reservation completed successfully for ${results.length} items (${correlationId})`);
    
    return {
      success: true,
      results,
      totalItems: items.length,
      successfulItems: results.length,
      failedItems: 0
    };
  }, options);
}

/**
 * Batch stock confirmation with transaction support
 * @param {Array} items - Array of { productId, size, quantity } objects
 * @param {Object} options - Transaction options
 * @returns {Promise<Object>} - Results of the batch confirmation
 */
export async function batchConfirmStock(items, options = {}) {
  const { correlationId } = options;
  
  if (!Array.isArray(items) || items.length === 0) {
    throw new ValidationError('Invalid items array for batch confirmation', {
      itemsCount: items?.length, correlationId
    });
  }

  return await withTransaction(async (session, { correlationId }) => {
    const results = [];
    const failures = [];

    console.log(`🔄 Batch confirming stock for ${items.length} items (${correlationId})`);

    // Confirm each item atomically within the transaction
    for (const item of items) {
      try {
        const { productId, size, quantity } = item;
        
        if (!productId || !size || !quantity || quantity <= 0) {
          throw new ValidationError('Invalid item data for stock confirmation', {
            item, correlationId
          });
        }

        const success = await confirmStockReservationAtomic(productId, size, quantity, { 
          session, 
          correlationId 
        });
        
        if (!success) {
          throw new StockError(`Stock confirmation failed for ${item.name || 'product'}`, {
            productId, size, quantity, correlationId
          });
        }
        
        results.push({
          productId,
          size,
          quantity,
          success: true
        });
        
        console.log(`✅ Confirmed ${quantity} units of ${productId} size ${size}`);
        
      } catch (error) {
        console.error(`❌ Failed to confirm item:`, item, error.message);
        failures.push({
          ...item,
          success: false,
          error: error.message
        });
      }
    }

    // If any item failed, the transaction will be aborted
    if (failures.length > 0) {
      throw new Error(`Batch confirmation failed: ${failures.length} items could not be confirmed. First error: ${failures[0].error}`);
    }

    console.log(`✅ Batch confirmation completed successfully for ${results.length} items (${correlationId})`);
    
    return {
      success: true,
      results,
      totalItems: items.length,
      successfulItems: results.length,
      failedItems: 0
    };
  }, options);
}

/**
 * Batch stock release with transaction support
 * @param {Array} items - Array of { productId, size, quantity } objects
 * @param {Object} options - Transaction options
 * @returns {Promise<Object>} - Results of the batch release
 */
export async function batchReleaseStock(items, options = {}) {
  const { correlationId } = options;
  
  if (!Array.isArray(items) || items.length === 0) {
    throw new ValidationError('Invalid items array for batch release', {
      itemsCount: items?.length, correlationId
    });
  }

  return await withTransaction(async (session, { correlationId }) => {
    const results = [];
    const failures = [];

    console.log(`🔄 Batch releasing stock for ${items.length} items (${correlationId})`);

    // Release each item atomically within the transaction
    for (const item of items) {
      try {
        const { productId, size, quantity } = item;
        
        if (!productId || !size || !quantity || quantity <= 0) {
          throw new ValidationError('Invalid item data for stock release', {
            item, correlationId
          });
        }

        const success = await releaseStockReservationAtomic(productId, size, quantity, { 
          session, 
          correlationId 
        });
        
        results.push({
          productId,
          size,
          quantity,
          success
        });
        
        console.log(`✅ Released ${quantity} units of ${productId} size ${size}`);
        
      } catch (error) {
        console.error(`❌ Failed to release item:`, item, error.message);
        failures.push({
          ...item,
          success: false,
          error: error.message
        });
      }
    }

    // For release operations, we don't fail the entire batch if some items fail
    // This is because some items might not have been reserved in the first place
    console.log(`✅ Batch release completed: ${results.length} successful, ${failures.length} failed (${correlationId})`);
    
    return {
      success: true,
      results,
      failures,
      totalItems: items.length,
      successfulItems: results.length,
      failedItems: failures.length
    };
  }, options);
}

/**
 * Complete order processing with transaction support
 * @param {Object} orderData - Order data including items
 * @param {Object} options - Transaction options
 * @returns {Promise<Object>} - Results of the order processing
 */
export async function processOrderWithTransaction(orderData, options = {}) {
  const { correlationId } = options;
  const { items, orderId, paymentInfo } = orderData;
  
  if (!Array.isArray(items) || items.length === 0) {
    throw new ValidationError('Invalid items array for order processing', {
      itemsCount: items?.length, correlationId
    });
  }

  return await withTransaction(async (session, { correlationId }) => {
    console.log(`🔄 Processing order ${orderId} with ${items.length} items (${correlationId})`);

    // Step 1: Reserve stock for all items
    const reservationResult = await batchReserveStock(items, { 
      session, 
      correlationId 
    });

    if (!reservationResult.success) {
      throw new Error('Stock reservation failed for order');
    }

    // Step 2: Create order document
    const order = {
      _id: orderId,
      items,
      paymentInfo,
      status: 'confirmed',
      createdAt: new Date(),
      correlationId
    };

    // Step 3: Confirm stock reservations (convert to actual deductions)
    const confirmationResult = await batchConfirmStock(items, { 
      session, 
      correlationId 
    });

    if (!confirmationResult.success) {
      // If confirmation fails, release the reservations
      await batchReleaseStock(items, { session, correlationId });
      throw new Error('Stock confirmation failed for order');
    }

    console.log(`✅ Order ${orderId} processed successfully (${correlationId})`);
    
    return {
      success: true,
      orderId,
      reservationResult,
      confirmationResult,
      order
    };
  }, options);
}

/**
 * Check if an error is retryable for transaction retry logic
 * @param {Error} error - Error to check
 * @returns {boolean} - Whether the error is retryable
 */
function isRetryableError(error) {
  // MongoDB transaction retryable errors
  const retryableErrors = [
    'TransientTransactionError',
    'NoSuchTransaction',
    'WriteConflict',
    'WriteConcernError'
  ];
  
  return retryableErrors.some(errorType => 
    error.name === errorType || 
    error.message.includes(errorType) ||
    error.code === 112 || // WriteConflict
    error.code === 24     // LockTimeout
  );
}

/**
 * Get transaction statistics
 * @returns {Object} - Transaction statistics
 */
export function getTransactionStats() {
  return {
    config: TRANSACTION_CONFIG,
    timestamp: new Date().toISOString()
  };
}

export default {
  withTransaction,
  batchReserveStock,
  batchConfirmStock,
  batchReleaseStock,
  processOrderWithTransaction,
  getTransactionStats
};
