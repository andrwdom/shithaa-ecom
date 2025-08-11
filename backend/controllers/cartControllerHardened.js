import userModel from "../models/userModel.js"
import productModel from "../models/productModel.js"

// add products to user cart with bulletproof stock validation (no transactions for standalone MongoDB)
const addToCart = async (req, res) => {
    try {
        const { itemId, size, quantity = 1 } = req.body;
        // Get userId from authenticated user (set by auth middleware)
        const userId = req.user?.id;

        if (!userId || !itemId || !size) {
            return res.status(400).json({ 
                success: false, 
                message: "User not authenticated or missing itemId/size" 
            });
        }

        // Validate quantity
        if (quantity < 1) {
            return res.status(400).json({ 
                success: false, 
                message: "Quantity must be at least 1" 
            });
        }

        // STOCK VALIDATION: Check product and stock availability
        const product = await productModel.findById(itemId);
        if (!product) {
            return res.status(404).json({ 
                success: false, 
                message: "Product not found" 
            });
        }

        // Find the specific size and check stock
        const sizeObj = product.sizes.find(s => s.size === size);
        if (!sizeObj) {
            return res.status(400).json({ 
                success: false, 
                message: `Size ${size} not available for this product` 
            });
        }

        // Get current cart data
        const userData = await userModel.findById(userId);
        if (!userData) {
            return res.status(404).json({ 
                success: false, 
                message: "User not found" 
            });
        }

        let cartData = userData.cartData || {};
        const currentQuantity = cartData[itemId]?.[size] || 0;
        const newQuantity = currentQuantity + quantity;

        // CRITICAL: Check if new quantity exceeds available stock
        if (newQuantity > sizeObj.stock) {
            return res.status(400).json({ 
                success: false, 
                message: `Insufficient stock. Only ${sizeObj.stock} available in size ${size}. You already have ${currentQuantity} in cart.` 
            });
        }

        // Update cart data
        if (!cartData[itemId]) {
            cartData[itemId] = {};
        }
        cartData[itemId][size] = newQuantity;

        // Update user cart
        await userModel.findByIdAndUpdate(
            userId, 
            { cartData }, 
            { new: true }
        );

        // Log successful cart addition
        console.log(`User ${userId} added ${quantity} of product ${itemId} size ${size} to cart. New total: ${newQuantity}, Stock remaining: ${sizeObj.stock - newQuantity}`);

        res.json({ 
            success: true, 
            message: "Added To Cart",
            data: {
                itemId,
                size,
                quantity: newQuantity,
                availableStock: sizeObj.stock - newQuantity,
                currentStock: sizeObj.stock
            }
        });

    } catch (error) {
        console.error('Add to cart error:', error);
        res.status(500).json({ 
            success: false, 
            message: "Failed to add item to cart",
            error: error.message 
        });
    }
}

// update user cart with bulletproof stock validation (no transactions for standalone MongoDB)
const updateCart = async (req, res) => {
    try {
        const { itemId, size, quantity } = req.body;
        // Get userId from authenticated user (set by auth middleware)
        const userId = req.user?.id;

        if (!userId || !itemId || !size || quantity === undefined) {
            return res.status(400).json({ 
                success: false, 
                message: "User not authenticated or missing itemId/size/quantity" 
            });
        }

        // Validate quantity
        if (quantity < 0) {
            return res.status(400).json({ 
                success: false, 
                message: "Quantity cannot be negative" 
            });
        }

        // STOCK VALIDATION: Check product and stock availability
        const product = await productModel.findById(itemId);
        if (!product) {
            return res.status(404).json({ 
                success: false, 
                message: "Product not found" 
            });
        }

        // Find the specific size and check stock
        const sizeObj = product.sizes.find(s => s.size === size);
        if (!sizeObj) {
            return res.status(400).json({ 
                success: false, 
                message: `Size ${size} not available for this product` 
            });
        }

        // CRITICAL: Check if new quantity exceeds available stock
        if (quantity > sizeObj.stock) {
            return res.status(400).json({ 
                success: false, 
                message: `Insufficient stock. Only ${sizeObj.stock} available in size ${size}.` 
            });
        }

        // Get current cart data
        const userData = await userModel.findById(userId);
        if (!userData) {
            return res.status(404).json({ 
                success: false, 
                message: "User not found" 
            });
        }

        let cartData = userData.cartData || {};

        if (quantity === 0) {
            // Remove item from cart if quantity is 0
            if (cartData[itemId] && cartData[itemId][size]) {
                delete cartData[itemId][size];
                // Remove itemId if no sizes left
                if (Object.keys(cartData[itemId]).length === 0) {
                    delete cartData[itemId];
                }
            }
        } else {
            // Update quantity
            if (!cartData[itemId]) {
                cartData[itemId] = {};
            }
            cartData[itemId][size] = quantity;
        }

        // Update user cart
        await userModel.findByIdAndUpdate(
            userId, 
            { cartData }, 
            { new: true }
        );

        // Log successful cart update
        if (quantity === 0) {
            console.log(`User ${userId} removed product ${itemId} size ${size} from cart`);
        } else {
            console.log(`User ${userId} updated product ${itemId} size ${size} quantity to ${quantity}, Stock remaining: ${sizeObj.stock - quantity}`);
        }

        res.json({ 
            success: true, 
            message: quantity === 0 ? "Item removed from cart" : "Cart Updated",
            data: {
                itemId,
                size,
                quantity,
                availableStock: sizeObj.stock - (quantity || 0),
                currentStock: sizeObj.stock
            }
        });

    } catch (error) {
        console.error('Update cart error:', error);
        res.status(500).json({ 
            success: false, 
            message: "Failed to update cart",
            error: error.message 
        });
    }
}

