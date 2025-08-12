import productModel from "../models/productModel.js"
import mongoose from "mongoose"

// Reserve stock for checkout (atomic operation with race condition prevention)
const reserveStock = async (items, session = null) => {
    const useSession = session || await mongoose.startSession();
    const shouldStartTransaction = !session;
    
    if (shouldStartTransaction) {
        useSession.startTransaction();
    }
    
    try {
        const reservedItems = [];
        const stockUpdates = [];
        
        // First pass: validate all items and prepare stock updates
        for (const item of items) {
            if (!item._id || !item.size || !item.quantity) {
                throw new Error(`Invalid item data: ${JSON.stringify(item)}`);
            }
            
            const product = await productModel.findById(item._id).session(useSession);
            if (!product) {
                throw new Error(`Product not found: ${item._id}`);
            }
            
            const sizeObj = product.sizes.find(s => s.size === item.size);
            if (!sizeObj) {
                throw new Error(`Size ${item.size} not available for product ${product.name}`);
            }
            
            if (sizeObj.stock < item.quantity) {
                throw new Error(`Insufficient stock for ${product.name} size ${item.size}. Requested: ${item.quantity}, Available: ${sizeObj.stock}`);
            }
            
            // Prepare stock update
            stockUpdates.push({
                productId: product._id,
                size: item.size,
                currentStock: sizeObj.stock,
                newStock: sizeObj.stock - item.quantity,
                quantity: item.quantity
            });
            
            reservedItems.push({
                ...item,
                productName: product.name,
                originalStock: sizeObj.stock
            });
        }
        
        // Second pass: apply all stock updates atomically with optimistic locking
        for (const update of stockUpdates) {
            const result = await productModel.updateOne(
                {
                    _id: update.productId,
                    'sizes.size': update.size,
                    'sizes.stock': { $gte: update.quantity }
                },
                {
                    $inc: { 'sizes.$.stock': -update.quantity }
                },
                { session: useSession }
            );
            
            if (result.modifiedCount === 0) {
                throw new Error(`Failed to update stock for product ${update.productId} size ${update.size}. Stock may have changed.`);
            }
        }
        
        if (shouldStartTransaction) {
            await useSession.commitTransaction();
        }
        
        // Log successful stock reservation
        console.log(`Stock reserved successfully for ${reservedItems.length} items:`, 
            reservedItems.map(item => `${item.productName} ${item.size} x${item.quantity}`));
        
        return reservedItems;
        
    } catch (error) {
        if (shouldStartTransaction) {
            await useSession.abortTransaction();
        }
        console.error('Stock reservation failed:', error);
        throw error;
    } finally {
        if (shouldStartTransaction) {
            useSession.endSession();
        }
    }
};

// Release reserved stock (for failed payments, cancellations, etc.)
const releaseStock = async (items, session = null) => {
    const useSession = session || await mongoose.startSession();
    const shouldStartTransaction = !session;
    
    if (shouldStartTransaction) {
        useSession.startTransaction();
    }
    
    try {
        const stockReleases = [];
        
        for (const item of items) {
            if (!item._id || !item.size || !item.quantity) {
                console.warn(`Invalid item data for stock release: ${JSON.stringify(item)}`);
                continue;
            }
            
            const product = await productModel.findById(item._id).session(useSession);
            if (!product) {
                console.warn(`Product not found for stock release: ${item._id}`);
                continue;
            }
            
            const sizeObj = product.sizes.find(s => s.size === item.size);
            if (!sizeObj) {
                console.warn(`Size ${item.size} not found for product ${product.name}`);
                continue;
            }
            
            stockReleases.push({
                productId: product._id,
                size: item.size,
                currentStock: sizeObj.stock,
                newStock: sizeObj.stock + item.quantity,
                quantity: item.quantity,
                productName: product.name
            });
        }
        
        // Apply all stock releases atomically
        for (const release of stockReleases) {
            await productModel.updateOne(
                { _id: release.productId, 'sizes.size': release.size },
                { $inc: { 'sizes.$.stock': release.quantity } },
                { session: useSession }
            );
        }
        
        if (shouldStartTransaction) {
            await useSession.commitTransaction();
        }
        
        // Log successful stock release
        console.log(`Stock released successfully for ${stockReleases.length} items:`, 
            stockReleases.map(item => `${item.productName} ${item.size} x${item.quantity}`));
        
        return stockReleases;
        
    } catch (error) {
        if (shouldStartTransaction) {
            await useSession.abortTransaction();
        }
        console.error('Stock release failed:', error);
        throw error;
    } finally {
        if (shouldStartTransaction) {
            useSession.endSession();
        }
    }
};

