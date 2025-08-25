import ShippingRules from '../models/ShippingRules.js';
import { successResponse, errorResponse } from '../utils/response.js';

// Get all shipping rules
export const getAllShippingRules = async (req, res) => {
    try {
        const rules = await ShippingRules.find().sort({ category: 1 });
        successResponse(res, rules, 'Shipping rules retrieved successfully');
    } catch (error) {
        console.error('Get shipping rules error:', error);
        errorResponse(res, 500, 'Failed to retrieve shipping rules');
    }
};

// Get shipping rule by category
export const getShippingRuleByCategory = async (req, res) => {
    try {
        const { category } = req.params;
        const rule = await ShippingRules.findOne({ category });
        
        if (!rule) {
            return errorResponse(res, 404, 'Shipping rule not found for this category');
        }
        
        successResponse(res, rule, 'Shipping rule retrieved successfully');
    } catch (error) {
        console.error('Get shipping rule error:', error);
        errorResponse(res, 500, 'Failed to retrieve shipping rule');
    }
};

// Create new shipping rule
export const createShippingRule = async (req, res) => {
    try {
        const { category, categoryName, rules } = req.body;
        
        // Check if rule already exists for this category
        const existingRule = await ShippingRules.findOne({ category });
        if (existingRule) {
            return errorResponse(res, 400, 'Shipping rule already exists for this category');
        }
        
        const newRule = new ShippingRules({
            category,
            categoryName,
            rules
        });
        
        await newRule.save();
        successResponse(res, newRule, 'Shipping rule created successfully', 201);
    } catch (error) {
        console.error('Create shipping rule error:', error);
        errorResponse(res, 500, 'Failed to create shipping rule');
    }
};

// Update shipping rule
export const updateShippingRule = async (req, res) => {
    try {
        const { category } = req.params;
        const updateData = req.body;
        
        const rule = await ShippingRules.findOneAndUpdate(
            { category },
            { ...updateData, updatedAt: new Date() },
            { new: true, runValidators: true }
        );
        
        if (!rule) {
            return errorResponse(res, 404, 'Shipping rule not found for this category');
        }
        
        successResponse(res, rule, 'Shipping rule updated successfully');
    } catch (error) {
        console.error('Update shipping rule error:', error);
        errorResponse(res, 500, 'Failed to update shipping rule');
    }
};

// Delete shipping rule
export const deleteShippingRule = async (req, res) => {
    try {
        const { category } = req.params;
        
        const rule = await ShippingRules.findOneAndDelete({ category });
        
        if (!rule) {
            return errorResponse(res, 404, 'Shipping rule not found for this category');
        }
        
        successResponse(res, null, 'Shipping rule deleted successfully');
    } catch (error) {
        console.error('Delete shipping rule error:', error);
        errorResponse(res, 500, 'Failed to delete shipping rule');
    }
};

