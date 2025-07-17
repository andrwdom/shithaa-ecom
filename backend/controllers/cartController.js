import userModel from "../models/userModel.js"
import productModel from "../models/productModel.js"


// add products to user cart
const addToCart = async (req,res) => {
    try {
        
        const { userId, itemId, size } = req.body

        const userData = await userModel.findById(userId)
        let cartData = await userData.cartData;

        if (cartData[itemId]) {
            if (cartData[itemId][size]) {
                cartData[itemId][size] += 1
            }
            else {
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

// update user cart
const updateCart = async (req,res) => {
    try {
        
        const { userId ,itemId, size, quantity } = req.body

        const userData = await userModel.findById(userId)
        let cartData = await userData.cartData;

        cartData[itemId][size] = quantity

        await userModel.findByIdAndUpdate(userId, {cartData})
        res.json({ success: true, message: "Cart Updated" })

    } catch (error) {
        console.log(error)
        res.json({ success: false, message: error.message })
    }
}


// get user cart data
const getUserCart = async (req,res) => {

    try {
        
        const { userId } = req.body
        
        const userData = await userModel.findById(userId)
        let cartData = await userData.cartData;

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

        // Separate loungewear and non-loungewear items
        const loungewearItems = [];
        const otherItems = [];
        
        items.forEach(item => {
            const product = productMap[item._id];
            if (product && (
                product.categorySlug === 'zipless-feeding-lounge-wear' || 
                product.categorySlug === 'non-feeding-lounge-wear'
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
        const offerDiscount = loungewearOffer.discount;
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

// Helper function to calculate loungewear offer
function calculateLoungewearOffer(loungewearItems) {
    if (loungewearItems.length < 3) {       // No offer applied
        const originalTotal = loungewearItems.reduce((sum, item) => sum + item.originalPrice, 0);
        return {
            originalTotal,
            discount: 0,
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
        discount,
        offerApplied: true,
        offerDetails
    };
}

export { addToCart, updateCart, getUserCart, calculateCartTotal }