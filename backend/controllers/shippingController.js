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
 *       - 2 dresses → ₹49
 *       - 3 dresses → ₹59
 *       - 4 dresses → ₹69
 *       - 5 dresses → ₹79
 *       - 6 dresses → ₹89
 *       - 7+ dresses → ₹99
 *    - Other states: Same logic as above
 * 
 * 3. Mixed Cart Handling (Tamil Nadu):
 *    - Only count quantities from PAID shipping categories
 *    - Ignore quantities from FREE shipping categories (Lounge Wear, etc.)
 *    - Example: 4 Maternity Feeding + 4 Lounge Wear = Only 4 items count for shipping
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

        // Normalize state name for robust matching
        const normalizedState = shippingInfo.state
            .trim()
            .toLowerCase()
            .replace(/\s+/g, '') // Remove all whitespace
            .replace(/[^a-z]/g, ''); // Remove non-alphabetic characters
        const isTamilNadu = ['tamilnadu', 'tamilnaadu', 'tamil'].includes(normalizedState);

        console.log('🔍 DEBUG - Shipping calculation:', {
            originalState: shippingInfo.state,
            normalizedState: normalizedState,
            isTamilNadu: isTamilNadu
        });
        
        // Helper function to identify ONLY paid shipping categories in Tamil Nadu
        const isPaidShippingCategoryInTN = (category, categorySlug) => {
            if (!isTamilNadu) return false; // This logic only applies to Tamil Nadu
            const normalizedCategory = (category || '').toLowerCase().trim();
            const normalizedSlug = (categorySlug || '').toLowerCase().trim();
            return normalizedCategory === 'maternity feeding wear' || normalizedSlug === 'maternity-feeding-wear';
        };
        
        // Filter items for shipping calculation based on location
        let itemsForShippingCalculation = [];
        let freeShippingItems = [];
        
        items.forEach(item => {
            const product = productMap[item._id];
            if (product) {
                // In Tamil Nadu, only "Maternity Feeding Wear" is paid. Everything else is free.
                if (isTamilNadu && !isPaidShippingCategoryInTN(product.category, product.categorySlug)) {
                    freeShippingItems.push(item);
                } else {
                    itemsForShippingCalculation.push(item);
                }
            } else {
                // If product not found, assume it requires shipping for safety
                itemsForShippingCalculation.push(item);
            }
        });
        
        // Count total dresses (items) that actually contribute to shipping cost
        const totalDressesForShipping = itemsForShippingCalculation.reduce((sum, item) => sum + item.quantity, 0);
        const totalFreeShippingItems = freeShippingItems.reduce((sum, item) => sum + item.quantity, 0);
        
        // Check if any item from the PAID shipping list is "Maternity Feeding Wear"
        const hasMaternityFeedingWear = itemsForShippingCalculation.some(item => {
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
                    const rules = isTamilNadu ? shippingRule.rules.tamilNadu : shippingRule.rules.otherStates;
                    
                    // Calculate shipping based on quantity (only paid shipping items in Tamil Nadu)
                    if (totalDressesForShipping >= 7) {
                        shippingCost = rules.get('7+') || 99;
                        shippingMessage = `₹${shippingCost} shipping for ${totalDressesForShipping} maternity feeding items`;
                    } else if (totalDressesForShipping >= 4) {
                        shippingCost = rules.get('4+') || (isTamilNadu ? 99 : 109);
                        shippingMessage = `₹${shippingCost} shipping for ${totalDressesForShipping} maternity feeding items`;
                    } else {
                        shippingCost = rules.get(totalDressesForShipping.toString()) || 0;
                        shippingMessage = `₹${shippingCost} shipping for ${totalDressesForShipping} maternity feeding item${totalDressesForShipping > 1 ? 's' : ''}`;
                    }
                    
                    // Add free shipping message if there are free shipping items in Tamil Nadu
                    if (isTamilNadu && totalFreeShippingItems > 0) {
                        shippingMessage += `, ${totalFreeShippingItems} lounge wear item${totalFreeShippingItems > 1 ? 's' : ''} free`;
                    }
                } else {
                    // Fallback to old logic if no rule found
                    if (totalDressesForShipping === 1) {
                        shippingCost = 39;
                        shippingMessage = "₹39 shipping for 1 maternity feeding item";
                    } else if (totalDressesForShipping === 2) {
                        shippingCost = 49;
                        shippingMessage = "₹49 shipping for 2 maternity feeding items";
                    } else if (totalDressesForShipping === 3) {
                        shippingCost = 59;
                        shippingMessage = "₹59 shipping for 3 maternity feeding items";
                    } else if (totalDressesForShipping > 3) {
                        shippingCost = 69;
                        shippingMessage = "₹69 shipping for 4+ maternity feeding items";
                    }
                    
                    // Add free shipping message if there are free shipping items in Tamil Nadu
                    if (isTamilNadu && totalFreeShippingItems > 0) {
                        shippingMessage += `, ${totalFreeShippingItems} lounge wear item${totalFreeShippingItems > 1 ? 's' : ''} free`;
                    }
                }
            } catch (error) {
                console.error('Error calculating shipping with rules:', error);
                // Fallback to old logic
                if (totalDressesForShipping === 1) {
                    shippingCost = 39;
                    shippingMessage = "₹39 shipping for 1 maternity feeding item";
                } else if (totalDressesForShipping === 2) {
                    shippingCost = 49;
                    shippingMessage = "₹49 shipping for 2 maternity feeding items";
                } else if (totalDressesForShipping === 3) {
                    shippingCost = 59;
                    shippingMessage = "₹59 shipping for 3 maternity feeding items";
                } else if (totalDressesForShipping > 3) {
                    shippingCost = 69;
                    shippingMessage = "₹69 shipping for 4+ maternity feeding items";
                }
                
                // Add free shipping message if there are free shipping items in Tamil Nadu
                if (isTamilNadu && totalFreeShippingItems > 0) {
                    shippingMessage += `, ${totalFreeShippingItems} lounge wear item${totalFreeShippingItems > 1 ? 's' : ''} free`;
                }
            }
        } else {
            // Regular categories (This block now correctly handles items in "Other States")
            if (isTamilNadu) {
                // This block should now only be entered if there are ONLY free shipping items in the cart for a TN address.
                shippingCost = 0;
                isFreeShipping = true;
                const totalItemsInCart = items.reduce((sum, item) => sum + item.quantity, 0);
                if (totalItemsInCart > 0) {
                    shippingMessage = `Free shipping for ${totalItemsInCart} item${totalItemsInCart > 1 ? 's' : ''} within Tamil Nadu!`;
                } else {
                    shippingMessage = "Free shipping within Tamil Nadu!";
                }
            } else {
                // Other states - charge shipping
                if (totalDressesForShipping === 1) {
                    shippingCost = 39;
                    shippingMessage = "₹39 shipping for 1 item";
                } else if (totalDressesForShipping === 2) {
                    shippingCost = 59;
                    shippingMessage = "₹59 shipping for 2 items";
                } else if (totalDressesForShipping === 3) {
                    shippingCost = 89;
                    shippingMessage = "₹89 shipping for 3 items";
                } else if (totalDressesForShipping > 3) {
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
                totalDressesForShipping,
                totalFreeShippingItems,
                hasMaternityFeedingWear,
                isTamilNadu,
                // Debug information
                totalItems: items.reduce((sum, item) => sum + item.quantity, 0),
                paidShippingItems: itemsForShippingCalculation.length,
                freeShippingItems: freeShippingItems.length
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