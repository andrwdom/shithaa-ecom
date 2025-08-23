import mongoose from 'mongoose';
import productModel from '../models/productModel.js';

/**
 * Atomic stock change utility
 * @param {string} productId - Product ID
 * @param {string} size - Size to modify
 * @param {number} quantityChange - Positive for increment, negative for decrement
 * @param {Object} options - Additional options like session for transactions
 * @returns {Promise<Object>} - Result of the operation
 */
export async function changeStock(productId, size, quantityChange, options = {}) {
    const { session } = options;
    
    // Validate inputs
    if (!productId || !size || typeof quantityChange !== 'number') {
        throw new Error('Invalid parameters: productId, size, and quantityChange are required');
    }
    
    // For decrements, ensure we have enough stock
    // For increments, ensure we don't go negative
    const stockCondition = quantityChange > 0 
        ? { 'sizes.stock': { $gte: 0 } }  // Allow any increment
        : { 'sizes.stock': { $gte: -quantityChange } };  // Ensure sufficient stock for decrement
    
    const result = await productModel.updateOne(
        {
            _id: productId,
            'sizes.size': size,
            ...stockCondition
        },
        {
            $inc: { 'sizes.$.stock': quantityChange }
        },
        { session }
    );
    
    if (result.modifiedCount === 0) {
        const errorMsg = quantityChange > 0 
            ? 'Stock increment failed: product or size not found'
            : 'Stock decrement failed: insufficient stock or concurrent change';
        throw new Error(errorMsg);
    }
    
    return {
        success: true,
        modifiedCount: result.modifiedCount,
        productId,
        size,
        quantityChange
    };
}

/**
 * Atomic stock reservation (decrement with validation)
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
    
    // First check if stock is available before attempting reservation
    const stockCheck = await checkStockAvailability(productId, size, quantity);
    if (!stockCheck.available) {
        throw new Error(`Stock reservation failed: ${stockCheck.error}`);
    }
    
    // Additional validation: ensure stock is not negative
    if (stockCheck.currentStock < 0) {
        throw new Error(`Stock reservation failed: Product ${stockCheck.productName} size ${size} has corrupted stock (${stockCheck.currentStock}). Please contact admin.`);
    }
    
    try {
        return await changeStock(productId, size, -quantity, options);
    } catch (error) {
        // Enhanced error message with stock details
        const currentStock = await checkStockAvailability(productId, size, 1);
        throw new Error(`Stock reservation failed for ${currentStock.productName} size ${size}: ${error.message}. Current stock: ${currentStock.currentStock}, Requested: ${quantity}`);
    }
}

/**
 * Atomic stock release (increment for failed payments/cancellations)
 * @param {string} productId - Product ID
 * @param {string} size - Size to release
 * @param {number} quantity - Quantity to release
 * @param {Object} options - Additional options
 * @returns {Promise<Object>} - Result of the release
 */
export async function releaseStock(productId, size, quantity, options = {}) {
    if (quantity <= 0) {
        throw new Error('Quantity must be positive for release');
    }
    
    return await changeStock(productId, size, quantity, options);
}

/**
 * Batch stock operations without transactions (for standalone MongoDB)
 * @param {Array} operations - Array of { productId, size, quantityChange } objects
 * @returns {Promise<Array>} - Results of all operations
 */
export async function batchChangeStock(operations) {
    try {
        const batchResults = [];
        
        // Process operations sequentially without transactions
        for (const op of operations) {
            const result = await changeStock(
                op.productId, 
                op.size, 
                op.quantityChange
            );
            batchResults.push(result);
        }
        
        return batchResults;
    } catch (error) {
        console.error('Batch stock operation failed:', error);
        throw error;
    }
}

/**
 * Check stock availability without modifying
 * @param {string} productId - Product ID
 * @param {string} size - Size to check
 * @param {number} quantity - Quantity needed
 * @returns {Promise<Object>} - Stock availability info
 */
export async function checkStockAvailability(productId, size, quantity) {
    const product = await productModel.findById(productId);
    if (!product) {
        return { available: false, error: 'Product not found' };
    }
    
    const sizeObj = product.sizes.find(s => s.size === size);
    if (!sizeObj) {
        return { available: false, error: 'Size not available' };
    }
    
    const available = sizeObj.stock >= quantity;
    console.log(`Stock check for ${product.name} (${size}): Available=${sizeObj.stock}, Requested=${quantity}`);
    return {
        available,
        currentStock: sizeObj.stock,
        requestedQuantity: quantity,
        productName: product.name,
        error: available ? null : `Insufficient stock for ${product.name} (${size}). Available: ${sizeObj.stock}, Requested: ${quantity}`
    };
}

/**
 * Validate multiple items for stock availability
 * @param {Array} items - Array of { _id, size, quantity } objects
 * @returns {Promise<Array>} - Validation results for each item
 */
export async function validateStockForItems(items) {
    const validations = [];
    
    for (const item of items) {
        // 🔑 CRITICAL FIX: Prioritize `productId` from the session item schema.
        // The subdocument `_id` is NOT the product ID.
        const productId = item.productId || item._id || item.id;
        if (!productId) {
            validations.push({
                item,
                available: false,
                error: `Product ID not found for item: ${item.name}`
            });
            continue;
        }

        const validation = await checkStockAvailability(productId, item.size, item.quantity);
        validations.push({
            item,
            ...validation
        });
    }
    
    return validations;
} 