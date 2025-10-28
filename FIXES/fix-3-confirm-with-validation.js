/**
 * FIX #3: Add Negative Value Protection to Stock Confirmation
 * 
 * This file contains the corrected version of confirmStockReservationAtomic
 * that prevents negative reserved values.
 * 
 * ISSUE: Original function could set reserved to negative values
 * FIX: Add check to ensure reserved >= quantity before decrementing
 * 
 * REPLACE: backend/utils/atomicStockOperations.js:108-156
 */

import mongoose from 'mongoose';
import productModel from '../models/productModel.js';
import { StockError, ValidationError } from './errorHandler.js';

/**
 * ATOMIC: Confirm stock reservation (reduce reserved count)
 * Uses atomic updateOne with validation to prevent negative reserved values
 * 
 * Flow:
 * 1. During checkout: stock--, reserved++ (reserveStockAtomic)
 * 2. On payment success: reserved-- (this function)
 * 3. Stock stays reduced (final deduction)
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
    // 🔑 ATOMIC CONFIRMATION WITH VALIDATION
    // Only confirm if reserved >= quantity (prevents negative values)
    const result = await productModel.updateOne(
      {
        _id: productId,
        sizes: {
          $elemMatch: {
            size: size,
            reserved: { $gte: quantity }  // 🔑 Ensure sufficient reserved stock
          }
        }
      },
      {
        $inc: {
          'sizes.$[elem].reserved': -quantity  // Only reduce reserved, stock already deducted
        }
      },
      {
        arrayFilters: [
          { 
            'elem.size': size,
            'elem.reserved': { $gte: quantity }  // Double-check in array filter
          }
        ],
        session
      }
    );

    const success = result.modifiedCount > 0;

    if (success) {
      console.log(`STOCK:CONFIRM:ATOMIC:SUCCESS: productId=${productId}, size=${size}, quantity=${quantity}, correlationId=${correlationId}, timestamp=${new Date().toISOString()}`);
    } else {
      // Confirmation failed - log current state for debugging
      console.log(`STOCK:CONFIRM:ATOMIC:FAILED: productId=${productId}, size=${size}, quantity=${quantity}, correlationId=${correlationId}, timestamp=${new Date().toISOString()}`);
      
      try {
        const product = await productModel.findById(productId, { sizes: 1 }).session(session);
        const sizeObj = product?.sizes?.find(s => s.size === size);
        
        if (sizeObj) {
          console.log(`STOCK:CONFIRM:STATE: productId=${productId}, size=${size}, currentStock=${sizeObj.stock}, currentReserved=${sizeObj.reserved}, requestedQuantity=${quantity}`);
          
          // Provide detailed error information
          if (sizeObj.reserved < quantity) {
            throw new StockError(`Insufficient reserved stock for confirmation. Reserved: ${sizeObj.reserved}, Requested: ${quantity}`, {
              productId,
              size,
              quantity,
              currentReserved: sizeObj.reserved,
              currentStock: sizeObj.stock,
              correlationId
            });
          }
        }
      } catch (debugError) {
        console.error(`STOCK:CONFIRM:DEBUG:ERROR: ${debugError.message}`);
      }
    }

    return success;

  } catch (error) {
    console.log(`STOCK:CONFIRM:ATOMIC:ERROR: productId=${productId}, size=${size}, quantity=${quantity}, error=${error.message}, correlationId=${correlationId}, timestamp=${new Date().toISOString()}`);
    throw error;
  }
}

/**
 * ATOMIC: Release stock reservation (restore stock and reduce reserved)
 * Used when payment fails or times out
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
    // 🔑 ATOMIC RELEASE: Restore stock and reduce reserved
    const result = await productModel.updateOne(
      {
        _id: productId,
        sizes: {
          $elemMatch: {
            size: size,
            reserved: { $gte: quantity }  // 🔑 Validate reserved amount
          }
        }
      },
      {
        $inc: {
          'sizes.$[elem].stock': quantity,      // Restore stock
          'sizes.$[elem].reserved': -quantity   // Release reservation
        }
      },
      {
        arrayFilters: [
          { 
            'elem.size': size,
            'elem.reserved': { $gte: quantity }
          }
        ],
        session
      }
    );

    const success = result.modifiedCount > 0;

    if (success) {
      console.log(`STOCK:RELEASE:ATOMIC:SUCCESS: productId=${productId}, size=${size}, quantity=${quantity}, correlationId=${correlationId}, timestamp=${new Date().toISOString()}`);
    } else {
      console.log(`STOCK:RELEASE:ATOMIC:FAILED: productId=${productId}, size=${size}, quantity=${quantity}, correlationId=${correlationId}, timestamp=${new Date().toISOString()}`);
      
      // Log current state for debugging
      try {
        const product = await productModel.findById(productId, { sizes: 1 }).session(session);
        const sizeObj = product?.sizes?.find(s => s.size === size);
        
        if (sizeObj) {
          console.log(`STOCK:RELEASE:STATE: productId=${productId}, size=${size}, currentStock=${sizeObj.stock}, currentReserved=${sizeObj.reserved}, requestedRelease=${quantity}`);
        }
      } catch (debugError) {
        console.error(`STOCK:RELEASE:DEBUG:ERROR: ${debugError.message}`);
      }
    }

    return success;

  } catch (error) {
    console.log(`STOCK:RELEASE:ATOMIC:ERROR: productId=${productId}, size=${size}, quantity=${quantity}, error=${error.message}, correlationId=${correlationId}, timestamp=${new Date().toISOString()}`);
    throw error;
  }
}

export default {
  confirmStockReservationAtomic,
  releaseStockReservationAtomic
};