// Check stock availability for items with enhanced validation
const checkStockAvailability = async (items) => {
    try {
        const stockChecks = [];
        
        for (const item of items) {
            if (!item._id || !item.size || !item.quantity) {
                stockChecks.push({
                    item,
                    available: false,
                    error: 'Invalid item data'
                });
                continue;
            }
            
            const product = await productModel.findById(item._id);
            if (!product) {
                stockChecks.push({
                    item,
                    available: false,
                    error: 'Product not found'
                });
                continue;
            }
            
            const sizeObj = product.sizes.find(s => s.size === item.size);
            if (!sizeObj) {
                stockChecks.push({
                    item,
                    available: false,
                    error: `Size ${item.size} not available`
                });
                continue;
            }
            
            const available = sizeObj.stock >= item.quantity;
            stockChecks.push({
                item,
                available,
                currentStock: sizeObj.stock,
                requestedQuantity: item.quantity,
                productName: product.name,
                error: available ? null : `Insufficient stock. Available: ${sizeObj.stock}, Requested: ${item.quantity}`
            });
        }
        
        return stockChecks;
        
    } catch (error) {
        console.error('Stock availability check failed:', error);
        throw error;
    }
};

// Get current stock for a product with enhanced details
const getProductStock = async (productId) => {
    try {
        const product = await productModel.findById(productId);
        if (!product) {
            throw new Error('Product not found');
        }
        
        return {
            productId,
            productName: product.name,
            sizes: product.sizes.map(size => ({
                size: size.size,
                stock: size.stock,
                inStock: size.stock > 0,
                lowStock: size.stock <= 5 && size.stock > 0,
                outOfStock: size.stock === 0
            })),
            totalStock: product.sizes.reduce((sum, size) => sum + size.stock, 0),
            inStock: product.sizes.some(size => size.stock > 0),
            lowStockSizes: product.sizes.filter(size => size.stock <= 5 && size.stock > 0).map(s => s.size),
            outOfStockSizes: product.sizes.filter(size => size.stock === 0).map(s => s.size)
        };
        
    } catch (error) {
        console.error('Get product stock failed:', error);
        throw error;
    }
};

// Update stock for a specific product size (admin function) with validation
const updateProductStock = async (productId, size, newStock, session = null) => {
    const useSession = session || await mongoose.startSession();
    const shouldStartTransaction = !session;
    
    if (shouldStartTransaction) {
        useSession.startTransaction();
    }
    
    try {
        if (newStock < 0) {
            throw new Error('Stock cannot be negative');
        }
        
        const result = await productModel.updateOne(
            { _id: productId, 'sizes.size': size },
            { $set: { 'sizes.$.stock': newStock } },
            { session: useSession }
        );
        
        if (result.modifiedCount === 0) {
            throw new Error(`Failed to update stock for product ${productId} size ${size}`);
        }
        
        if (shouldStartTransaction) {
            await useSession.commitTransaction();
        }
        
        console.log(`Stock updated for product ${productId} size ${size}: ${newStock}`);
        
        return {
            productId,
            size,
            newStock,
            success: true
        };
        
    } catch (error) {
        if (shouldStartTransaction) {
            await useSession.abortTransaction();
        }
        console.error('Update product stock failed:', error);
        throw error;
    } finally {
        if (shouldStartTransaction) {
            useSession.endSession();
        }
    }
};