// Calculate shipping cost using rules
export const calculateShippingWithRules = async (req, res) => {
    try {
        const { items, shippingInfo } = req.body;
        
        if (!items || !Array.isArray(items)) {
            return errorResponse(res, 400, 'Items array is required');
        }

        if (!shippingInfo || !shippingInfo.state) {
            return errorResponse(res, 400, 'Shipping information is required');
        }

        // Group items by category and calculate total quantity per category
        const categoryQuantities = {};
        let totalItems = 0;
        
        for (const item of items) {
            const category = item.categorySlug || item.category;
            if (category) {
                if (!categoryQuantities[category]) {
                    categoryQuantities[category] = 0;
                }
                categoryQuantities[category] += item.quantity;
                totalItems += item.quantity;
            }
        }

        // Calculate shipping for each category
        let totalShippingCost = 0;
        let shippingDetails = [];
        let isFreeShipping = false;
        
        for (const [category, quantity] of Object.entries(categoryQuantities)) {
            const rule = await ShippingRules.findOne({ category, isActive: true });
            
            if (rule) {
                const shippingResult = await ShippingRules.calculateShipping(category, quantity, shippingInfo.state);
                if (shippingResult) {
                    totalShippingCost += shippingResult.shippingCost;
                    shippingDetails.push({
                        category: rule.categoryName,
                        quantity,
                        shippingCost: shippingResult.shippingCost,
                        message: shippingResult.shippingMessage
                    });
                }
            } else {
                // Fallback to default shipping logic for categories without rules
                // Normalize state name for robust matching
                const normalizedState = shippingInfo.state
                    .trim()
                    .toLowerCase()
                    .replace(/\s+/g, '') // Remove all whitespace
                    .replace(/[^a-z]/g, ''); // Remove non-alphabetic characters
                const isTamilNadu = ['tamilnadu', 'tamilnaadu', 'tamil'].includes(normalizedState);
                let fallbackCost = 0;
                
                if (isTamilNadu) {
                    fallbackCost = 0; // Free shipping for Tamil Nadu
                } else {
                    if (quantity === 1) fallbackCost = 39;
                    else if (quantity === 2) fallbackCost = 59;
                    else if (quantity === 3) fallbackCost = 89;
                    else fallbackCost = 105; // 4+ items
                }
                
                totalShippingCost += fallbackCost;
                shippingDetails.push({
                    category: category,
                    quantity,
                    shippingCost: fallbackCost,
                    message: fallbackCost === 0 ? 'Free shipping' : `₹${fallbackCost} shipping for ${quantity} item${quantity > 1 ? 's' : ''}`
                });
            }
        }

        // Check if any category has free shipping
        isFreeShipping = totalShippingCost === 0;

        const response = {
            success: true,
            data: {
                shippingCost: totalShippingCost,
                isFreeShipping,
                shippingMessage: isFreeShipping ? 'Free shipping!' : `₹${totalShippingCost} total shipping`,
                totalItems,
                categoryQuantities,
                shippingDetails,
                state: shippingInfo.state
            }
        };

        res.json(response);

    } catch (error) {
        console.error('Calculate shipping with rules error:', error);
        res.status(500).json(errorResponse('Failed to calculate shipping', error.message));
    }
};

// Seed default shipping rules
export const seedDefaultShippingRules = async (req, res) => {
    try {
        const defaultRules = [
            {
                category: 'maternity-feeding-wear',
                categoryName: 'Maternity Feeding Wear',
                rules: {
                    tamilNadu: new Map([
                        ['1', 39],
                        ['2', 49],
                        ['3', 59],
                        ['4', 69],
                        ['5', 79],
                        ['6', 89],
                        ['7+', 99]
                    ]),
                    otherStates: new Map([
                        ['1', 49],
                        ['2', 69],
                        ['3', 89],
                        ['4+', 109]
                    ])
                }
            },
            {
                category: 'zipless-feeding-lounge-wear',
                categoryName: 'Zipless Feeding Lounge Wear',
                rules: {
                    tamilNadu: new Map([
                        ['1', 0],  // Free shipping in Tamil Nadu
                        ['2', 0],
                        ['3', 0],
                        ['4', 0],
                        ['5', 0],
                        ['6', 0],
                        ['7+', 0]
                    ]),
                    otherStates: new Map([
                        ['1', 39],
                        ['2', 49],
                        ['3', 59],
                        ['4+', 69]
                    ])
                }
            },
            {
                category: 'non-feeding-lounge-wear',
                categoryName: 'Non-Feeding Lounge Wear',
                rules: {
                    tamilNadu: new Map([
                        ['1', 0],  // Free shipping in Tamil Nadu
                        ['2', 0],
                        ['3', 0],
                        ['4', 0],
                        ['5', 0],
                        ['6', 0],
                        ['7+', 0]
                    ]),
                    otherStates: new Map([
                        ['1', 39],
                        ['2', 49],
                        ['3', 59],
                        ['4+', 69]
                    ])
                }
            },
            {
                category: 'zipless-feeding-dupatta-lounge-wear',
                categoryName: 'Zipless Feeding Dupatta Lounge Wear',
                rules: {
                    tamilNadu: new Map([
                        ['1', 0],  // Free shipping in Tamil Nadu
                        ['2', 0],
                        ['3', 0],
                        ['4', 0],
                        ['5', 0],
                        ['6', 0],
                        ['7+', 0]
                    ]),
                    otherStates: new Map([
                        ['1', 39],
                        ['2', 49],
                        ['3', 59],
                        ['4+', 69]
                    ])
                }
            }
        ];

        for (const rule of defaultRules) {
            await ShippingRules.findOneAndUpdate(
                { category: rule.category },
                rule,
                { upsert: true, new: true, runValidators: true }
            );
        }

        successResponse(res, null, 'Default shipping rules seeded successfully');
    } catch (error) {
        console.error('Seed shipping rules error:', error);
        errorResponse(res, 500, 'Failed to seed shipping rules');
    }
}; 