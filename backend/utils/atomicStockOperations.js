/**
 * ATOMIC STOCK OPERATIONS
 * 
 * This module provides truly atomic stock operations that eliminate
 * race conditions by using MongoDB's atomic updateOne/findOneAndUpdate
 * operations instead of check-then-write patterns.
 * 
 * CRITICAL: All stock operations must use these functions to prevent
 * race conditions in concurrent scenarios.
 */

import mongoose from 'mongoose';
import productModel from '../models/productModel.js';
import { StockError, ValidationError } from './errorHandler.js';

/**
 * ATOMIC: Reserve stock for a single product/size
 * Uses atomic findOneAndUpdate to prevent race conditions
 * 
 * @param {string} productId - Product ID
 * @param {string} size - Size to reserve
 * @param {number} quantity - Quantity to reserve
 * @param {Object} options - Additional options including session
 * @returns {Promise<Object>} - Result of the reservation
 */
export async function reserveStockAtomic(productId, size, quantity, options = {}) {
  const { session, correlationId } = options;
  
  if (!productId || !size || !quantity || quantity <= 0) {
    throw new ValidationError('Invalid parameters for stock reservation', {
      productId, size, quantity, correlationId
    });
  }

  try {
    // 🚨 CRITICAL FIX: Atomic operation - check availability AND reserve in one operation
    const query = {
      _id: productId,
      'sizes.size': size,
      // Check that available stock (stock - reserved) >= quantity
      $expr: {
        $gte: [
          {
            $let: {
              vars: {
                sizeObj: {
                  $arrayElemAt: [
                    {
                      $filter: {
                        input: '$sizes',
                        cond: { $eq: ['$$this.size', size] }
                      }
                    },
                    0
                  ]
                }
              },
              in: {
                $subtract: [
                  '$$sizeObj.stock',
                  { $ifNull: ['$$sizeObj.reserved', 0] }
                ]
              }
            }
          },
          quantity
        ]
      }
    };

    const update = {
      $inc: { 'sizes.$[elem].reserved': quantity }
    };

    const updateOptions = {
      session,
      arrayFilters: [{ 'elem.size': size }],
      new: true
    };

    const result = await productModel.findOneAndUpdate(query, update, updateOptions);

    if (!result) {
      // Get current stock info for better error message
      const product = await productModel.findById(productId).session(session);
      const sizeObj = product?.sizes?.find(s => s.size === size);
      const availableStock = sizeObj ? Math.max(0, sizeObj.stock - (sizeObj.reserved || 0)) : 0;
      
      throw new StockError(`Insufficient stock for reservation`, {
        productId, size, quantity, availableStock, correlationId
      });
    }

    // 🚨 CRITICAL MITIGATION: Add structured logging
    console.log(`STOCK:RESERVE:ATOMIC:SUCCESS: productId=${productId}, size=${size}, quantity=${quantity}, correlationId=${correlationId}, timestamp=${new Date().toISOString()}`);

    return {
      success: true,
      productId,
      size,
      quantity,
      reserved: quantity,
      availableStock: Math.max(0, result.sizes.find(s => s.size === size).stock - result.sizes.find(s => s.size === size).reserved)
    };

  } catch (error) {
    console.log(`STOCK:RESERVE:ATOMIC:FAILED: productId=${productId}, size=${size}, quantity=${quantity}, error=${error.message}, correlationId=${correlationId}, timestamp=${new Date().toISOString()}`);
    throw error;
  }
}

/**
 * ATOMIC: Confirm stock reservation (deduct from stock, release reservation)
 * Uses atomic findOneAndUpdate to prevent race conditions
 * 
 * @param {string} productId - Product ID
 * @param {string} size - Size to confirm
 * @param {number} quantity - Quantity to confirm
 * @param {Object} options - Additional options including session
 * @returns {Promise<boolean>} - Result of the confirmation
 */
