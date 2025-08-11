import productModel from "../models/productModel.js"
import ShippingRules from "../models/ShippingRules.js"

/**
 * Calculate shipping cost based on cart items and shipping location
 * 
 * SHIPPING LOGIC IMPLEMENTATION:
 * 
 * 1. For all categories EXCEPT "Maternity Feeding Wear":
 *    - Tamil Nadu: FREE shipping
 *    - Other states:
 *       - 1 dress → ₹39
 *       - 2 dresses → ₹59
 *       - 3 dresses → ₹89
 *       - More than 3 dresses → ₹105 (max cap)
 * 
 * 2. For "Maternity Feeding Wear" category (special case):
 *    - Tamil Nadu:
 *       - 1 dress → ₹39
 *       - 2 dresses → ₹59
 *       - 3 dresses → ₹89
 *       - More than 3 dresses → ₹105 (max cap)
 *    - Other states: Same logic as above
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
        
        // Count total dresses (items) in cart
        const totalDresses = items.reduce((sum, item) => sum + item.quantity, 0);
        
        // Check if any item is from "Maternity Feeding Wear" category
        const hasMaternityFeedingWear = items.some(item => {
            const product = productMap[item._id];
            return product && (
                product.category === "Maternity Feeding Wear" || 
                product.categorySlug === "maternity-feeding-wear"
            );
        });

        let shippingCost = 0;
        let isFreeShipping = false;
        let shippingMessage = "";

        if (hasMaternityFeedingWear) {
            // Use new shipping rules for Maternity Feeding Wear
            try {
                const shippingRule = await ShippingRules.findOne({ 
                    category: 'maternity-feeding-wear', 
                    isActive: true 
                });
                
                if (shippingRule) {
                    const isTamilNadu = shippingInfo.state.trim().toLowerCase() === 'tamil nadu';
                    const rules = isTamilNadu ? shippingRule.rules.tamilNadu : shippingRule.rules.otherStates;
                    
                    // Calculate shipping based on quantity
                    if (totalDresses >= 7) {
                        shippingCost = rules.get('7+') || 99;
                        shippingMessage = `₹${shippingCost} shipping for ${totalDresses} items`;
                    } else if (totalDresses >= 4) {
                        shippingCost = rules.get('4+') || (isTamilNadu ? 99 : 109);
                        shippingMessage = `₹${shippingCost} shipping for ${totalDresses} items`;
                    } else {
                        shippingCost = rules.get(totalDresses.toString()) || 0;
                        shippingMessage = `₹${shippingCost} shipping for ${totalDresses} item${totalDresses > 1 ? 's' : ''}`;
                    }
                } else {
                    // Fallback to old logic if no rule found
                    if (totalDresses === 1) {
                        shippingCost = 39;
                        shippingMessage = "₹39 shipping for 1 item";
                    } else if (totalDresses === 2) {
                        shippingCost = 59;
                        shippingMessage = "₹59 shipping for 2 items";
                    } else if (totalDresses === 3) {
                        shippingCost = 89;
                        shippingMessage = "₹89 shipping for 3 items";
                    } else if (totalDresses > 3) {
                        shippingCost = 105;
                        shippingMessage = "₹105 shipping for 4+ items";
                    }
                }
            } catch (error) {
                console.error('Error calculating shipping with rules:', error);
                // Fallback to old logic
                if (totalDresses === 1) {
                    shippingCost = 39;
                    shippingMessage = "₹39 shipping for 1 item";
                } else if (totalDresses === 2) {
                    shippingCost = 59;
                    shippingMessage = "₹59 shipping for 2 items";
                } else if (totalDresses === 3) {
                    shippingCost = 89;
                    shippingMessage = "₹89 shipping for 3 items";
                } else if (totalDresses > 3) {
                    shippingCost = 105;
                    shippingMessage = "₹105 shipping for 4+ items";
                }
            }
        } else {
            // Regular categories
            if (isTamilNadu) {
                // Free shipping for Tamil Nadu (except Maternity Feeding Wear)
                shippingCost = 0;
                isFreeShipping = true;
                shippingMessage = "Free shipping within Tamil Nadu!";
            } else {
                // Other states - charge shipping
                if (totalDresses === 1) {
                    shippingCost = 39;
                    shippingMessage = "₹39 shipping for 1 item";
                } else if (totalDresses === 2) {
                    shippingCost = 59;
                    shippingMessage = "₹59 shipping for 2 items";
                } else if (totalDresses === 3) {
                    shippingCost = 89;
                    shippingMessage = "₹89 shipping for 3 items";
                } else if (totalDresses > 3) {
                    shippingCost = 105;
                    shippingMessage = "₹105 shipping for 4+ items";
                }
            }
        }

        const response = {
            success: true,
            data: {
                shippingCost,
                isFreeShipping,
                shippingMessage,
                totalDresses,
                hasMaternityFeedingWear,
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