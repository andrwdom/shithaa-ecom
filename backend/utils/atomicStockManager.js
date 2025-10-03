/**
 * ATOMIC STOCK MANAGEMENT SYSTEM
 * 
 * This replaces the complex stock reservation system with a simple, atomic approach:
 * 1. Stock is only decremented AFTER payment confirmation
 * 2. No reservations or workers needed
 * 3. Race conditions eliminated through atomic operations
 * 4. Circuit breaker protection for all operations
 */

import mongoose from 'mongoose';
import productModel from '../models/productModel.js';
import { stockOperationBreaker } from './circuitBreaker.js';
import { StockError, SystemError, ValidationError, globalErrorHandler } from './errorHandler.js';
import { 
  deductStockAtomic, 
  restoreStockAtomic 
} from './atomicStockOperations.js';

/**
 * Atomic Stock Manager - Handles all stock operations with circuit breaker protection
 */
export class AtomicStockManager {
  constructor() {
    this.operationTimeout = 30000; // 30 seconds
  }

  /**
   * ATOMIC: Check stock availability without reserving
   * This is used during cart operations and checkout validation
   */
  async checkStockAvailability(productId, size, quantity, options = {}) {
    const { correlationId } = options;
    
    return await stockOperationBreaker.execute(async () => {
      try {
        if (!productId || !size || !quantity || quantity <= 0) {
          throw new ValidationError('Invalid stock check parameters', {
            productId, size, quantity, correlationId
          });
        }

        const product = await productModel.findById(productId);
        if (!product) {
          throw new StockError(`Product not found: ${productId}`, {
            productId, correlationId
          });
        }

        const sizeObj = product.sizes.find(s => s.size === size);
        if (!sizeObj) {
          throw new StockError(`Size ${size} not available for product`, {
            productId, size, availableSizes: product.sizes.map(s => s.size), correlationId
          });
        }

        const availableStock = sizeObj.stock || 0;
        const isAvailable = availableStock >= quantity;

        return {
          available: isAvailable,
          productId,
          productName: product.name,
          size,
          requestedQuantity: quantity,
          availableStock,
          message: isAvailable ? 'Stock available' : `Insufficient stock. Available: ${availableStock}, Requested: ${quantity}`
        };

      } catch (error) {
        const appError = globalErrorHandler.handleError(error, {
          operation: 'checkStockAvailability',
          productId, size, quantity, correlationId
        });
        throw appError;
      }
    });
  }

  /**
   * ATOMIC: Validate stock for multiple items
   * Used during checkout to validate entire cart
   */
  async validateCartStock(items, options = {}) {
    const { correlationId } = options;

    return await stockOperationBreaker.execute(async () => {
      try {
        if (!Array.isArray(items) || items.length === 0) {
          throw new ValidationError('Invalid items array for stock validation', {
            itemsCount: items?.length, correlationId
          });
        }

        const validations = [];
        const errors = [];

        for (const item of items) {
          try {
            const validation = await this.checkStockAvailability(
              item.productId || item._id, 
              item.size, 
              item.quantity,
              { correlationId }
            );
            validations.push(validation);

            if (!validation.available) {
              errors.push(validation.message);
            }
          } catch (error) {
            errors.push(`${item.name || 'Unknown product'}: ${error.message}`);
            validations.push({
              available: false,
              productId: item.productId || item._id,
              size: item.size,
              requestedQuantity: item.quantity,
              message: error.message
            });
          }
        }

        return {
          valid: errors.length === 0,
          validations,
          errors,
          message: errors.length === 0 ? 'All items available' : `Stock validation failed for ${errors.length} items`
        };

      } catch (error) {
        const appError = globalErrorHandler.handleError(error, {
          operation: 'validateCartStock',
          itemsCount: items.length,
          correlationId
        });
        throw appError;
      }
    });
  }

