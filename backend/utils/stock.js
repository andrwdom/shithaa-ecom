import mongoose from 'mongoose';
import productModel from '../models/productModel.js';
import Reservation from '../models/Reservation.js';

/**
 * Check stock availability considering reservations
 * @param {string} productId - Product ID
 * @param {string} size - Size to check
 * @param {number} quantity - Quantity needed
 * @param {string} excludeSessionId - Session ID to exclude from reservation check
 * @returns {Promise<Object>} - Stock availability info
 */
export async function checkStockAvailability(productId, size, quantity, excludeSessionId = null) {
    try {
        const product = await productModel.findById(productId);
        if (!product) {
            return {
                available: false,
                error: 'Product not found',
                productName: 'Unknown',
                currentStock: 0,
                currentReserved: 0,
                availableStock: 0
            };
        }

        const sizeObj = product.sizes.find(s => s.size === size);
        if (!sizeObj) {
            return {
                available: false,
                error: `Size ${size} not available for this product`,
                productName: product.name,
                currentStock: 0,
                currentReserved: 0,
                availableStock: 0
            };
        }

        // Calculate total reserved stock for this product/size
        let totalReserved = 0;
        if (excludeSessionId) {
            // Exclude current session's reservations when checking availability
            const otherReservations = await Reservation.find({
                'items.productId': productId,
                'items.size': size,
                status: 'active',
                checkoutSessionId: { $ne: excludeSessionId }
            });
            
            totalReserved = otherReservations.reduce((sum, res) => {
                const item = res.items.find(i => i.productId.toString() === productId.toString() && i.size === size);
                return sum + (item ? item.quantity : 0);
            }, 0);
        } else {
            // Get all active reservations for this product/size
            const reservations = await Reservation.find({
                'items.productId': productId,
                'items.size': size,
                status: 'active'
            });
            
            totalReserved = reservations.reduce((sum, res) => {
                const item = res.items.find(i => i.productId.toString() === productId.toString() && i.size === size);
                return sum + (item ? item.quantity : 0);
            }, 0);
        }

        const availableStock = Math.max(0, sizeObj.stock - totalReserved);
        const isAvailable = availableStock >= quantity;

        return {
            available: isAvailable,
            error: isAvailable ? null : `Insufficient stock. Available: ${availableStock}, Requested: ${quantity}`,
            productName: product.name,
            currentStock: sizeObj.stock,
            currentReserved: totalReserved,
            availableStock: availableStock,
            requestedQuantity: quantity
        };
    } catch (error) {
        console.error('Error checking stock availability:', error);
        return {
            available: false,
            error: `Error checking stock: ${error.message}`,
            productName: 'Unknown',
            currentStock: 0,
            currentReserved: 0,
            availableStock: 0
        };
    }
}

/**
 * Reserve stock for checkout session (increment reserved field)
 * @param {string} productId - Product ID
 * @param {string} size - Size to reserve
 * @param {number} quantity - Quantity to reserve
 * @param {Object} options - Additional options
 * @returns {Promise<Object>} - Result of the reservation
 */
export async function reserveStock(productId, size, quantity, options = {}) {
    if (quantity <= 0) {
        throw new Error('Quantity must be positive for reservation');
    }
    
    const { session } = options;
    
    try {
        // Check if we have enough available stock
        const stockCheck = await checkStockAvailability(productId, size, quantity);
        if (!stockCheck.available) {
            throw new Error(`Stock reservation failed: ${stockCheck.error}`);
        }
        
        // Increment the reserved field atomically
        const result = await productModel.updateOne(
            {
                _id: productId,
                'sizes.size': size,
                'sizes.stock': { $gte: quantity } // Ensure we have physical stock
            },
            {
                $inc: { 'sizes.$.reserved': quantity }
            },
            { session }
        );
        
        if (result.modifiedCount === 0) {
            throw new Error(`Failed to reserve stock for product ${productId} size ${size}`);
        }
        
        console.log(`Stock reserved successfully: ${quantity} units for product ${productId} size ${size}`);
        
        return {
            success: true,
            productId,
            size,
            quantity,
            reserved: quantity
        };
    } catch (error) {
        console.error('Stock reservation failed:', error);
        throw error;
    }
}

/**
 * Confirm stock reservation (decrement stock and reserved fields)
 * @param {string} productId - Product ID
 * @param {string} size - Size to confirm
 * @param {number} quantity - Quantity to confirm
 * @param {Object} options - Additional options
 * @returns {Promise<Object>} - Result of the confirmation
 */
export async function confirmStockReservation(productId, size, quantity, options = {}) {
    if (quantity <= 0) {
        throw new Error('Quantity must be positive for confirmation');
    }
    
    const { session } = options;
    
    try {
        // 🔑 CRITICAL: Use atomic update with both stock and reserved validation
        const result = await productModel.updateOne(
            {
                _id: productId,
                'sizes.size': size,
                'sizes.stock': { $gte: quantity },
                'sizes.reserved': { $gte: quantity }
            },
            {
                $inc: { 
                    'sizes.$.stock': -quantity,
                    'sizes.$.reserved': -quantity
                }
            },
            { session }
        );
        
        // 🔑 CRITICAL: Return boolean success indicator for idempotency
        const success = !!(result && (result.modifiedCount > 0 || result.nModified > 0));
        
        if (success) {
            console.log(`Stock reservation confirmed: ${quantity} units for product ${productId} size ${size}`);
        } else {
            console.warn(`Stock confirmation failed - no matching document: product ${productId} size ${size}`);
        }
        
        return success;
    } catch (error) {
        console.error('Stock confirmation failed:', error);
        return false; // 🔑 CRITICAL: Return false instead of throwing for idempotency
    }
}