// remove item from cart (no transactions for standalone MongoDB)
const removeFromCart = async (req, res) => {
    try {
        const { itemId, size } = req.body;
        // Get userId from authenticated user (set by auth middleware)
        const userId = req.user?.id;

        if (!userId || !itemId || !size) {
            return res.status(400).json({ 
                success: false, 
                message: "User not authenticated or missing itemId/size" 
            });
        }

        // Get current cart data
        const userData = await userModel.findById(userId);
        if (!userData) {
            return res.status(404).json({ 
                success: false, 
                message: "User not found" 
            });
        }

        let cartData = userData.cartData || {};

        // Remove item from cart
        if (cartData[itemId] && cartData[itemId][size]) {
            delete cartData[itemId][size];
            // Remove itemId if no sizes left
            if (Object.keys(cartData[itemId]).length === 0) {
                delete cartData[itemId];
            }
        }

        // Update user cart
        await userModel.findByIdAndUpdate(
            userId, 
            { cartData }, 
            { new: true }
        );

        // Log successful cart removal
        console.log(`User ${userId} removed product ${itemId} size ${size} from cart`);

        res.json({ 
            success: true, 
            message: "Item removed from cart"
        });

    } catch (error) {
        console.error('Remove from cart error:', error);
        res.status(500).json({ 
            success: false, 
            message: "Failed to remove item from cart",
            error: error.message 
        });
    }
}

// get user cart data with bulletproof stock validation
const getUserCart = async (req, res) => {
    try {
        // Get userId from authenticated user (set by auth middleware)
        const userId = req.user?.id;
        
        if (!userId) {
            return res.status(400).json({ 
                success: false, 
                message: "User not authenticated" 
            });
        }

        const userData = await userModel.findById(userId);
        if (!userData) {
            return res.status(404).json({ 
                success: false, 
                message: "User not found" 
            });
        }

        let cartData = userData.cartData || {};

        // BULLETPROOF STOCK VALIDATION: Validate cart items against current stock
        const validatedCartData = {};
        let hasStockIssues = false;
        const stockIssues = [];

        for (const [itemId, sizes] of Object.entries(cartData)) {
            try {
                const product = await productModel.findById(itemId);
                if (!product) {
                    console.log(`Product ${itemId} not found, removing from cart`);
                    continue; // Skip this product
                }

                validatedCartData[itemId] = {};
                
                for (const [size, quantity] of Object.entries(sizes)) {
                    const sizeObj = product.sizes.find(s => s.size === size);
                    if (!sizeObj) {
                        console.log(`Size ${size} not found for product ${itemId}, removing from cart`);
                        continue; // Skip this size
                    }

                    if (sizeObj.stock < quantity) {
                        console.log(`Insufficient stock for ${product.name} size ${size}. Cart has ${quantity}, stock is ${sizeObj.stock}`);
                        hasStockIssues = true;
                        stockIssues.push({
                            productName: product.name,
                            size,
                            requestedQuantity: quantity,
                            availableStock: sizeObj.stock
                        });
                        // Adjust quantity to available stock
                        validatedCartData[itemId][size] = Math.max(0, sizeObj.stock);
                    } else {
                        validatedCartData[itemId][size] = quantity;
                    }
                }

                // Remove itemId if no valid sizes left
                if (Object.keys(validatedCartData[itemId]).length === 0) {
                    delete validatedCartData[itemId];
                }
            } catch (error) {
                console.error(`Error validating product ${itemId}:`, error);
                continue; // Skip this product on error
            }
        }

        // Update cart if there were stock issues
        if (hasStockIssues) {
            await userModel.findByIdAndUpdate(userId, { cartData: validatedCartData });
            console.log(`Updated cart for user ${userId} due to stock issues:`, stockIssues);
        }

        res.json({ 
            success: true, 
            cartData: validatedCartData,
            hasStockIssues,
            stockIssues,
            message: hasStockIssues ? "Some items were adjusted due to stock changes" : "Cart is valid"
        });

    } catch (error) {
        console.error('Get user cart error:', error);
        res.status(500).json({ 
            success: false, 
            message: "Failed to get cart data",
            error: error.message 
        });
    }
}

