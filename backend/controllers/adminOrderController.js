import orderModel from "../models/orderModel.js";

// Get all orders (admin only)
// Update order status
export const updateOrderStatus = async (req, res) => {
    try {
        const { orderId, status, shippingPartner, trackingId } = req.body;

        if (!orderId || !status) {
            return res.status(400).json({
                success: false,
                message: "Order ID and status are required"
            });
        }

        const validStatuses = ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                message: "Invalid status value"
            });
        }

        const updateData = { orderStatus: status };
        
        // Add shipping details if provided
        if (status === 'Shipped' && shippingPartner && trackingId) {
            updateData.shippingDetails = {
                partner: shippingPartner,
                trackingId: trackingId,
                shippedAt: new Date()
            };
        }

        const order = await orderModel.findByIdAndUpdate(
            orderId,
            updateData,
            { new: true }
        );

        if (!order) {
            return res.status(404).json({
                success: false,
                message: "Order not found"
            });
        }

        res.json({
            success: true,
            message: `Order status updated to ${status}`,
            order
        });

    } catch (error) {
        console.error('Update order status error:', error);
        res.status(500).json({
            success: false,
            message: "Failed to update order status",
            error: error.message
        });
    }
};

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
