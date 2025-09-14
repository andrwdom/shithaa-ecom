import userModel from "../models/userModel.js"
import productModel from "../models/productModel.js"

// Add products to user cart
const addToCart = async (req, res) => {
    try {
        console.log('🔍 addToCart called with:', req.body);
        const { userId, itemId, size } = req.body

        if (!userId || !itemId || !size) {
            console.log('❌ Missing required fields:', { userId: !!userId, itemId: !!itemId, size: !!size });
            return res.status(400).json({ 
                success: false, 
                message: "Missing required fields: userId, itemId, size" 
            });
        }

        const userData = await userModel.findById(userId)
        if (!userData) {
            console.log('❌ User not found:', userId);
            return res.status(404).json({ 
                success: false, 
                message: "User not found" 
            });
        }

        let cartData = userData.cartData;
        console.log('🔍 Current cart data:', cartData);

        if (cartData[itemId]) {
            if (cartData[itemId][size]) {
                cartData[itemId][size] += 1
                console.log(`✅ Updated quantity for ${itemId} size ${size} to ${cartData[itemId][size]}`);
            } else {
                cartData[itemId][size] = 1
                console.log(`✅ Added new size ${size} for ${itemId}`);
            }
        } else {
            cartData[itemId] = {}
            cartData[itemId][size] = 1
            console.log(`✅ Added new item ${itemId} with size ${size}`);
        }

        await userModel.findByIdAndUpdate(userId, {cartData})
        console.log('✅ Cart updated successfully');

        res.json({ success: true, message: "Added To Cart" })

    } catch (error) {
        console.error('❌ addToCart error:', error);
        res.status(500).json({ success: false, message: error.message })
    }
}

// Update user cart
const updateCart = async (req, res) => {
    try {
        const { userId, itemId, size, quantity } = req.body

        const userData = await userModel.findById(userId)
        let cartData = userData.cartData;

        cartData[itemId][size] = quantity

        await userModel.findByIdAndUpdate(userId, {cartData})
        res.json({ success: true, message: "Cart Updated" })

    } catch (error) {
        console.log(error)
        res.json({ success: false, message: error.message })
    }
}