/**
 * Release stock reservation (decrement reserved field only)
 * @param {string} productId - Product ID
 * @param {string} size - Size to release
 * @param {number} quantity - Quantity to release
 * @param {Object} options - Additional options
 * @returns {Promise<Object>} - Result of the release
 */
export async function releaseStockReservation(productId, size, quantity, options = {}) {
    if (quantity <= 0) {
        throw new Error('Quantity must be positive for release');
    }
    
    const { session } = options;
    
    try {
        // 🔑 CRITICAL: Decrement only the reserved field atomically
        const result = await productModel.updateOne(
            {
                _id: productId,
                'sizes.size': size,
                'sizes.reserved': { $gte: quantity }
            },
            {
                $inc: { 'sizes.$.reserved': -quantity }
            },
            { session }
        );
        
        // 🔑 CRITICAL: Return boolean success indicator for idempotency
        const success = !!(result && (result.modifiedCount > 0 || result.nModified > 0));
        
        if (success) {
            console.log(`Stock reservation released: ${quantity} units for product ${productId} size ${size}`);
        } else {
            console.warn(`Stock release failed - no matching document: product ${productId} size ${size}`);
        }
        
        return success;
    } catch (error) {
        console.error('Stock release failed:', error);
        return false; // 🔑 CRITICAL: Return false instead of throwing for idempotency
    }
}

/**
 * Batch stock operations with reservations
 * @param {Array} operations - Array of { productId, size, quantityChange, operationType } objects
 * @param {Object} options - Additional options
 * @returns {Promise<Array>} - Results of all operations
 */
export async function batchStockOperations(operations, options = {}) {
    const { session } = options;
    
    try {
        const batchResults = [];
        
        for (const op of operations) {
            let result;
            
            switch (op.operationType) {
                case 'reserve':
                    result = await reserveStock(op.productId, op.size, op.quantity, { session });
                    break;
                case 'confirm':
                    result = await confirmStockReservation(op.productId, op.size, op.quantity, { session });
                    break;
                case 'release':
                    result = await releaseStockReservation(op.productId, op.size, op.quantity, { session });
                    break;
                default:
                    throw new Error(`Unknown operation type: ${op.operationType}`);
            }
            
            batchResults.push(result);
        }
        
        return batchResults;
    } catch (error) {
        console.error('Batch stock operations failed:', error);
        throw error;
    }
}

/**
 * Legacy function for backward compatibility
 * @deprecated Use reserveStock instead
 */
export async function reserveStockLegacy(productId, size, quantity, options = {}) {
    console.warn('reserveStockLegacy is deprecated. Use reserveStock from the new reservation system.');
    return await reserveStock(productId, size, quantity, options);
}

/**
 * Legacy function for backward compatibility
 * @deprecated Use releaseStockReservation instead
 */
export async function releaseStock(productId, size, quantity, options = {}) {
    console.warn('releaseStock is deprecated. Use releaseStockReservation from the new reservation system.');
    return await releaseStockReservation(productId, size, quantity, options);
}

/**
 * Legacy function for backward compatibility
 * @deprecated Use changeStock with proper operation type instead
 */
export async function changeStock(productId, size, quantityChange, options = {}) {
    console.warn('changeStock is deprecated. Use the new reservation-aware functions instead.');
    
    if (quantityChange > 0) {
        // Increment stock
        const result = await productModel.updateOne(
            {
                _id: productId,
                'sizes.size': size
            },
            {
                $inc: { 'sizes.$.stock': quantityChange }
            },
            { session: options.session }
        );
        
        if (result.modifiedCount === 0) {
            throw new Error('Stock increment failed: product or size not found');
        }
        
        return {
            success: true,
            modifiedCount: result.modifiedCount,
            productId,
            size,
            quantityChange
        };
    } else {
        // Decrement stock (legacy behavior)
        const result = await productModel.updateOne(
            {
                _id: productId,
                'sizes.size': size,
                'sizes.stock': { $gte: -quantityChange }
            },
            {
                $inc: { 'sizes.$.stock': quantityChange }
            },
            { session: options.session }
        );
        
        if (result.modifiedCount === 0) {
            throw new Error('Stock decrement failed: insufficient stock or concurrent change');
        }
        
        return {
            success: true,
            modifiedCount: result.modifiedCount,
            productId,
            size,
            quantityChange
        };
    }
}

/**
 * Validate stock for multiple items considering reservations
 * @param {Array} items - Array of items to validate
 * @param {string} excludeSessionId - Session ID to exclude from reservation check
 * @returns {Promise<Array>} - Validation results for each item
 */
export async function validateStockForItems(items, excludeSessionId = null) {
    const validations = [];
    
    for (const item of items) {
        const productId = item.productId || item._id;
        const validation = await checkStockAvailability(productId, item.size, item.quantity, excludeSessionId);
        validations.push({
            ...validation,
            itemId: item._id || item.id,
            productId,
            size: item.size,
            quantity: item.quantity
        });
    }
    
    return validations;
} 