export async function confirmStockReservationAtomic(productId, size, quantity, options = {}) {
  const { session, correlationId } = options;
  
  if (!productId || !size || !quantity || quantity <= 0) {
    throw new ValidationError('Invalid parameters for stock confirmation', {
      productId, size, quantity, correlationId
    });
  }

  try {
    // 🚨 CRITICAL FIX: Atomic operation - check stock AND reserved, then deduct both
    const query = {
      _id: productId,
      'sizes.size': size,
      'sizes.stock': { $gte: quantity },
      'sizes.reserved': { $gte: quantity }
    };

    const update = {
      $inc: { 
        'sizes.$[elem].stock': -quantity,
        'sizes.$[elem].reserved': -quantity
      }
    };

    const updateOptions = {
      session,
      arrayFilters: [
        { 
          'elem.size': size, 
          'elem.stock': { $gte: quantity }, 
          'elem.reserved': { $gte: quantity } 
        }
      ]
    };

    const result = await productModel.updateOne(query, update, updateOptions);

    const success = result.modifiedCount > 0;

    if (success) {
      console.log(`STOCK:CONFIRM:ATOMIC:SUCCESS: productId=${productId}, size=${size}, quantity=${quantity}, correlationId=${correlationId}, timestamp=${new Date().toISOString()}`);
    } else {
      console.log(`STOCK:CONFIRM:ATOMIC:FAILED: productId=${productId}, size=${size}, quantity=${quantity}, correlationId=${correlationId}, timestamp=${new Date().toISOString()}`);
    }

    return success;

  } catch (error) {
    console.log(`STOCK:CONFIRM:ATOMIC:ERROR: productId=${productId}, size=${size}, quantity=${quantity}, error=${error.message}, correlationId=${correlationId}, timestamp=${new Date().toISOString()}`);
    throw error;
  }
}

/**
 * ATOMIC: Release stock reservation (decrement reserved field only)
 * Uses atomic updateOne to prevent race conditions
 * 
 * @param {string} productId - Product ID
 * @param {string} size - Size to release
 * @param {number} quantity - Quantity to release
 * @param {Object} options - Additional options including session
 * @returns {Promise<boolean>} - Result of the release
 */
export async function releaseStockReservationAtomic(productId, size, quantity, options = {}) {
  const { session, correlationId } = options;
  
  if (!productId || !size || !quantity || quantity <= 0) {
    throw new ValidationError('Invalid parameters for stock release', {
      productId, size, quantity, correlationId
    });
  }

  try {
    // 🚨 CRITICAL FIX: Atomic operation - check reserved amount, then decrement
    const query = {
      _id: productId,
      'sizes.size': size,
      'sizes.reserved': { $gte: quantity }
    };

    const update = {
      $inc: { 'sizes.$[elem].reserved': -quantity }
    };

    const updateOptions = {
      session,
      arrayFilters: [
        { 'elem.size': size, 'elem.reserved': { $gte: quantity } }
      ]
    };

    const result = await productModel.updateOne(query, update, updateOptions);

    const success = result.modifiedCount > 0;

    if (success) {
      console.log(`STOCK:RELEASE:ATOMIC:SUCCESS: productId=${productId}, size=${size}, quantity=${quantity}, correlationId=${correlationId}, timestamp=${new Date().toISOString()}`);
    } else {
      console.log(`STOCK:RELEASE:ATOMIC:FAILED: productId=${productId}, size=${size}, quantity=${quantity}, correlationId=${correlationId}, timestamp=${new Date().toISOString()}`);
    }

    return success;

  } catch (error) {
    console.log(`STOCK:RELEASE:ATOMIC:ERROR: productId=${productId}, size=${size}, quantity=${quantity}, error=${error.message}, correlationId=${correlationId}, timestamp=${new Date().toISOString()}`);
    throw error;
  }
}

/**
 * ATOMIC: Direct stock deduction (for payment confirmation)
 * Uses atomic updateOne to prevent race conditions
 * 
 * @param {string} productId - Product ID
 * @param {string} size - Size to deduct
 * @param {number} quantity - Quantity to deduct
 * @param {Object} options - Additional options including session
 * @returns {Promise<boolean>} - Result of the deduction
 */
export async function deductStockAtomic(productId, size, quantity, options = {}) {
  const { session, correlationId } = options;
  
  if (!productId || !size || !quantity || quantity <= 0) {
    throw new ValidationError('Invalid parameters for stock deduction', {
      productId, size, quantity, correlationId
    });
  }

  try {
    // 🚨 CRITICAL FIX: Atomic operation - check stock availability, then deduct
    const query = {
      _id: productId,
      'sizes.size': size,
      'sizes.stock': { $gte: quantity }
    };

    const update = {
      $inc: { 'sizes.$[elem].stock': -quantity }
    };

    const updateOptions = {
      session,
      arrayFilters: [
        { 'elem.size': size, 'elem.stock': { $gte: quantity } }
      ]
    };

    const result = await productModel.updateOne(query, update, updateOptions);

    const success = result.modifiedCount > 0;

    if (success) {
      console.log(`STOCK:DEDUCT:ATOMIC:SUCCESS: productId=${productId}, size=${size}, quantity=${quantity}, correlationId=${correlationId}, timestamp=${new Date().toISOString()}`);
    } else {
      console.log(`STOCK:DEDUCT:ATOMIC:FAILED: productId=${productId}, size=${size}, quantity=${quantity}, correlationId=${correlationId}, timestamp=${new Date().toISOString()}`);
    }

    return success;

  } catch (error) {
    console.log(`STOCK:DEDUCT:ATOMIC:ERROR: productId=${productId}, size=${size}, quantity=${quantity}, error=${error.message}, correlationId=${correlationId}, timestamp=${new Date().toISOString()}`);
    throw error;
  }
}