// Bulk stock update (admin function) with enhanced validation
const bulkUpdateStock = async (updates, session = null) => {
    const useSession = session || await mongoose.startSession();
    const shouldStartTransaction = !session;
    
    if (shouldStartTransaction) {
        useSession.startTransaction();
    }
    
    try {
        const results = [];
        
        for (const update of updates) {
            const { productId, size, newStock } = update;
            
            if (newStock < 0) {
                throw new Error(`Stock cannot be negative for product ${productId} size ${size}`);
            }
            
            const result = await productModel.updateOne(
                { _id: productId, 'sizes.size': size },
                { $set: { 'sizes.$.stock': newStock } },
                { session: useSession }
            );
            
            results.push({
                productId,
                size,
                newStock,
                success: result.modifiedCount > 0,
                error: result.modifiedCount === 0 ? 'Update failed' : null
            });
        }
        
        if (shouldStartTransaction) {
            await useSession.commitTransaction();
        }
        
        console.log(`Bulk stock update completed for ${updates.length} items`);
        
        return results;
        
    } catch (error) {
        if (shouldStartTransaction) {
            await useSession.abortTransaction();
        }
        console.error('Bulk stock update failed:', error);
        throw error;
    } finally {
        if (shouldStartTransaction) {
            useSession.endSession();
        }
    }
};

// Get low stock products (admin function) with enhanced filtering
const getLowStockProducts = async (threshold = 5) => {
    try {
        const products = await productModel.find({
            'sizes.stock': { $lte: threshold }
        });
        
        const lowStockItems = [];
        
        products.forEach(product => {
            product.sizes.forEach(size => {
                if (size.stock <= threshold) {
                    lowStockItems.push({
                        productId: product._id,
                        productName: product.name,
                        size: size.size,
                        currentStock: size.stock,
                        threshold,
                        category: product.category,
                        categorySlug: product.categorySlug,
                        urgency: size.stock === 0 ? 'critical' : size.stock <= 2 ? 'high' : 'medium'
                    });
                }
            });
        });
        
        return lowStockItems.sort((a, b) => a.currentStock - b.currentStock);
        
    } catch (error) {
        console.error('Get low stock products failed:', error);
        throw error;
    }
};

// NEW: Validate cart items against current stock (for cart operations)
const validateCartItems = async (cartItems, userId) => {
    try {
        const validatedItems = [];
        const stockIssues = [];
        let hasStockIssues = false;

        for (const item of cartItems) {
            const product = await productModel.findById(item._id);
            if (!product) {
                stockIssues.push({
                    item,
                    error: 'Product not found',
                    action: 'remove'
                });
                continue;
            }

            const sizeObj = product.sizes.find(s => s.size === item.size);
            if (!sizeObj) {
                stockIssues.push({
                    item,
                    error: `Size ${item.size} not available`,
                    action: 'remove'
                });
                continue;
            }

            if (sizeObj.stock < item.quantity) {
                hasStockIssues = true;
                stockIssues.push({
                    item,
                    error: `Insufficient stock. Available: ${sizeObj.stock}, Requested: ${item.quantity}`,
                    action: 'adjust',
                    adjustedQuantity: Math.max(0, sizeObj.stock)
                });
                // Adjust quantity to available stock
                validatedItems.push({
                    ...item,
                    quantity: Math.max(0, sizeObj.stock)
                });
            } else {
                validatedItems.push(item);
            }
        }

        return {
            validatedItems,
            stockIssues,
            hasStockIssues,
            message: hasStockIssues ? 'Some items were adjusted due to stock changes' : 'All items are in stock'
        };

    } catch (error) {
        console.error('Cart validation failed:', error);
        throw error;
    }
};

// NEW: Get real-time stock for multiple products (for frontend cart)
const getBulkProductStock = async (productIds) => {
    try {
        const products = await productModel.find({ _id: { $in: productIds } });
        const stockMap = {};
        
        products.forEach(product => {
            stockMap[product._id.toString()] = {};
            product.sizes.forEach(size => {
                stockMap[product._id.toString()][size.size] = size.stock;
            });
        });
        
        return stockMap;
        
    } catch (error) {
        console.error('Get bulk product stock failed:', error);
        throw error;
    }
};

export {
    reserveStock,
    releaseStock,
    checkStockAvailability,
    getProductStock,
    updateProductStock,
    bulkUpdateStock,
    getLowStockProducts,
    validateCartItems,
    getBulkProductStock
}; 