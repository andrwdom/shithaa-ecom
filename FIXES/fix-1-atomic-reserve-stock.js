/**
 * FIX #1: CRITICAL - Make reserveStockAtomic Truly Atomic
 * 
 * This file contains the corrected version of reserveStockAtomic function
 * that eliminates the race condition by using a single atomic operation.
 * 
 * ISSUE: The original function did read-then-write which allowed race conditions
 * FIX: Single updateOne operation with stock check in the query filter
 * 
 * REPLACE: backend/utils/atomicStockOperations.js:27-96
 */

import mongoose from 'mongoose';
import productModel from '../models/productModel.js';
import { StockError, ValidationError } from './errorHandler.js';

/**
 * ATOMIC: Reserve stock for a single product/size
 * Uses truly atomic updateOne operation to prevent race conditions
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
    // 🔑 TRULY ATOMIC: Single operation with availability check in the query
    // The query filter ensures that stock is only deducted if enough is available
    const result = await productModel.updateOne(
      {
        _id: productId,
        sizes: {
          $elemMatch: {
            size: size,
            // Check that available stock (stock - reserved) >= quantity
            // This happens ATOMICALLY with the update
            $expr: {
              $gte: [
                // Calculate: stock - (reserved || 0)
                { 
                  $subtract: [
                    '$stock',
                    { $ifNull: ['$reserved', 0] }
                  ]
                },
                quantity
              ]
            }
          }
        }
      },
      {
        // Update operation: decrement stock, increment reserved
        $inc: {
          'sizes.$[elem].stock': -quantity,
          'sizes.$[elem].reserved': quantity
        }
      },
      {
        // Array filter to target the correct size
        arrayFilters: [{ 'elem.size': size }],
        session
      }
    );

    // Check if update was successful
    if (result.modifiedCount === 0) {
      // Update failed - either product not found OR insufficient stock
      // Fetch product to provide detailed error message
      const product = await productModel.findById(productId, { sizes: 1 }).session(session);
      
      if (!product) {
        throw new StockError('Product not found', { productId, correlationId });
      }
      
      const sizeObj = product.sizes.find(s => s.size === size);
      if (!sizeObj) {
        throw new StockError('Requested size not found', { productId, size, correlationId });
      }
      
      const reserved = typeof sizeObj.reserved === 'number' ? sizeObj.reserved : 0;
      const stock = typeof sizeObj.stock === 'number' ? sizeObj.stock : 0;
      const available = Math.max(0, stock - reserved);
      
      throw new StockError('Insufficient stock for reservation', {
        productId, 
        size, 
        quantity, 
        availableStock: available,
        currentStock: stock,
        currentReserved: reserved,
        correlationId
      });
    }

    console.log(`STOCK:RESERVE:ATOMIC:SUCCESS: productId=${productId}, size=${size}, quantity=${quantity}, correlationId=${correlationId}, timestamp=${new Date().toISOString()}`);

    return {
      success: true,
      productId,
      size,
      quantity,
      reserved: quantity
    };

  } catch (error) {
    console.log(`STOCK:RESERVE:ATOMIC:FAILED: productId=${productId}, size=${size}, quantity=${quantity}, error=${error.message}, correlationId=${correlationId}, timestamp=${new Date().toISOString()}`);
    throw error;
  }
}

/**
 * SIMPLIFIED ATOMIC: Reserve stock for a single product/size (Template Version)
 * Uses single atomic updateOne with availability check
 * 
 * @param {Object} params - { productId, size, qty, session }
 * @returns {Promise<boolean>} - Success status
 */
export async function reserveSingleSizeAtomic({ productId, size, qty, session = null }) {
  if (!productId || !size || !qty) throw new Error('Invalid args');

  const filter = {
    _id: mongoose.Types.ObjectId.isValid(productId) 
      ? mongoose.Types.ObjectId(productId) 
      : productId,
    sizes: {
      $elemMatch: {
        size: size,
        // Atomic availability check
        $expr: {
          $gte: [
            { $subtract: ['$stock', { $ifNull: ['$reserved', 0] }] },
            qty
          ]
        }
      }
    }
  };

  const update = {
    $inc: {
      'sizes.$[elem].stock': -qty,
      'sizes.$[elem].reserved': qty
    }
  };

  const options = {
    arrayFilters: [{ 'elem.size': size }],
    session
  };

  const res = await productModel.updateOne(filter, update, options);
  
  if (res.modifiedCount === 0) {
    console.log('STOCK:RESERVE:FAILED', { productId, size, qty, result: res });
    return false;
  }
  
  console.log('STOCK:RESERVE:SUCCESS', { productId, size, qty });
  return true;
}

export default {
  reserveStockAtomic,
  reserveSingleSizeAtomic
};

