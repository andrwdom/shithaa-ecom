import orderModel from "../models/orderModel.js"
import productModel from "../models/productModel.js"
import { reserveStock, releaseStock, checkStockAvailability } from "./stockController.js"
import mongoose from "mongoose"

// Generate unique order ID
async function getUniqueOrderId() {
    let orderId;
    let attempts = 0;
    const maxAttempts = 10;
    
    do {
        orderId = generateRandomOrderId();
        attempts++;
        
        // Check if orderId already exists
        const existingOrder = await orderModel.findOne({ orderId });
        if (!existingOrder) {
            return orderId;
        }
    } while (attempts < maxAttempts);
    
    throw new Error('Failed to generate unique order ID after multiple attempts');
}

function generateRandomOrderId() {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `ORD-${timestamp}-${random}`.toUpperCase();
}

// Create order with atomic stock reservation
const createOrder = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    
    try {
        const {
            userInfo,
            shippingInfo,
            items,
            couponUsed,
            totalAmount,
            paymentStatus = 'pending',
            createdAt
        } = req.body;

        // Validate required fields
        if (!userInfo || !shippingInfo || !items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ 
                success: false, 
                message: "Missing required fields: userInfo, shippingInfo, and items array" 
            });
        }

        // Validate items structure
        const itemsWithIds = items.map(item => ({
            ...item,
            _id: item._id || item.id
        }));

        // Check stock availability before proceeding
        const stockChecks = await checkStockAvailability(itemsWithIds);
        const unavailableItems = stockChecks.filter(check => !check.available);
        
        if (unavailableItems.length > 0) {
            const errors = unavailableItems.map(item => item.error).join('; ');
            return res.status(400).json({ 
                success: false, 
                message: `Stock issues found: ${errors}` 
            });
        }

        // Reserve stock atomically
        const reservedItems = await reserveStock(itemsWithIds, session);
        
        // Generate unique order ID
        const orderId = await getUniqueOrderId();
        
        // Create order document
        const orderDoc = {
            userInfo,
            shippingInfo,
            items: reservedItems,
            couponUsed: couponUsed || null,
            totalAmount,
            status: 'Pending',
            orderStatus: 'Pending',
            paymentStatus,
            createdAt: createdAt ? new Date(createdAt) : new Date(),
            email: userInfo.email,
            userId: userInfo.userId || undefined,
            orderId
        };

        // Create order in database
        const order = await orderModel.create([orderDoc], { session });
        
        // Commit transaction
        await session.commitTransaction();
        
        console.log(`Order created successfully: ${orderId} for user ${userInfo.userId || userInfo.email}`);
        
        res.status(201).json({ 
            success: true, 
            order: order[0],
            message: "Order created successfully"
        });

    } catch (error) {
        await session.abortTransaction();
        console.error('Create order error:', error);
        res.status(500).json({ 
            success: false, 
            message: "Failed to create order",
            error: error.message 
        });
    } finally {
        session.endSession();
    }
};

// Place order with atomic stock reservation
const placeOrder = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    
    try {
        const {
            customerName,
            email,
            phone,
            address,
            items,
            totalPrice,
            paymentMethod,
            isTestOrder = false
        } = req.body;

        if (!customerName || !email || !phone || !address || !items || !totalPrice || !paymentMethod) {
            return res.status(400).json({ 
                success: false, 
                message: 'Missing required fields' 
            });
        }

        // Check stock availability
        const stockChecks = await checkStockAvailability(items);
        const unavailableItems = stockChecks.filter(check => !check.available);
        
        if (unavailableItems.length > 0) {
            const errors = unavailableItems.map(item => item.error).join('; ');
            return res.status(400).json({ 
                success: false, 
                message: `Stock issues found: ${errors}` 
            });
        }

        // Reserve stock atomically
        const reservedItems = await reserveStock(items, session);
        
        // Generate unique order ID
        const orderId = await getUniqueOrderId();
        
        // Create order data
        const orderData = {
            customerName,
            email,
            phone,
            address: {
                line1: address.line1,
                line2: address.line2 || '',
                city: address.city,
                state: address.state,
                pincode: address.pincode
            },
            items: reservedItems.map(item => ({
                _id: item._id,
                name: item.productName || item.name,
                quantity: item.quantity,
                price: item.price,
                image: item.image,
                size: item.size
            })),
            totalPrice,
            paymentMethod,
            status: 'Pending',
            isTestOrder,
            userId: req.user && req.user.id,
            userInfo: { email },
            orderId
        };

        // Create order in database
        const order = await orderModel.create([orderData], { session });
        
        // Commit transaction
        await session.commitTransaction();
        
        console.log(`Order placed successfully: ${orderId} for customer ${customerName}`);
        
        res.status(201).json({ 
            success: true, 
            order: order[0],
            message: "Order placed successfully"
        });

    } catch (error) {
        await session.abortTransaction();
        console.error('Place order error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to place order',
            error: error.message 
        });
    } finally {
        session.endSession();
    }
};

