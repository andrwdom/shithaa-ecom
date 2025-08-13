import userModel from "../models/userModel.js"
import productModel from "../models/productModel.js"

// Add products to user cart
const addToCart = async (req, res) => {
    try {
        const { userId, itemId, size } = req.body

        const userData = await userModel.findById(userId)
        let cartData = userData.cartData;

        if (cartData[itemId]) {
            if (cartData[itemId][size]) {
                cartData[itemId][size] += 1
            } else {
                cartData[itemId][size] = 1
            }
        } else {
            cartData[itemId] = {}
            cartData[itemId][size] = 1
        }

        await userModel.findByIdAndUpdate(userId, {cartData})

        res.json({ success: true, message: "Added To Cart" })

    } catch (error) {
        console.log(error)
        res.json({ success: false, message: error.message })
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
        const { userId } = req.body
        
        const userData = await userModel.findById(userId)
        let cartData = userData.cartData;

        res.json({ success: true, cartData })

    } catch (error) {
        console.log(error)
        res.json({ success: false, message: error.message })
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
            if (product && (
                product.categorySlug === 'zipless-feeding-lounge-wear' || 
                product.categorySlug === 'non-feeding-lounge-wear' ||
                product.categorySlug === 'zipless-feeding-dupatta-lounge-wear'
                // Removed 'maternity-feeding-wear' from offer categories
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

        // Calculate loungewear category offer
        const loungewearCategoryOffer = calculateLoungewearCategoryOffer(loungewearCategoryItems);
        
        // Calculate other items total
        const otherItemsTotal = otherItems.reduce((sum, item) => {
            const product = productMap[item._id];
            const price = product ? product.price : item.price;
            return sum + (price * item.quantity);
        }, 0);

        // Calculate totals
        const subtotal = loungewearCategoryOffer.originalTotal + otherItemsTotal;
        const offerDiscount = loungewearCategoryOffer.discount;
        const finalTotal = subtotal - offerDiscount;

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
    if (loungewearCategoryItems.length < 3) {       // No offer applied
        const originalTotal = loungewearCategoryItems.reduce((sum, item) => sum + item.originalPrice, 0);
        return {
            originalTotal,
            discount: 0,
            offerApplied: false,
            offerDetails: null
        };
    }

    // Calculate how many complete sets of 3
    const completeSets = Math.floor(loungewearCategoryItems.length / 3);
    const remainingItems = loungewearCategoryItems.length % 3;
    
    // Calculate totals
    const originalTotal = loungewearCategoryItems.reduce((sum, item) => sum + item.originalPrice, 0);
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

export { addToCart, updateCart, getUserCart, calculateCartTotal, getBulkStock, removeFromCart } 