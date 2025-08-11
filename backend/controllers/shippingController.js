import productModel from "../models/productModel.js"

/**
 * NEW COMPREHENSIVE SHIPPING RULES:
 * 
 * 1. MATERNITY FEEDING WEAR:
 *    - Tamil Nadu:
 *      * 1 dress = ₹39
 *      * 2 dresses = ₹49
 *      * 3 dresses = ₹59
 *      * 4 dresses = ₹69
 *      * 5 dresses = ₹79
 *      * 6 dresses = ₹89
 *      * 7+ dresses = ₹99
 *    - Other States:
 *      * 1 dress = ₹49
 *      * 2 dresses = ₹69
 *      * 3 dresses = ₹89
 *      * 4+ dresses = ₹109
 * 
 * 2. LOUNGE WEAR (all categories except maternity feeding):
 *    - Tamil Nadu: FREE shipping
 *    - Other States:
 *      * 1 dress = ₹39
 *      * 2 dresses = ₹49
 *      * 3 dresses = ₹59
 *      * 4 dresses = ₹69
 *      * 5 dresses = ₹79
 *      * 6 dresses = ₹89
 *      * 7+ dresses = ₹99
 * 
 * 3. MIXED CART (maternity feeding + lounge wear):
 *    - Calculate shipping for each category separately
 *    - Add the costs together
 */
