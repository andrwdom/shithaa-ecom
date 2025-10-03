import mongoose from 'mongoose';
import productModel from '../models/productModel.js';
import Reservation from '../models/Reservation.js';
import CheckoutSession from '../models/CheckoutSession.js';
import { trackStockReservation } from './monitoring.js';
import { 
  reserveStockAtomic, 
  confirmStockReservationAtomic, 
  releaseStockReservationAtomic,
  deductStockAtomic,
  restoreStockAtomic
} from './atomicStockOperations.js';

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

        // 🔧 CRITICAL FIX: Don't trust the `reserved` field blindly.
        // Recalculate the real-time reserved count from active sessions to prevent stuck stock.
        const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);

        const activeReservations = await CheckoutSession.aggregate([
            // Match sessions that are recent and could hold a reservation
            { $match: { 
                status: { $in: ['pending', 'awaiting_payment'] },
                stockReserved: true,
                createdAt: { $gte: tenMinutesAgo }, // Look at sessions from the last 10 mins
                'items.productId': new mongoose.Types.ObjectId(productId),
                'items.size': size
            }},
            // Unwind the items array to process each item
            { $unwind: '$items' },
            // Match the specific item we're checking
            { $match: {
                'items.productId': new mongoose.Types.ObjectId(productId),
                'items.size': size
            }},
            // Group and sum the quantities to get the real reserved count
            { $group: {
                _id: null,
                totalReserved: { $sum: '$items.quantity' }
            }}
        ]);

        const totalReserved = activeReservations[0]?.totalReserved || 0;

        // 🔧 CRITICAL FIX: If the product's reserved count is wrong, fix it immediately
        if (sizeObj.reserved !== totalReserved) {
            console.log(`🔧 Fixing incorrect reserved count for ${product.name} size ${size}: ${sizeObj.reserved} → ${totalReserved}`);
            await productModel.updateOne(
                { _id: productId, 'sizes.size': size },
                { $set: { 'sizes.$.reserved': totalReserved } }
            );
            // Update the local object too for accurate logging
            sizeObj.reserved = totalReserved;
        }

        const availableStock = Math.max(0, sizeObj.stock - totalReserved);
        const isAvailable = availableStock >= quantity;

        // Add debug logging for stock issues
        if (!isAvailable) {
            console.log(`🔍 Stock availability check failed for ${product.name} (${productId}) size ${size}:`, {
                currentStock: sizeObj.stock,
                currentReserved: totalReserved,
                availableStock: availableStock,
                requestedQuantity: quantity,
                excludeSessionId: excludeSessionId
            });
        }

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
    // 🚨 CRITICAL FIX: Use atomic operation to prevent race conditions
    return await reserveStockAtomic(productId, size, quantity, options);
}

/**
 * Confirm stock reservation with transaction support (ATOMIC VERSION)
 * @param {string} productId - Product ID
 * @param {string} size - Size to confirm
 * @param {number} quantity - Quantity to confirm
 * @param {Object} options - Additional options including session
 * @returns {Promise<boolean>} - Result of the confirmation
 */
export async function confirmStockReservation(productId, size, quantity, options = {}) {
    // 🚨 CRITICAL FIX: Use atomic operation to prevent race conditions
    return await confirmStockReservationAtomic(productId, size, quantity, options);
}

// REMOVED: emergencyStockDeduction function - eliminated to prevent overselling risk
// With atomic stock operations, emergency fallback is no longer needed

/**
 * Release stock reservation (decrement reserved field only)
 * @param {string} productId - Product ID
 * @param {string} size - Size to release
 * @param {number} quantity - Quantity to release
 * @param {Object} options - Additional options
 * @returns {Promise<Object>} - Result of the release
 */
export async function releaseStockReservation(productId, size, quantity, options = {}) {
    // 🚨 CRITICAL FIX: Use atomic operation to prevent race conditions
    return await releaseStockReservationAtomic(productId, size, quantity, options);
}

/**
 * Atomic batch reservation - reserves multiple items (non-transactional for standalone MongoDB)
 * @param {Array} items - Array of { productId, size, quantity } objects
 * @param {Object} options - Additional options
 * @returns {Promise<Object>} - Results of the batch reservation
 */