  /**
   * ATOMIC: Deduct stock after payment confirmation
   * This is the ONLY place where stock is actually decremented
   */
  async confirmAndDeductStock(items, options = {}) {
    const { session, correlationId } = options;

    return await stockOperationBreaker.execute(async () => {
      const startTime = Date.now();
      
      try {
        if (!Array.isArray(items) || items.length === 0) {
          throw new ValidationError('Invalid items array for stock deduction', {
            itemsCount: items?.length, correlationId
          });
        }

        const deductionResults = [];
        const failures = [];

        // Process each item atomically
        for (const item of items) {
          try {
            const productId = item.productId || item._id || item.id || item.product;
            const size = item.size;
            const quantity = item.quantity;

            if (!productId || !size || !quantity || quantity <= 0) {
              throw new ValidationError('Invalid item data for stock deduction', {
                item, correlationId
              });
            }

            // 🚨 CRITICAL FIX: Use atomic stock deduction to prevent race conditions
            const success = await deductStockAtomic(productId, size, quantity, { session, correlationId });

            if (!success) {
              // Get current stock for better error message
              const product = await productModel.findById(productId).session(session);
              const sizeObj = product?.sizes?.find(s => s.size === size);
              const currentStock = sizeObj?.stock || 0;

              throw new StockError(`Insufficient stock for ${item.name || 'product'}`, {
                productId,
                size,
                requestedQuantity: quantity,
                currentStock,
                correlationId
              });
            }

            deductionResults.push({
              productId,
              size,
              quantity,
              success: true,
              message: `Stock deducted: ${quantity} units`
            });

            console.log(`✅ [${correlationId}] Stock deducted atomically: ${quantity} units for product ${productId} size ${size}`);
            // 🚨 CRITICAL MITIGATION: Add structured logging for stock operations
            console.log(`STOCK:DEDUCT:SUCCESS: productId=${productId}, size=${size}, quantity=${quantity}, correlationId=${correlationId}, timestamp=${new Date().toISOString()}`);

          } catch (error) {
            failures.push({
              item,
              error: error.message,
              productId: item.productId || item._id,
              size: item.size,
              quantity: item.quantity
            });
            
            console.error(`❌ [${correlationId}] Failed to deduct stock for item:`, error.message);
          }
        }

        // If any item failed, the entire operation should be rolled back by the transaction
        if (failures.length > 0) {
          const errorMessage = `Stock deduction failed for ${failures.length} items: ${failures.map(f => f.error).join(', ')}`;
          throw new StockError(errorMessage, {
            failures,
            correlationId,
            processingTime: Date.now() - startTime
          });
        }

        return {
          success: true,
          deductedItems: deductionResults.length,
          results: deductionResults,
          processingTime: Date.now() - startTime,
          message: `Successfully deducted stock for ${deductionResults.length} items`
        };

      } catch (error) {
        const appError = globalErrorHandler.handleError(error, {
          operation: 'confirmAndDeductStock',
          itemsCount: items.length,
          correlationId,
          processingTime: Date.now() - startTime
        });
        throw appError;
      }
    });
  }