export const calculateShipping = async (req, res) => {
    try {
        const { items, shippingInfo } = req.body;
        
        if (!items || !Array.isArray(items)) {
            return res.status(400).json({ 
                success: false, 
                message: "Items array is required" 
            });
        }

        if (!shippingInfo || !shippingInfo.state) {
            return res.status(400).json({ 
                success: false, 
                message: "Shipping information is required" 
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

        const isTamilNadu = shippingInfo.state.trim().toLowerCase() === 'tamil nadu';
        
        // Categorize items
        const maternityFeedingItems = items.filter(item => {
            const product = productMap[item._id];
            return product && (
                product.category === "Maternity Feeding Wear" || 
                product.categorySlug === "maternity-feeding-wear"
            );
        });
        
        const loungeWearItems = items.filter(item => {
            const product = productMap[item._id];
            return product && (
                (product.category === "Zipless Feeding Lounge Wear" || 
                 product.category === "Non-Feeding Lounge Wear" ||
                 product.categorySlug === "zipless-feeding-lounge-wear" ||
                 product.categorySlug === "non-feeding-lounge-wear") &&
                !(product.category === "Maternity Feeding Wear" || 
                  product.categorySlug === "maternity-feeding-wear")
            );
        });
        
        const otherCategoryItems = items.filter(item => {
            const product = productMap[item._id];
            return product && !(
                product.category === "Maternity Feeding Wear" || 
                product.categorySlug === "maternity-feeding-wear"
            ) && !(
                product.category === "Zipless Feeding Lounge Wear" || 
                product.category === "Non-Feeding Lounge Wear" ||
                product.categorySlug === "zipless-feeding-lounge-wear" ||
                product.categorySlug === "non-feeding-lounge-wear"
            );
        });

        // Calculate quantities
        const maternityFeedingQty = maternityFeedingItems.reduce((sum, item) => sum + item.quantity, 0);
        const loungeWearQty = loungeWearItems.reduce((sum, item) => sum + item.quantity, 0);
        const otherCategoriesQty = otherCategoryItems.reduce((sum, item) => sum + item.quantity, 0);

        // Calculate shipping for each category
        const maternityFeedingCost = calculateMaternityFeedingShipping(maternityFeedingQty, isTamilNadu);
        const loungeWearCost = calculateLoungeWearShipping(loungeWearQty, isTamilNadu);
        const otherCategoriesCost = calculateOtherCategoriesShipping(otherCategoriesQty, isTamilNadu);

        // Total shipping cost
        const totalShippingCost = maternityFeedingCost + loungeWearCost + otherCategoriesCost;
        
        // Determine if any category has free shipping
        const hasFreeShipping = (loungeWearQty > 0 && isTamilNadu) || 
                               (otherCategoriesQty > 0 && isTamilNadu);

        // Generate shipping message
        const shippingMessage = generateShippingMessage({
            maternityFeeding: { quantity: maternityFeedingQty, cost: maternityFeedingCost },
            loungeWear: { quantity: loungeWearQty, cost: loungeWearCost },
            otherCategories: { quantity: otherCategoriesQty, cost: otherCategoriesCost },
            isTamilNadu,
            totalShippingCost
        });

        const response = {
            success: true,
            data: {
                shippingCost: totalShippingCost,
                isFreeShipping: hasFreeShipping && totalShippingCost === 0,
                shippingMessage,
                breakdown: {
                    maternityFeeding: { quantity: maternityFeedingQty, cost: maternityFeedingCost },
                    loungeWear: { quantity: loungeWearQty, cost: loungeWearCost },
                    otherCategories: { quantity: otherCategoriesQty, cost: otherCategoriesCost }
                },
                totalDresses: maternityFeedingQty + loungeWearQty + otherCategoriesQty,
                isTamilNadu
            }
        };

        res.json(response);

    } catch (error) {
        console.error('Calculate Shipping Error:', error);
        res.status(500).json({ 
            success: false, 
            message: error.message 
        });
    }
};

/**
 * Calculate shipping for Maternity Feeding Wear
 */
function calculateMaternityFeedingShipping(quantity, isTamilNadu) {
    if (quantity === 0) return 0;
    
    if (isTamilNadu) {
        // Tamil Nadu rules
        if (quantity === 1) return 39;
        if (quantity === 2) return 49;
        if (quantity === 3) return 59;
        if (quantity === 4) return 69;
        if (quantity === 5) return 79;
        if (quantity === 6) return 89;
        return 99; // 7+ items
    } else {
        // Other states rules
        if (quantity === 1) return 49;
        if (quantity === 2) return 69;
        if (quantity === 3) return 89;
        return 109; // 4+ items
    }
}

/**
 * Calculate shipping for Lounge Wear
 */
function calculateLoungeWearShipping(quantity, isTamilNadu) {
    if (quantity === 0) return 0;
    
    if (isTamilNadu) {
        // Free shipping for Tamil Nadu
        return 0;
    } else {
        // Other states rules
        if (quantity === 1) return 39;
        if (quantity === 2) return 49;
        if (quantity === 3) return 59;
        if (quantity === 4) return 69;
        if (quantity === 5) return 79;
        if (quantity === 6) return 89;
        return 99; // 7+ items
    }
}

/**
 * Calculate shipping for Other Categories
 */
function calculateOtherCategoriesShipping(quantity, isTamilNadu) {
    if (quantity === 0) return 0;
    
    if (isTamilNadu) {
        // Free shipping for Tamil Nadu
        return 0;
    } else {
        // Other states rules
        if (quantity === 1) return 39;
        if (quantity === 2) return 59;
        if (quantity === 3) return 89;
        return 105; // 4+ items
    }
}

/**
 * Generate comprehensive shipping message
 */
function generateShippingMessage(breakdown) {
    const { maternityFeeding, loungeWear, otherCategories, isTamilNadu, totalShippingCost } = breakdown;
    
    if (totalShippingCost === 0) {
        return "Free shipping! 🎉";
    }

    const messages = [];
    
    if (maternityFeeding.quantity > 0) {
        if (maternityFeeding.cost === 0) {
            messages.push(`Free shipping for ${maternityFeeding.quantity} maternity feeding item${maternityFeeding.quantity > 1 ? 's' : ''}`);
        } else {
            messages.push(`₹${maternityFeeding.cost} for ${maternityFeeding.quantity} maternity feeding item${maternityFeeding.quantity > 1 ? 's' : ''}`);
        }
    }
    
    if (loungeWear.quantity > 0) {
        if (loungeWear.cost === 0) {
            messages.push(`Free shipping for ${loungeWear.quantity} lounge wear item${loungeWear.quantity > 1 ? 's' : ''}`);
        } else {
            messages.push(`₹${loungeWear.cost} for ${loungeWear.quantity} lounge wear item${loungeWear.quantity > 1 ? 's' : ''}`);
        }
    }
    
    if (otherCategories.quantity > 0) {
        if (otherCategories.cost === 0) {
            messages.push(`Free shipping for ${otherCategories.quantity} other item${otherCategories.quantity > 1 ? 's' : ''}`);
        } else {
            messages.push(`₹${otherCategories.cost} for ${otherCategories.quantity} other item${otherCategories.quantity > 1 ? 's' : ''}`);
        }
    }
    
    if (messages.length === 1) {
        return `Shipping: ${messages[0]}`;
    } else {
        return `Shipping: ${messages.join(', ')}`;
    }
} 