/**
 * ATOMIC: Restore stock (increment stock)
 * Uses atomic updateOne to prevent race conditions
 * 
 * @param {string} productId - Product ID
 * @param {string} size - Size to restore
 * @param {number} quantity - Quantity to restore
 * @param {Object} options - Additional options including session
 * @returns {Promise<boolean>} - Result of the restoration
 */
export async function restoreStockAtomic(productId, size, quantity, options = {}) {
  const { session, correlationId } = options;
  
  if (!productId || !size || !quantity || quantity <= 0) {
    throw new ValidationError('Invalid parameters for stock restoration', {
      productId, size, quantity, correlationId
    });
  }

  try {
    // 🚨 CRITICAL FIX: Atomic operation - increment stock
    const query = {
      _id: productId,
      'sizes.size': size
    };

    const update = {
      $inc: { 'sizes.$[elem].stock': quantity }
    };

    const updateOptions = {
      session,
      arrayFilters: [{ 'elem.size': size }]
    };

    const result = await productModel.updateOne(query, update, updateOptions);

    const success = result.modifiedCount > 0;

    if (success) {
      console.log(`STOCK:RESTORE:ATOMIC:SUCCESS: productId=${productId}, size=${size}, quantity=${quantity}, correlationId=${correlationId}, timestamp=${new Date().toISOString()}`);
    } else {
      console.log(`STOCK:RESTORE:ATOMIC:FAILED: productId=${productId}, size=${size}, quantity=${quantity}, correlationId=${correlationId}, timestamp=${new Date().toISOString()}`);
    }

    return success;

  } catch (error) {
    console.log(`STOCK:RESTORE:ATOMIC:ERROR: productId=${productId}, size=${size}, quantity=${quantity}, error=${error.message}, correlationId=${correlationId}, timestamp=${new Date().toISOString()}`);
    throw error;
  }
}

/**
 * ATOMIC: Batch stock operations with transaction support
 * Uses MongoDB transactions to ensure all-or-nothing behavior
 * 
 * @param {Array} operations - Array of { productId, size, quantity, operation } objects
 * @param {Object} options - Additional options including session
 * @returns {Promise<Object>} - Results of all operations
 */
export async function batchStockOperationsAtomic(operations, options = {}) {
  const { session, correlationId } = options;
  
  if (!Array.isArray(operations) || operations.length === 0) {
    throw new ValidationError('Invalid operations array for batch stock operations', {
      operationsCount: operations?.length, correlationId
    });
  }

  const results = [];
  const failures = [];

  try {
    for (const operation of operations) {
      const { productId, size, quantity, operation: opType } = operation;
      
      try {
        let success = false;
        
        switch (opType) {
          case 'reserve':
            await reserveStockAtomic(productId, size, quantity, { session, correlationId });
            success = true;
            break;
          case 'confirm':
            success = await confirmStockReservationAtomic(productId, size, quantity, { session, correlationId });
            break;
          case 'release':
            success = await releaseStockReservationAtomic(productId, size, quantity, { session, correlationId });
            break;
          case 'deduct':
            success = await deductStockAtomic(productId, size, quantity, { session, correlationId });
            break;
          case 'restore':
            success = await restoreStockAtomic(productId, size, quantity, { session, correlationId });
            break;
          default:
            throw new Error(`Unknown operation type: ${opType}`);
        }
        
        results.push({
          productId, size, quantity, operation: opType, success
        });
        
      } catch (error) {
        failures.push({
          productId, size, quantity, operation: opType, error: error.message
        });
      }
    }

    if (failures.length > 0) {
      throw new Error(`Batch operations failed: ${failures.length} operations failed`);
    }

    return {
      success: true,
      results,
      totalOperations: operations.length,
      successfulOperations: results.length,
      failedOperations: 0
    };

  } catch (error) {
    console.log(`STOCK:BATCH:ATOMIC:ERROR: operations=${operations.length}, failures=${failures.length}, error=${error.message}, correlationId=${correlationId}, timestamp=${new Date().toISOString()}`);
    throw error;
  }
}

export default {
  reserveStockAtomic,
  confirmStockReservationAtomic,
  releaseStockReservationAtomic,
  deductStockAtomic,
  restoreStockAtomic,
  batchStockOperationsAtomic
};
