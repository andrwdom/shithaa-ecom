import orderModel from "../models/orderModel.js";

// Get all orders (admin only)
export const getAllOrders = async (req, res) => {
    try {
        const orders = await orderModel.find({})
            .sort({ createdAt: -1 })
            .select('-__v');

        res.json({ 
            success: true, 
            orders
        });

    } catch (error) {
        console.error('Get all orders error:', error);
        res.status(500).json({ 
            success: false, 
            message: "Failed to fetch orders",
            error: error.message 
        });
    }
};