  /**
   * ATOMIC: Restore stock for cancelled/failed orders
   * Used when orders need to be cancelled or refunded
   */
  async restoreStock(items, reason = 'Order cancelled', options = {}) {
    const { session, correlationId } = options;

    return await stockOperationBreaker.execute(async () => {
      try {
        if (!Array.isArray(items) || items.length === 0) {
          throw new ValidationError('Invalid items array for stock restoration', {
            itemsCount: items?.length, correlationId
          });
        }

        const restorationResults = [];

        for (const item of items) {
          try {
            const productId = item.productId || item._id || item.id || item.product;
            const size = item.size;
            const quantity = item.quantity;

            if (!productId || !size || !quantity || quantity <= 0) {
              console.warn(`[${correlationId}] Skipping invalid item for stock restoration:`, item);
              continue;
            }

            // 🚨 CRITICAL FIX: Use atomic stock restoration to prevent race conditions
            const success = await restoreStockAtomic(productId, size, quantity, { session, correlationId });

            if (success) {
              restorationResults.push({
                productId,
                size,
                quantity,
                success: true
              });
              
              console.log(`✅ [${correlationId}] Stock restored: ${quantity} units for product ${productId} size ${size} - ${reason}`);
            } else {
              console.warn(`⚠️ [${correlationId}] No document modified when restoring stock for product ${productId} size ${size}`);
            }

          } catch (error) {
            console.error(`❌ [${correlationId}] Failed to restore stock for item:`, error.message);
          }
        }

        return {
          success: true,
          restoredItems: restorationResults.length,
          results: restorationResults,
          message: `Stock restored for ${restorationResults.length} items - ${reason}`
        };

      } catch (error) {
        const appError = globalErrorHandler.handleError(error, {
          operation: 'restoreStock',
          itemsCount: items.length,
          reason,
          correlationId
        });
        throw appError;
      }
    });
  }

  /**
   * Get stock health report
   */
  async getStockHealthReport(options = {}) {
    const { correlationId } = options;

    return await stockOperationBreaker.execute(async () => {
      try {
        const products = await productModel.find({}, 'name sizes.stock sizes.size');
        
        let totalProducts = 0;
        let totalStock = 0;
        let lowStockProducts = [];
        let outOfStockProducts = [];

        for (const product of products) {
          totalProducts++;
          
          for (const size of product.sizes) {
            const stock = size.stock || 0;
            totalStock += stock;
            
            if (stock === 0) {
              outOfStockProducts.push({
                productId: product._id,
                productName: product.name,
                size: size.size,
                stock: 0
              });
            } else if (stock < 10) {
              lowStockProducts.push({
                productId: product._id,
                productName: product.name,
                size: size.size,
                stock: stock
              });
            }
          }
        }

        return {
          success: true,
          summary: {
            totalProducts,
            totalStock,
            lowStockCount: lowStockProducts.length,
            outOfStockCount: outOfStockProducts.length,
            healthScore: this.calculateStockHealthScore({
              lowStockCount: lowStockProducts.length,
              outOfStockCount: outOfStockProducts.length,
              totalProducts
            })
          },
          issues: {
            lowStockProducts: lowStockProducts.slice(0, 20),
            outOfStockProducts: outOfStockProducts.slice(0, 20)
          },
          timestamp: new Date()
        };

      } catch (error) {
        const appError = globalErrorHandler.handleError(error, {
          operation: 'getStockHealthReport',
          correlationId
        });
        throw appError;
      }
    });
  }

  calculateStockHealthScore({ lowStockCount, outOfStockCount, totalProducts }) {
    if (totalProducts === 0) return 100;
    
    let score = 100;
    
    // Deduct points for out of stock
    if (outOfStockCount > 0) {
      score -= Math.min(40, (outOfStockCount / totalProducts) * 100);
    }
    
    // Deduct points for low stock
    if (lowStockCount > 0) {
      score -= Math.min(30, (lowStockCount / totalProducts) * 50);
    }
    
    return Math.max(0, Math.round(score));
  }
}

// Global atomic stock manager instance
export const atomicStockManager = new AtomicStockManager();

// Legacy compatibility - export functions that use the atomic manager
export const checkStockAvailability = (productId, size, quantity, options = {}) => 
  atomicStockManager.checkStockAvailability(productId, size, quantity, options);

export const validateStockForItems = (items, options = {}) => 
  atomicStockManager.validateCartStock(items, options);

export const confirmStockReservation = (productId, size, quantity, options = {}) =>
  atomicStockManager.confirmAndDeductStock([{ productId, size, quantity }], options);

export const restoreProductStock = (items, reason, options = {}) =>
  atomicStockManager.restoreStock(items, reason, options);

export default atomicStockManager;