// Cancel order and restore stock
const cancelOrder = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    
    try {
        const { orderId } = req.body;
        const userId = req.user.id;

        if (!orderId) {
            return res.status(400).json({ 
                success: false, 
                message: "Order ID is required" 
            });
        }

        // Find order
        const order = await orderModel.findById(orderId).session(session);
        if (!order) {
            return res.status(404).json({ 
                success: false, 
                message: "Order not found" 
            });
        }

        // Check if user owns this order
        if (order.userId && order.userId.toString() !== userId) {
            return res.status(403).json({ 
                success: false, 
                message: "You can only cancel your own orders" 
            });
        }

        // Check if order can be cancelled
        if (order.status === 'Delivered' || order.status === 'Cancelled') {
            return res.status(400).json({ 
                success: false, 
                message: `Order cannot be cancelled in ${order.status} status` 
            });
        }

        // Update order status
        await orderModel.findByIdAndUpdate(
            orderId, 
            {
                status: 'Cancelled',
                cancelledBy: {
                    name: req.user.name || 'User',
                    userId: userId,
                    timestamp: new Date()
                }
            },
            { session }
        );

        // Restore product stock atomically
        await releaseStock(order.items, session);
        
        // Commit transaction
        await session.commitTransaction();

        console.log(`Order ${orderId} cancelled successfully by user ${userId}`);

        res.json({ 
            success: true, 
            message: "Order cancelled successfully" 
        });

    } catch (error) {
        await session.abortTransaction();
        console.error('Cancel order error:', error);
        res.status(500).json({ 
            success: false, 
            message: "Failed to cancel order",
            error: error.message 
        });
    } finally {
        session.endSession();
    }
};

// Update order status
const updateOrderStatus = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    
    try {
        const { orderId, status, adminNotes } = req.body;
        const adminId = req.user.id;

        if (!orderId || !status) {
            return res.status(400).json({ 
                success: false, 
                message: "Order ID and status are required" 
            });
        }

        // Find order
        const order = await orderModel.findById(orderId).session(session);
        if (!order) {
            return res.status(404).json({ 
                success: false, 
                message: "Order not found" 
            });
        }

        // Check if status change is valid
        const validStatuses = ['Pending', 'Confirmed', 'Processing', 'Shipped', 'Delivered', 'Cancelled'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ 
                success: false, 
                message: `Invalid status. Must be one of: ${validStatuses.join(', ')}` 
            });
        }

        // Handle stock restoration for cancelled orders
        if (status === 'Cancelled' && order.status !== 'Cancelled') {
            await releaseStock(order.items, session);
            console.log(`Stock restored for cancelled order ${orderId}`);
        }

        // Update order status
        const updateData = {
            status,
            orderStatus: status,
            updatedBy: {
                adminId,
                timestamp: new Date()
            }
        };

        if (adminNotes) {
            updateData.adminNotes = adminNotes;
        }

        await orderModel.findByIdAndUpdate(orderId, updateData, { session });
        
        // Commit transaction
        await session.commitTransaction();

        console.log(`Order ${orderId} status updated to ${status} by admin ${adminId}`);

        res.json({ 
            success: true, 
            message: "Order status updated successfully" 
        });

    } catch (error) {
        await session.abortTransaction();
        console.error('Update order status error:', error);
        res.status(500).json({ 
            success: false, 
            message: "Failed to update order status",
            error: error.message 
        });
    } finally {
        session.endSession();
    }
};

// Get user orders
const getUserOrders = async (req, res) => {
    try {
        const userId = req.user.id;
        
        const orders = await orderModel.find({ userId })
            .sort({ createdAt: -1 })
            .select('-__v');

        res.json({ 
            success: true, 
            orders,
            count: orders.length
        });

    } catch (error) {
        console.error('Get user orders error:', error);
        res.status(500).json({ 
            success: false, 
            message: "Failed to get user orders",
            error: error.message 
        });
    }
};

// Get order by ID
const getOrderById = async (req, res) => {
    try {
        const { orderId } = req.params;
        const userId = req.user.id;

        const order = await orderModel.findById(orderId);
        if (!order) {
            return res.status(404).json({ 
                success: false, 
                message: "Order not found" 
            });
        }

        // Check if user owns this order
        if (order.userId && order.userId.toString() !== userId) {
            return res.status(403).json({ 
                success: false, 
                message: "Access denied" 
            });
        }

        res.json({ 
            success: true, 
            order 
        });

    } catch (error) {
        console.error('Get order by ID error:', error);
        res.status(500).json({ 
            success: false, 
            message: "Failed to get order",
            error: error.message 
        });
    }
};

// Get all orders (admin only)
const getAllOrders = async (req, res) => {
    try {
        const { page = 1, limit = 20, status, search } = req.query;
        
        const query = {};
        
        if (status && status !== 'all') {
            query.status = status;
        }
        
        if (search) {
            query.$or = [
                { orderId: { $regex: search, $options: 'i' } },
                { 'userInfo.name': { $regex: search, $options: 'i' } },
                { 'userInfo.email': { $regex: search, $options: 'i' } }
            ];
        }

        const skip = (page - 1) * limit;
        
        const orders = await orderModel.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit))
            .select('-__v');

        const total = await orderModel.countDocuments(query);

        res.json({ 
            success: true, 
            orders,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / limit)
            }
        });

    } catch (error) {
        console.error('Get all orders error:', error);
        res.status(500).json({ 
            success: false, 
            message: "Failed to get orders",
            error: error.message 
        });
    }
};

export {
    createOrder,
    placeOrder,
    cancelOrder,
    updateOrderStatus,
    getUserOrders,
    getOrderById,
    getAllOrders
}; 