export async function atomicBatchReservation(items, options = {}) {
    try {
        console.log(`🔄 Starting batch reservation for ${items.length} items`);
        
        const results = [];
        const failedItems = [];
        
        // Process each item with atomic individual operations
        for (const item of items) {
            try {
                const result = await reserveStock(item.productId, item.size, item.quantity);
                results.push({
                    ...item,
                    success: true,
                    ...result
                });
                console.log(`✅ Reserved item: ${item.productId} size ${item.size} qty ${item.quantity}`);
            } catch (error) {
                console.error(`❌ Failed to reserve item:`, item, error.message);
                failedItems.push({
                    ...item,
                    success: false,
                    error: error.message
                });
            }
        }
        
        // If any item failed, release all successfully reserved items
        if (failedItems.length > 0) {
            console.error(`❌ Batch reservation failed: ${failedItems.length} items failed`);
            
            // Release any successfully reserved items
            for (const result of results) {
                if (result.success) {
                    try {
                        await releaseStockReservation(result.productId, result.size, result.quantity);
                        console.log(`🔄 Released item during rollback: ${result.productId} size ${result.size}`);
                    } catch (releaseError) {
                        console.error(`❌ Failed to release reserved item during rollback:`, releaseError);
                    }
                }
            }
            
            throw new Error(`Batch reservation failed: ${failedItems.length} items could not be reserved. First error: ${failedItems[0].error}`);
        }
        
        console.log(`✅ Batch reservation completed successfully for ${results.length} items`);
        
        return {
            success: true,
            results,
            totalItems: items.length,
            successfulItems: results.length,
            failedItems: 0
        };
        
    } catch (error) {
        console.error('❌ Batch reservation failed:', error);
        throw error;
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
    throw new Error('reserveStockLegacy is deprecated and disabled. Use reserveStock from the new atomic reservation system.');
}

/**
 * Legacy function for backward compatibility
 * @deprecated Use releaseStockReservation instead
 */
export async function releaseStock(productId, size, quantity, options = {}) {
    throw new Error('releaseStock is deprecated and disabled. Use releaseStockReservation from the new atomic reservation system.');
}

/**
 * Legacy function for backward compatibility
 * @deprecated Use atomic stock operations instead
 */
export async function changeStock(productId, size, quantityChange, options = {}) {
    throw new Error('changeStock is deprecated and disabled. Use atomic stock operations from the new reservation system.');
    
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

/**
 * Clean up inconsistent stock data by resetting reserved fields to 0
 * This is a utility function to fix any products with incorrect reserved values
 * @returns {Promise<Object>} - Cleanup results
 */
export async function cleanupStockReservations() {
    try {
        console.log('🧹 Starting stock reservation cleanup...');
        
        // Reset all reserved fields to 0
        const result = await productModel.updateMany(
            {},
            { $set: { 'sizes.$[].reserved': 0 } }
        );
        
        console.log(`🧹 Stock cleanup completed: ${result.modifiedCount} products updated`);
        
        return {
            success: true,
            modifiedCount: result.modifiedCount,
            message: `Reset reserved fields for ${result.modifiedCount} products`
        };
    } catch (error) {
        console.error('❌ Stock cleanup failed:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * CRITICAL: Clean up expired stock reservations
 * This prevents stock from being stuck in "reserved" state indefinitely
 * Should be run as a cron job every 15-30 minutes
 * @returns {Promise<Object>} - Cleanup results
 */
export async function cleanupExpiredReservations() {
    try {
        console.log('🧹 Starting expired reservation cleanup...');
        
        const now = new Date();
        const timeoutMinutes = 5; // 🚨 CRITICAL MITIGATION: Reduced from 30 to 5 minutes for faster cleanup
        const timeoutDate = new Date(now.getTime() - (timeoutMinutes * 60 * 1000));
        
        // Find expired reservations
        const expiredReservations = await Reservation.find({
            status: 'active',
            createdAt: { $lt: timeoutDate }
        });
        
        if (expiredReservations.length === 0) {
            console.log('✅ No expired reservations found');
            return {
                success: true,
                expiredCount: 0,
                releasedItems: 0,
                message: 'No expired reservations to clean up'
            };
        }
        
        console.log(`🔍 Found ${expiredReservations.length} expired reservations`);
        
        let totalReleasedItems = 0;
        const session = await mongoose.startSession();
        
        try {
            await session.withTransaction(async () => {
                for (const reservation of expiredReservations) {
                    console.log(`🔄 Releasing expired reservation: ${reservation._id}`);
                    
                    // Release stock for each item in the reservation
                    for (const item of reservation.items) {
                        try {
                            const released = await releaseStockReservation(
                                item.productId,
                                item.size,
                                item.quantity,
                                { session }
                            );
                            
                            if (released) {
                                totalReleasedItems++;
                                console.log(`✅ Released ${item.quantity} units of ${item.productId} size ${item.size}`);
                            }
                        } catch (error) {
                            console.error(`❌ Failed to release stock for item:`, error);
                        }
                    }
                    
                    // Mark reservation as expired
                    await Reservation.findByIdAndUpdate(
                        reservation._id,
                        { 
                            status: 'expired',
                            expiredAt: now,
                            reason: 'Timeout cleanup'
                        },
                        { session }
                    );
                }
            });
            
            console.log(`✅ Expired reservation cleanup completed: ${totalReleasedItems} items released from ${expiredReservations.length} reservations`);
            
            return {
                success: true,
                expiredCount: expiredReservations.length,
                releasedItems: totalReleasedItems,
                message: `Released ${totalReleasedItems} items from ${expiredReservations.length} expired reservations`
            };
            
        } finally {
            await session.endSession();
        }
        
    } catch (error) {
        console.error('❌ Expired reservation cleanup failed:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * CRITICAL: Get stock health report
 * Shows current stock status and identifies potential issues
 * @returns {Promise<Object>} - Stock health report
 */
export async function getStockHealthReport() {
    try {
        console.log('📊 Generating stock health report...');
        
        // Get all products with stock data
        const products = await productModel.find({}, 'name sizes.stock sizes.reserved sizes.size');
        
        let totalProducts = 0;
        let productsWithStock = 0;
        let productsWithReservations = 0;
        let totalStock = 0;
        let totalReserved = 0;
        let lowStockProducts = [];
        let stuckReservations = [];
        
        for (const product of products) {
            totalProducts++;
            
            for (const size of product.sizes) {
                const stock = size.stock || 0;
                const reserved = size.reserved || 0;
                const available = Math.max(0, stock - reserved);
                
                totalStock += stock;
                totalReserved += reserved;
                
                if (stock > 0) {
                    productsWithStock++;
                }
                
                if (reserved > 0) {
                    productsWithReservations++;
                }
                
                // Flag low stock (less than 5 available)
                if (available < 5 && stock > 0) {
                    lowStockProducts.push({
                        productId: product._id,
                        productName: product.name,
                        size: size.size,
                        stock: stock,
                        reserved: reserved,
                        available: available
                    });
                }
                
                // Flag potentially stuck reservations (more than 50% of stock reserved)
                if (reserved > 0 && reserved > (stock * 0.5)) {
                    stuckReservations.push({
                        productId: product._id,
                        productName: product.name,
                        size: size.size,
                        stock: stock,
                        reserved: reserved,
                        reservedPercentage: Math.round((reserved / stock) * 100)
                    });
                }
            }
        }
        
        // Check for expired reservations
        const now = new Date();
        const timeoutDate = new Date(now.getTime() - (5 * 60 * 1000)); // 🚨 CRITICAL MITIGATION: Reduced from 30 to 5 minutes ago
        const expiredReservations = await Reservation.countDocuments({
            status: 'active',
            createdAt: { $lt: timeoutDate }
        });
        
        const healthScore = calculateHealthScore({
            totalProducts,
            productsWithStock,
            productsWithReservations,
            totalStock,
            totalReserved,
            lowStockProducts: lowStockProducts.length,
            stuckReservations: stuckReservations.length,
            expiredReservations
        });
        
        return {
            success: true,
            healthScore,
            summary: {
                totalProducts,
                productsWithStock,
                productsWithReservations,
                totalStock,
                totalReserved,
                availableStock: Math.max(0, totalStock - totalReserved),
                lowStockCount: lowStockProducts.length,
                stuckReservationCount: stuckReservations.length,
                expiredReservationCount: expiredReservations
            },
            issues: {
                lowStockProducts: lowStockProducts.slice(0, 10), // Top 10
                stuckReservations: stuckReservations.slice(0, 10), // Top 10
                expiredReservations
            },
            recommendations: generateStockRecommendations({
                lowStockProducts: lowStockProducts.length,
                stuckReservations: stuckReservations.length,
                expiredReservations
            })
        };
        
    } catch (error) {
        console.error('❌ Stock health report failed:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Calculate stock health score (0-100)
 */
function calculateHealthScore(metrics) {
    let score = 100;
    
    // Deduct points for issues
    if (metrics.lowStockProducts > 0) {
        score -= Math.min(20, metrics.lowStockProducts * 2);
    }
    
    if (metrics.stuckReservations > 0) {
        score -= Math.min(30, metrics.stuckReservations * 3);
    }
    
    if (metrics.expiredReservations > 0) {
        score -= Math.min(40, metrics.expiredReservations * 4);
    }
    
    // Deduct points for high reservation ratio
    const reservationRatio = metrics.totalReserved / Math.max(1, metrics.totalStock);
    if (reservationRatio > 0.3) {
        score -= Math.min(20, (reservationRatio - 0.3) * 100);
    }
    
    return Math.max(0, Math.round(score));
}

/**
 * Generate stock management recommendations
 */
function generateStockRecommendations(metrics) {
    const recommendations = [];
    
    if (metrics.lowStockProducts > 0) {
        recommendations.push({
            priority: 'HIGH',
            action: 'Restock low inventory items',
            description: `${metrics.lowStockProducts} products have low stock levels`
        });
    }
    
    if (metrics.stuckReservations > 0) {
        recommendations.push({
            priority: 'HIGH',
            action: 'Investigate stuck reservations',
            description: `${metrics.stuckReservations} products have high reservation ratios`
        });
    }
    
    if (metrics.expiredReservations > 0) {
        recommendations.push({
            priority: 'CRITICAL',
            action: 'Run expired reservation cleanup',
            description: `${metrics.expiredReservations} reservations have expired and need cleanup`
        });
    }
    
    if (recommendations.length === 0) {
        recommendations.push({
            priority: 'INFO',
            action: 'Stock system is healthy',
            description: 'No immediate issues detected'
        });
    }
    
    return recommendations;
} 