// Calculate cart total with bulletproof stock validation
const calculateCartTotal = async (req, res) => {
    try {
        const { items } = req.body;
        
        if (!items || !Array.isArray(items)) {
            return res.status(400).json({ 
                success: false, 
                message: "Items array is required" 
            });
        }

        // Fetch product details for all items to get category information
        const productIds = [...new Set(items.map(item => item._id))];
        const products = await productModel.find({ _id: { $in: productIds } });
        
        // Create a map for quick lookup
        const productMap = {};
        products.forEach(product => {
            productMap[product._id.toString()] = product;
        });

        // BULLETPROOF STOCK VALIDATION: Validate items against current stock
        const validatedItems = [];
        let hasStockIssues = false;
        const stockIssues = [];

        for (const item of items) {
            const product = productMap[item._id];
            if (!product) {
                console.log(`Product ${item._id} not found, skipping`);
                continue;
            }

            const sizeObj = product.sizes.find(s => s.size === item.size);
            if (!sizeObj) {
                console.log(`Size ${item.size} not found for product ${item._id}, skipping`);
                continue;
            }

            if (sizeObj.stock < item.quantity) {
                console.log(`Insufficient stock for ${product.name} size ${item.size}. Requested: ${item.quantity}, Available: ${sizeObj.stock}`);
                hasStockIssues = true;
                stockIssues.push({
                    productName: product.name,
                    size: item.size,
                    requestedQuantity: item.quantity,
                    availableStock: sizeObj.stock
                });
                // Adjust quantity to available stock
                item.quantity = Math.max(0, sizeObj.stock);
            }

            if (item.quantity > 0) {
                validatedItems.push(item);
            }
        }

        // Separate loungewear and non-loungewear items
        const loungewearItems = [];
        const otherItems = [];
        
        validatedItems.forEach(item => {
            const product = productMap[item._id];
            if (product && (
                product.categorySlug === 'zipless-feeding-lounge-wear' || 
                product.categorySlug === 'non-feeding-lounge-wear'
                // Excluded: 'zipless-feeding-dupatta-lounge-wear'
            )) {
                // Add item multiple times based on quantity for offer calculation
                for (let i = 0; i < item.quantity; i++) {
                    loungewearItems.push({
                        ...item,
                        quantity: 1,
                        originalPrice: product.price || item.price
                    });
                }
            } else {
                otherItems.push(item);
            }
        });

        // Calculate loungewear offer
        const loungewearOffer = calculateLoungewearOffer(loungewearItems);
        
        // Calculate other items total
        const otherItemsTotal = otherItems.reduce((sum, item) => {
            const product = productMap[item._id];
            const price = product ? product.price : item.price;
            return sum + (price * item.quantity);
        }, 0);

        // Calculate totals
        const subtotal = loungewearOffer.originalTotal + otherItemsTotal;
        const offerDiscount = loungewearOffer.offerDiscount;
        const finalTotal = subtotal - offerDiscount;

        const response = {
            success: true,
            data: {             
                subtotal: subtotal,
                offerApplied: loungewearOffer.offerApplied,
                offerDetails: loungewearOffer.offerDetails,
                offerDiscount: offerDiscount,
                total: finalTotal,
                loungewearCount: loungewearItems.length,
                otherItemsCount: otherItems.length,
                hasStockIssues,
                stockIssues,
                validatedItems,
                message: hasStockIssues ? "Some items were adjusted due to stock changes" : "All items are in stock"
            }
        };

        res.json(response);

    } catch (error) {
        console.error('Calculate Cart Total Error:', error);
        res.status(500).json({ 
            success: false, 
            message: error.message 
        });
    }
};

// Helper function to calculate loungewear offer
function calculateLoungewearOffer(loungewearItems) {
    if (loungewearItems.length < 3) {       // No offer applied
        const originalTotal = loungewearItems.reduce((sum, item) => sum + item.originalPrice, 0);
        return {
            originalTotal,
            offerDiscount: 0,
            offerApplied: false,
            offerDetails: null
        };
    }

    // Calculate how many complete sets of 3
    const completeSets = Math.floor(loungewearItems.length / 3);
    const remainingItems = loungewearItems.length % 3;
    
    // Calculate totals
    const originalTotal = loungewearItems.reduce((sum, item) => sum + item.originalPrice, 0);
    const offerTotal = (completeSets * 1299 + (remainingItems * 450));
    const discount = originalTotal - offerTotal;
    
    const offerDetails = {     
        completeSets,
        remainingItems,
        offerPrice: offerTotal,
        originalPrice: originalTotal,
        savings: discount
    };

    return {    
        originalTotal,
        offerDiscount: discount,
        offerApplied: true,
        offerDetails
    };
}

export { addToCart, updateCart, removeFromCart, getUserCart, calculateCartTotal } 