// Get user cart data
const getUserCart = async (req, res) => {
    try {
        console.log('🔍 getUserCart called with:', req.body);
        const { userId } = req.body
        
        if (!userId) {
            console.log('❌ No userId provided');
            return res.status(400).json({ success: false, message: 'userId required' });
        }
        
        const userData = await userModel.findById(userId)
        console.log('🔍 User found:', !!userData);
        
        if (!userData) {
            console.log('❌ User not found');
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        
        let cartData = userData.cartData;
        console.log('🔍 Raw cart data:', cartData);

        // Convert cartData object to array format that frontend expects
        const cartItems = [];
        for (const [itemId, sizes] of Object.entries(cartData)) {
            for (const [size, quantity] of Object.entries(sizes)) {
                try {
                    // Fetch product details
                    const product = await productModel.findById(itemId);
                    if (product) {
                        cartItems.push({
                            _id: itemId,
                            id: itemId, // Frontend expects both _id and id
                            name: product.name,
                            price: product.price,
                            quantity: quantity,
                            size: size,
                            image: product.images?.[0] || '',
                            categorySlug: product.categorySlug,
                            category: product.category
                        });
                    } else {
                        console.log(`⚠️ Product not found for itemId: ${itemId}`);
                    }
                } catch (error) {
                    console.error(`❌ Error fetching product ${itemId}:`, error);
                }
            }
        }

        console.log('✅ Converted cart items:', cartItems.length);
        res.json({ success: true, cartItems, cartData })
    } catch (error) {
        console.error('❌ getUserCart error:', error);
        res.status(500).json({ success: false, message: error.message })
    }
}

// Calculate cart total with loungewear offer
const calculateCartTotal = async (req, res) => {
    try {
        const { items } = req.body;
        
        if (!items || !Array.isArray(items)) {
            return res.status(400).json({ 
                success: false, 
                message: "Items array is required" 
            });
        }

        // 🔧 FIX: Create a stable hash for caching
        const itemsHash = items.map(item => `${item._id}-${item.size}-${item.quantity}`).join('|');
        
        // 🔧 FIX: Clear cache to ensure fresh calculations
        if (global.cartCalculationCache) {
            // Debug logging removed for production performance
            global.cartCalculationCache = {};
        }

        // Fetch product details for all items to get category information
        const productIds = [...new Set(items.map(item => item._id))];
        const products = await productModel.find({ _id: { $in: productIds } });
        
        // Create a map for quick lookup
        const productMap = {};
        products.forEach(product => {
            productMap[product._id.toString()] = product;
        });

        // Separate all loungewear category items
        const loungewearCategoryItems = [];
        const otherItems = [];
        
        items.forEach(item => {
            const product = productMap[item._id];
            
                    // Debug logging removed for production performance
            
            if (product && (
                product.categorySlug === 'zipless-feeding-lounge-wear' || 
                product.categorySlug === 'non-feeding-lounge-wear'
                // Removed 'zipless-feeding-dupatta-lounge-wear' and 'maternity-feeding-wear' from offer categories
            )) {
                // Add item multiple times based on quantity for offer calculation
                for (let i = 0; i < item.quantity; i++) {
                    loungewearCategoryItems.push({
                        ...item,
                        quantity: 1,
                        originalPrice: product.price || item.price
                    });
                }
            } else {
                otherItems.push(item);
            }
        });

        // Debug logging removed for production performance

        // Calculate loungewear category offer
        const loungewearCategoryOffer = calculateLoungewearCategoryOffer(loungewearCategoryItems);
        
        console.log(`🔧 CRITICAL: loungewearCategoryOffer result:`, loungewearCategoryOffer);
        
        // Calculate other items total
        const otherItemsTotal = otherItems.reduce((sum, item) => {
            const product = productMap[item._id];
            const price = product ? product.price : item.price;
            return sum + (price * item.quantity);
        }, 0);

        // Calculate totals with safety caps
        const subtotal = loungewearCategoryOffer.originalTotal + otherItemsTotal;
        
        console.log(`🔧 CRITICAL: Calculation breakdown:`, {
            loungewearOriginalTotal: loungewearCategoryOffer.originalTotal,
            loungewearDiscount: loungewearCategoryOffer.discount,
            otherItemsTotal,
            subtotal
        });

        // 🔧 FIX: Enhanced logging for debugging
        console.log(`🔧 Cart calculation summary:`, {
            loungewearOriginalTotal: loungewearCategoryOffer.originalTotal,
            otherItemsTotal,
            subtotal,
            rawDiscount: loungewearCategoryOffer.discount,
            offerApplied: loungewearCategoryOffer.offerApplied,
            loungewearItemCount: loungewearCategoryItems.length
        });

        // Never let the discount exceed the subtotal (prevents negative totals on tiny orders)
        const rawDiscount = loungewearCategoryOffer.discount;
        const offerDiscount = Math.min(rawDiscount, subtotal);

        // Final payable amount (can never go below 0)
        const finalTotal = Math.max(0, subtotal - offerDiscount);

        console.log(`🔧 Final calculation:`, {
            subtotal,
            offerDiscount,
            finalTotal
        });

        const response = {
            success: true,
            data: {             
                subtotal: subtotal,
                offerApplied: loungewearCategoryOffer.offerApplied,
                offerDetails: loungewearCategoryOffer.offerDetails,
                offerDiscount: offerDiscount,
                total: finalTotal,
                loungewearCategoryCount: loungewearCategoryItems.length,
                otherItemsCount: otherItems.length
            }
        };

        // 🔧 FIX: No caching - always return fresh results
        console.log('🔧 Returning fresh cart calculation result');

        res.json(response);

    } catch (error) {
        console.error('Calculate Cart Total Error:', error);
        res.status(500).json({ 
            success: false, 
            message: error.message 
        });
    }
};

// Helper function to calculate loungewear category offer
function calculateLoungewearCategoryOffer(loungewearCategoryItems) {
    console.log(`🔧 CRITICAL DEBUG: calculateLoungewearCategoryOffer called with ${loungewearCategoryItems.length} items`);
    console.log(`🔧 CRITICAL DEBUG: Items:`, loungewearCategoryItems.map(item => `${item.name} (${item.size}) - ₹${item.originalPrice}`));
    
    // 🔧 CRITICAL FIX: Offer ONLY applies when there are 3 or more loungewear items
    if (loungewearCategoryItems.length < 3) {
        console.log(`🔧 CRITICAL: No loungewear offer applied: Only ${loungewearCategoryItems.length} item(s), need 3+ for offer`);
        const originalTotal = loungewearCategoryItems.reduce((sum, item) => sum + item.originalPrice, 0);
        console.log(`🔧 CRITICAL DEBUG: Returning no offer, originalTotal: ₹${originalTotal}, discount: ₹0`);
        
        // 🔧 TRIPLE CHECK: Ensure discount is absolutely zero
        const result = {
            originalTotal,
            discount: 0,
            offerApplied: false,
            offerDetails: null
        };
        
        console.log(`🔧 FINAL RESULT FOR < 3 ITEMS:`, result);
        return result;
    }

    // 🔧 NEW FIX: Check if items are priced appropriately for the offer
    // The offer is designed for items priced at ₹450+ each, not ₹1 test items
    const minPriceForOffer = 400; // Minimum price per item to qualify for offer
    const itemsBelowMinPrice = loungewearCategoryItems.filter(item => item.originalPrice < minPriceForOffer);
    
    if (itemsBelowMinPrice.length > 0) {
        console.log(`🔧 CRITICAL: No loungewear offer applied: Items below minimum price (₹${minPriceForOffer}):`, 
                   itemsBelowMinPrice.map(item => `${item.name} - ₹${item.originalPrice}`));
        const originalTotal = loungewearCategoryItems.reduce((sum, item) => sum + item.originalPrice, 0);
        
        const result = {
            originalTotal,
            discount: 0,
            offerApplied: false,
            offerDetails: null
        };
        
        console.log(`🔧 FINAL RESULT FOR LOW-PRICED ITEMS:`, result);
        return result;
    }

    // Calculate how many complete sets of 3
    const completeSets = Math.floor(loungewearCategoryItems.length / 3);
    const remainingItems = loungewearCategoryItems.length % 3;
    
    console.log(`🔧 Loungewear offer calculation: ${loungewearCategoryItems.length} items = ${completeSets} complete sets + ${remainingItems} remaining`);
    
    // Calculate totals
    const originalTotal = loungewearCategoryItems.reduce((sum, item) => sum + item.originalPrice, 0);
    
    // 🔧 FIX: The offer is: "3 for ₹1299" + remaining items at ₹450 each
    // This should only apply when we have 3+ items, which we already checked above
    
    // Calculate offer total based on the rule:
    // - Complete sets of 3: ₹1299 each
    // - Remaining items: ₹450 each
    const offerTotal = (completeSets * 1299) + (remainingItems * 450);
    
    console.log(`🔧 Offer calculation: ${completeSets} × ₹1299 + ${remainingItems} × ₹450 = ₹${offerTotal}`);
    console.log(`🔧 Original total: ₹${originalTotal}, Offer total: ₹${offerTotal}`);
    
    // 🔧 FIX: Ensure offer total is never higher than original total
    if (offerTotal >= originalTotal) {
        console.log(`🔧 Offer validation failed: Offer total ₹${offerTotal} >= Original total ₹${originalTotal}`);
        return {
            originalTotal,
            discount: 0,
            offerApplied: false,
            offerDetails: null
        };
    }
    
    const discount = originalTotal - offerTotal;
    
    console.log(`🔧 Final discount: ₹${originalTotal} - ₹${offerTotal} = ₹${discount}`);
    
    // 🔧 FIX: Additional safety check - discount should be positive
    if (discount <= 0) {
        console.log(`🔧 Offer validation failed: Invalid discount ₹${discount}`);
        return {
            originalTotal,
            discount: 0,
            offerApplied: false,
            offerDetails: null
        };
    }
    
    const offerDetails = {     
        completeSets,
        remainingItems,
        offerPrice: offerTotal,
        originalPrice: originalTotal,
        savings: discount
    };

    return {    
        originalTotal,
        discount,
        offerApplied: true,
        offerDetails
    };
}

// Get bulk stock information for multiple products
const getBulkStock = async (req, res) => {
    try {
        const { productIds } = req.body;
        
        if (!productIds || !Array.isArray(productIds)) {
            return res.status(400).json({
                success: false,
                message: "Product IDs array is required"
            });
        }

        const products = await productModel.find({
            _id: { $in: productIds }
        }).select('_id name sizes stock categorySlug');

        const stockData = products.map(product => ({
            _id: product._id,
            name: product.name,
            sizes: product.sizes,
            stock: product.stock,
            categorySlug: product.categorySlug
        }));

        res.json({
            success: true,
            data: stockData
        });

    } catch (error) {
        console.error('Get Bulk Stock Error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Remove item from cart
const removeFromCart = async (req, res) => {
    try {
        const { userId, itemId, size } = req.body;
        
        const userData = await userModel.findById(userId);
        let cartData = userData.cartData;

        if (cartData[itemId]) {
            if (size) {
                // Remove specific size
                if (cartData[itemId][size]) {
                    delete cartData[itemId][size];
                    
                    // If no sizes left for this item, remove the entire item
                    if (Object.keys(cartData[itemId]).length === 0) {
                        delete cartData[itemId];
                    }
                }
            } else {
                // Remove entire item
                delete cartData[itemId];
            }
        }

        await userModel.findByIdAndUpdate(userId, { cartData });
        
        res.json({ 
            success: true, 
            message: "Item removed from cart",
            cartData 
        });

    } catch (error) {
        console.error('Remove from cart error:', error);
        res.status(500).json({ 
            success: false, 
            message: error.message 
        });
    }
};

// Get cart items by userId without authentication (for frontend restoration)
const getCartItemsByUserId = async (req, res) => {
    try {
        console.log('🔍 getCartItemsByUserId called with:', req.body);
        const { userId } = req.body
        
        if (!userId) {
            console.log('❌ No userId provided');
            return res.status(400).json({ success: false, message: 'userId required' });
        }
        
        const userData = await userModel.findById(userId)
        console.log('🔍 User found:', !!userData);
        
        if (!userData) {
            console.log('❌ User not found');
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        
        let cartData = userData.cartData;
        console.log('🔍 Raw cart data:', cartData);

        // Convert cartData object to array format that frontend expects
        const cartItems = [];
        for (const [itemId, sizes] of Object.entries(cartData)) {
            for (const [size, quantity] of Object.entries(sizes)) {
                try {
                    // Fetch product details
                    const product = await productModel.findById(itemId);
                    if (product) {
                        cartItems.push({
                            _id: itemId,
                            id: itemId, // Frontend expects both _id and id
                            name: product.name,
                            price: product.price,
                            quantity: quantity,
                            size: size,
                            image: product.images?.[0] || '',
                            categorySlug: product.categorySlug,
                            category: product.category
                        });
                    } else {
                        console.log(`⚠️ Product not found for itemId: ${itemId}`);
                    }
                } catch (error) {
                    console.error(`❌ Error fetching product ${itemId}:`, error);
                }
            }
        }

        console.log('✅ Converted cart items:', cartItems.length);
        res.json({ success: true, cartItems })
    } catch (error) {
        console.error('❌ getCartItemsByUserId error:', error);
        res.status(500).json({ success: false, message: error.message })
    }
};

export {
    addToCart,
    getUserCart,
    updateCart,
    removeFromCart,
    calculateCartTotal,
    getBulkStock,
    getCartItemsByUserId
} 