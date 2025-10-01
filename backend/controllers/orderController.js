import orderModel from "../models/orderModel.js";
import userModel from "../models/userModel.js";
import productModel from "../models/productModel.js";
import { successResponse, errorResponse, paginatedResponse } from '../utils/response.js'
import PDFDocument from "pdfkit";
import { Readable } from "stream";
import Coupon from '../models/Coupon.js';
import mongoose from 'mongoose';
import crypto from 'crypto';
import counterModel from '../models/counterModel.js';
import Logger from '../utils/logger.js';

// global variables
const currency = 'inr'
const deliveryCharge = 10

// GET /api/orders/user - RESTful user orders fetch
export const getUserOrders = async (req, res) => {
    try {
        if (!req.user) {
            console.error('No user found in request for getUserOrders');
            return res.status(401).json({ message: 'Authentication required' });
        }
        const { page = 1, limit = 20 } = req.query;
        const skip = (page - 1) * limit;
        const userId = req.user.id;
        const userEmail = req.user.email;
        const orQuery = [];
        if (userId) {
          orQuery.push({ userId: userId });
                  if (typeof userId === 'string' && userId.length === 24 && /^[a-fA-F0-9]{24}$/.test(userId)) {
          try {
            const { Types } = await import('mongoose');
            const objectId = Types.ObjectId(userId);
            orQuery.push({ userId: objectId });
          } catch (e) {
            // ignore invalid ObjectId
          }
        }
        }
        if (userEmail) {
          orQuery.push({ email: userEmail });
        }
        if (orQuery.length === 0) {
          return res.status(400).json({ message: 'No valid user identifier found' });
        }
        // Full debug logging
        // console.log('getUserOrders FULL DEBUG:');
        // console.log('req.user:', req.user);
        console.log('orQuery:', JSON.stringify(orQuery, null, 2));
        const orders = await orderModel.find({ $or: orQuery })
            .sort({ date: -1 })
            .skip(skip)
            .limit(Number(limit));
        console.log('Orders found:', orders.length);
        orders.forEach((order, idx) => {
          // console.log(`Order[${idx}]: _id=${order._id}, userId=${order.userId}, email=${order.email}, isTestOrder=${order.isTestOrder}`);
        });
        const total = await orderModel.countDocuments({ $or: orQuery });
        const totalPages = Math.ceil(total / limit);
        paginatedResponse(res, orders, total, page, totalPages, 'Orders fetched successfully');
    } catch (error) {
        console.error('Get User Orders Error:', error);
        errorResponse(res, 500, error.message);
    }
};

// GET /api/orders/:id - RESTful single order fetch
export const getOrderById = async (req, res) => {
    try {
        let order;
        const { id } = req.params;
        // Check if id is a valid MongoDB ObjectId
        if (id && /^[a-fA-F0-9]{24}$/.test(id)) {
            order = await orderModel.findById(id);
        }
        // If not found or not a valid ObjectId, try by orderId
        if (!order) {
            order = await orderModel.findOne({ orderId: id });
        }
        if (!order) {
            return errorResponse(res, 404, 'Order not found');
        }
        // Allow access to test orders for debugging
        if (order.isTestOrder === true) {
            // Always include shippingAddress in response
            return successResponse(res, { ...order.toObject(), shippingAddress: order.shippingAddress || null }, 'Order fetched successfully (test order, debug mode)');
        }
        // Check if user owns this order or is admin
        const userId = order.userInfo?.userId || order.userId;
            if (!req.user || (userId && userId.toString() !== req.user.id && (!req.user.role || req.user.role !== 'admin'))) {
            return errorResponse(res, 403, 'Access denied');
        }
        // Always include shippingAddress in response
        successResponse(res, { ...order.toObject(), shippingAddress: order.shippingAddress || null }, 'Order fetched successfully');
    } catch (error) {
        console.error('Get Order By ID Error:', error);
        errorResponse(res, 500, error.message);
    }
};

// GET /api/orders/transaction/:transactionId - Get order by PhonePe transaction ID
export const getOrderByTransactionId = async (req, res) => {
    try {
        const { transactionId } = req.params;
        
        if (!transactionId) {
            return errorResponse(res, 400, 'Transaction ID is required');
        }

        const order = await orderModel.findOne({ phonepeTransactionId: transactionId });
        
        if (!order) {
            return errorResponse(res, 404, 'Order not found for this transaction');
        }

        // For transaction-based lookups, we allow access without strict user validation
        // since this is typically used in payment callbacks where user context might be limited
        // However, we still include user info if available for security purposes
        const userId = order.userInfo?.userId || order.userId;
        
        // If user is authenticated, verify ownership or admin access
        if (req.user) {
            if (userId && userId.toString() !== req.user.id && (!req.user.role || req.user.role !== 'admin')) {
                return errorResponse(res, 403, 'Access denied');
            }
        }

        // Always include shippingAddress in response
        successResponse(res, { ...order.toObject(), shippingAddress: order.shippingAddress || null }, 'Order fetched successfully by transaction ID');
    } catch (error) {
        console.error('Get Order By Transaction ID Error:', error);
        errorResponse(res, 500, error.message);
    }
};

/**
 * Get a single order by its public-facing orderId string (e.g., "SHITHAA-1234")
 */
export const getOrderByPublicId = async (req, res) => {
  try {
    const { orderId } = req.params;
    const order = await orderModel.findOne({ orderId: orderId });

    if (!order) {
      return errorResponse(res, 404, 'Order not found');
    }

    // Optional: Add authorization check if needed, e.g., for guest users vs logged-in users
    // For now, we assume if you have the orderId, you can view the summary.

    return successResponse(res, order);
  } catch (error) {
    console.error(`Error fetching order by public ID: ${req.params.orderId}`, error);
    return errorResponse(res, 500, 'Failed to fetch order', error.message);
  }
};

// Helper to get user email
function getOrderUserEmail(req, fallback) {
  return (req.user && req.user.email) || fallback || '';
}

// Helper to generate a random 4-character alphanumeric string
function generateRandomOrderId() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let id = '';
  for (let i = 0; i < 4; i++) {
    id += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return id;
}

// Helper to get a unique random orderId
async function getUniqueOrderId() {
  let orderId;
  let exists = true;
  while (exists) {
    orderId = generateRandomOrderId();
    exists = await orderModel.exists({ orderId });
  }
  return orderId;
}

// PATCH createOrder
export const createOrder = async (req, res) => {
    try {
        const {
            customerName,
            email,
            phone,
            address,
            items,
            totalPrice,
            paymentMethod,
            isTestOrder
        } = req.body;

        // Log order creation attempt
        Logger.info('order_creation_attempt', {
            customerName,
            email,
            itemCount: items?.length || 0,
            totalPrice,
            paymentMethod,
            isTestOrder: isTestOrder || false,
            userId: req.body.userId || req.user?.id
        });

        if (!customerName || !email || !phone || !address || !items || !totalPrice || !paymentMethod) {
            Logger.warn('order_creation_validation_failed', {
                missing: { customerName: !customerName, email: !email, phone: !phone, address: !address, items: !items, totalPrice: !totalPrice, paymentMethod: !paymentMethod }
            });
            return res.status(400).json({ message: 'Missing required fields' });
        }

        const userEmail = getOrderUserEmail(req, email);
        // --- Save shippingAddress in new format if present ---
        const shippingAddress = address && (address.flatHouseNo || address.streetAddress) ? {
            flatHouseNo: address.flatHouseNo || '',
            areaLocality: address.areaLocality || '',
            streetAddress: address.streetAddress || '',
            landmark: address.landmark || '',
            city: address.city || '',
            state: address.state || '',
            pincode: address.pincode || '',
            country: address.country || '',
            fullName: address.fullName || customerName || '',
            email: address.email || email || '',
            phone: address.phone || phone || ''
        } : undefined;
        const orderId = await getUniqueOrderId();
        const orderData = {
            customerName,
            email: userEmail,
            phone,
            address: {
                line1: address.line1,
                line2: address.line2 || '',
                city: address.city,
                state: address.state,
                pincode: address.pincode
            },
            // --- Add shippingAddress if available ---
            ...(shippingAddress ? { shippingAddress } : {}),
            items: items.map(item => ({
                name: item.name,
                quantity: item.quantity,
                price: item.price,
                image: item.image,
                size: item.size
            })),
            totalPrice,
            paymentMethod,
            status: 'PENDING',
            isTestOrder: isTestOrder || false,
            userId: req.body.userId || (req.user && req.user.id),
            userInfo: { email: userEmail },
            orderId
        };
        const order = await orderModel.create(orderData);
        
        // Log successful order creation
        Logger.order(order._id.toString(), 'created', {
            customerName,
            email: userEmail,
            itemCount: items.length,
            totalPrice,
            paymentMethod,
            orderId: order.orderId,
            userId: order.userId
        });
        
        res.status(201).json({ success: true, order });
    } catch (err) {
        // Log order creation failure
        Logger.error('order_creation_failed', err, {
            customerName: req.body.customerName,
            email: req.body.email,
            itemCount: req.body.items?.length || 0,
            totalPrice: req.body.totalPrice
        });
        console.error('Create Order Error:', err);
        res.status(500).json({ message: 'Server error while creating order' });
    }
};

// PATCH createStructuredOrder
const createStructuredOrder = async (req, res) => {
  try {
    console.log('=== CREATE STRUCTURED ORDER DEBUG ===');
    console.log('Request body:', JSON.stringify(req.body, null, 2));
    console.log('Request headers:', req.headers);
    // console.log('User info:', req.user);
    
    let { userInfo, shippingInfo, items, couponUsed, totalAmount, paymentStatus, createdAt } = req.body;
    
    console.log('Parsed fields:');
    // console.log('- userInfo:', userInfo);
    console.log('- shippingInfo:', shippingInfo);
    console.log('- items:', items);
    console.log('- totalAmount:', totalAmount);
    console.log('- paymentStatus:', paymentStatus);
    
    if (!userInfo || !shippingInfo || !items || !Array.isArray(items) || items.length === 0 || !totalAmount) {
      console.error('Missing required fields validation failed');
      console.error('- userInfo exists:', !!userInfo);
      console.error('- shippingInfo exists:', !!shippingInfo);
      console.error('- items exists:', !!items);
      console.error('- items is array:', Array.isArray(items));
      console.error('- items length:', items ? items.length : 'N/A');
      console.error('- totalAmount exists:', !!totalAmount);
      return res.status(400).json({ message: 'Missing required fields' });
    }
    const userEmail = getOrderUserEmail(req, userInfo.email);
    userInfo.name = userInfo.name || '';
    userInfo.email = userEmail;
    const itemsWithIds = items.map(item => ({
      ...item,
      _id: item._id || item.id || undefined,
      id: item._id || item.id || undefined,
    }));
    
    // Validate required shipping fields
    const requiredShippingFields = ['fullName', 'email', 'phone', 'addressLine1', 'city', 'state', 'postalCode'];
    console.log('Validating required shipping fields...');
    for (const field of requiredShippingFields) {
      console.log(`- ${field}:`, shippingInfo[field]);
      if (!shippingInfo[field]) {
        console.error(`Missing required shipping field: ${field}`);
        return res.status(400).json({ message: `Missing required shipping field: ${field}` });
      }
    }
    console.log('All required shipping fields are present');
    
    // Ensure shippingInfo has all required fields with proper structure
    const validatedShippingInfo = {
      fullName: shippingInfo.fullName,
      email: shippingInfo.email,
      phone: shippingInfo.phone,
      addressLine1: shippingInfo.addressLine1,
      addressLine2: shippingInfo.addressLine2 || '',
      city: shippingInfo.city,
      state: shippingInfo.state,
      postalCode: shippingInfo.postalCode,
      country: shippingInfo.country || 'India'
    };
    console.log('Validated shipping info:', validatedShippingInfo);
    
    // Extra validation and logging for items
    console.log('Validating order items...');
    for (const item of itemsWithIds) {
      console.log('Validating item:', item);
      if (!item._id) {
        console.error('Order item missing _id:', item);
        return res.status(400).json({ message: `Order item missing _id: ${JSON.stringify(item)}` });
      }
      console.log(`Looking up product with _id: ${item._id}`);
      const product = await productModel.findById(item._id);
      if (!product) {
        console.error(`Product not found for _id: ${item._id}`);
        return res.status(400).json({ message: `Product not found for _id: ${item._id}` });
      }
      console.log(`Product found: ${product.name}`);
      console.log(`Looking for size: ${item.size} in product sizes:`, product.sizes.map(s => s.size));
      const sizeObj = product.sizes.find(s => s.size === item.size);
      if (!sizeObj) {
        console.error(`Size ${item.size} not found for product ${product.name}`);
        return res.status(400).json({ message: `Size ${item.size} not found for product ${product.name}` });
      }
      console.log(`Size found: ${sizeObj.size}, stock: ${sizeObj.stock}, requested: ${item.quantity}`);
      if (sizeObj.stock < item.quantity) {
        console.error(`Insufficient stock for ${product.name} in size ${item.size}. Only ${sizeObj.stock} available.`);
        return res.status(400).json({ message: `Insufficient stock for ${product.name} in size ${item.size}. Only ${sizeObj.stock} available.` });
      }
      console.log(`Item validation passed: ${product.name} - ${item.size} - ${item.quantity}`);
    }
    console.log('All items validation passed');
    const orderId = await getUniqueOrderId();
    console.log('Generated order ID:', orderId);
    
    const orderDoc = {
      userInfo,
      shippingInfo: validatedShippingInfo,
      items: itemsWithIds,
      couponUsed: couponUsed || null,
      totalAmount,
      status: 'PENDING',
      orderStatus: 'PENDING',
      paymentStatus: paymentStatus === 'paid' ? 'PAID' : 'PENDING',
      createdAt: createdAt ? new Date(createdAt) : new Date(),
      email: userEmail,
      userId: userInfo.userId || undefined,
      orderId
    };
    
    console.log('Final order document:', JSON.stringify(orderDoc, null, 2));
    console.log('Creating order in database...');
    
    const order = await orderModel.create(orderDoc);
    console.log('Order created successfully:', order._id);
    
    res.status(201).json({ success: true, order });
  } catch (err) {
    console.error('Create Structured Order Error (detailed):', err);
    console.error('Error stack:', err.stack);
    res.status(500).json({ message: 'Server error while creating order', error: err.message, stack: err.stack });
  }
};

async function updateProductStock(items) {
    for (const item of items) {
        console.log('Looking up product for item:', item);
        let product = null;
        if (item._id) {
          product = await productModel.findById(item._id);
        }
        if (!product && item.id) {
          product = await productModel.findById(item.id);
        }
        if (!product) {
            console.error(`Product ${item.name} not found (id: ${item.id}, _id: ${item._id})`);
            throw new Error(`Product ${item.name} not found (id: ${item.id}, _id: ${item._id})`);
        }
        // Find the size object and update stock
        const sizeIndex = product.sizes.findIndex(s => s.size === item.size);
        if (sizeIndex === -1) {
            console.error(`Size ${item.size} not found for product ${item.name}`);
            throw new Error(`Size ${item.size} not found for product ${item.name}`);
        }
        if (product.sizes[sizeIndex].stock < item.quantity) {
            console.error(`Insufficient stock for ${item.name} in size ${item.size}. Only ${product.sizes[sizeIndex].stock} available.`);
            throw new Error(`Insufficient stock for ${item.name} in size ${item.size}. Only ${product.sizes[sizeIndex].stock} available.`);
        }
        // Stock validation only - actual decrement happens after payment confirmation
        console.log(`Stock validation: ${product.sizes[sizeIndex].stock} available for ${item.quantity} requested`);
    }
}

// PATCH placeOrder
const placeOrder = async (req, res) => {
  try {
    const {
      customerName,
      email,
      phone,
      address,
      items,
      totalPrice,
      paymentMethod,
      isTestOrder
    } = req.body;
    if (!customerName || !email || !phone || !address || !items || !totalPrice || !paymentMethod) {
      return res.status(400).json({ message: 'Missing required fields' });
    }
    // Validate stock availability without decrementing (stock will be decremented after payment confirmation)
    const { validateStockForItems } = await import('../utils/stock.js');
    const stockValidations = await validateStockForItems(items);
    
    // Check if any items have insufficient stock
    const stockIssues = stockValidations.filter(v => !v.available);
    if (stockIssues.length > 0) {
        const errorMessages = stockIssues.map(issue => issue.error).join('; ');
        return res.status(400).json({ message: `Stock validation failed: ${errorMessages}` });
    }
    const userEmail = getOrderUserEmail(req, email);
    const orderId = await getUniqueOrderId();
    const orderData = {
      customerName,
      email: userEmail,
      phone,
      address: {
        line1: address.line1,
        line2: address.line2 || '',
        city: address.city,
        state: address.state,
        pincode: address.pincode
      },
      items: items.map(item => ({
        name: item.name,
        quantity: item.quantity,
        price: item.price,
        image: item.image,
        size: item.size
      })),
      totalPrice,
      paymentMethod,
      status: 'PENDING',
      isTestOrder: isTestOrder || false,
      userId: req.user && req.user.id,
      userInfo: { email: userEmail },
      orderId
    };
    const order = await orderModel.create(orderData);
    res.status(201).json({ success: true, order });
  } catch (err) {
    console.error('Place Order Error:', err);
    res.status(500).json({ message: 'Server error while placing order' });
  }
};

// PATCH processCardPayment
const processCardPayment = async (req, res) => {
    try {
        const { userId, items, amount, address, cardDetails, email } = req.body;
        if (!cardDetails) {
            return res.json({ success: false, message: "Card details are required" });
        }
        // Validate stock availability without decrementing (stock will be decremented after payment confirmation)
        const { validateStockForItems } = await import('../utils/stock.js');
        const stockValidations = await validateStockForItems(items);
        
        // Check if any items have insufficient stock
        const stockIssues = stockValidations.filter(v => !v.available);
        if (stockIssues.length > 0) {
            const errorMessages = stockIssues.map(issue => issue.error).join('; ');
            return res.json({ success: false, message: `Stock validation failed: ${errorMessages}` });
        }
        const userEmail = getOrderUserEmail(req, email);
        const orderId = await getUniqueOrderId();
        const orderData = {
            userId,
            items,
            address,
            amount,
            paymentMethod: "Card",
            payment: true, // Assuming card payment is immediate
            date: Date.now(),
            email: userEmail,
            userInfo: { email: userEmail },
            orderId
        };
        const newOrder = new orderModel(orderData);
        await newOrder.save();
        await userModel.findByIdAndUpdate(userId, { cartData: {} });
        res.json({ success: true, message: "Order placed successfully", orderId: newOrder.orderId });
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message });
    }
};

// Get all orders (Admin)
const allOrders = async (req,res) => {
    try {
        const orders = await orderModel.find({}).sort({date: -1})
        res.json({success:true,orders})
    } catch (error) {
        console.log(error)
        res.json({success:false,message:error.message})
    }
}

// Get user orders (Legacy)
const userOrders = async (req,res) => {
    try {
        const { userId } = req.body
        const orders = await orderModel.find({userId}).sort({date: -1})
        res.json({success:true,orders})
    } catch (error) {
        console.log(error)
        res.json({success:false,message:error.message})
    }
}

// Update order status (Admin)
import { sendShippingNotification, sendOrderStatusUpdate } from '../utils/emailService.js';

const updateStatus = async (req,res) => {
    try {
        const { orderId, status, cancelledBy, shippingPartner, trackingId } = req.body;

        if (!orderId || !status) {
            return res.json({ success: false, message: "Order ID and status are required" });
        }

        const order = await orderModel.findById(orderId);
        if (!order) {
            return res.json({ success: false, message: "Order not found" });
        }

        // 🔧 FIX: Update all status fields consistently
        const updateData = { 
            status,
            orderStatus: status,
            updatedAt: new Date()
        };
        
        // Optionally update paymentStatus if delivered
        if (status === 'Delivered') {
            updateData.paymentStatus = 'paid';
        }

        // Handle shipping tracking data when status is 'Shipped'
        if (status === 'Shipped') {
            // Only require shipping details if they're provided
            if (shippingPartner && trackingId) {
                // Generate tracking URL
                const courierTrackingUrls = {
                    'DTDC': 'https://www.dtdc.in/trace.asp',
                    'ST Courier': 'https://stcourier.com/track/shipment',
                    'XpressBees': 'https://www.xpressbees.com/shipment/tracking',
                    'India Post': 'https://www.indiapost.gov.in/_layouts/15/dop.portal.tracking/trackconsignment.aspx',
                    'Delhivery': 'https://www.delhivery.com/track/package',
                    'Blue Dart': 'https://www.bluedart.com/tracking',
                    'Ecom Express': 'https://ecomexpress.in/tracking/'
                };

                const baseUrl = courierTrackingUrls[shippingPartner];
                const trackingUrl = baseUrl ? `${baseUrl}?tracking_id=${trackingId}` : null;

                updateData.shippingTracking = {
                    partner: shippingPartner,
                    trackingId: trackingId,
                    shippedAt: new Date(),
                    trackingUrl: trackingUrl
                };
                
                // Also store shipping details in a more accessible format
                updateData.shippingPartner = shippingPartner;
                updateData.trackingId = trackingId;
            }
        }

        // If cancelling, add cancellation details
        if (status === 'Cancelled' && cancelledBy) {
            updateData.cancelledBy = {
                name: cancelledBy.name,
                userId: cancelledBy.userId,
                timestamp: new Date()
            };

            // Restore product stock if order is cancelled using atomic operations
            const { changeStock } = await import('../utils/stock.js');
            try {
                // Restore stock for each item in the order
                for (const item of order.items) {
                    const productId = item._id || item.productId;
                    if (productId && item.size && item.quantity) {
                        await changeStock(productId, item.size, item.quantity); // Positive quantity to restore stock
                        console.log(`Stock restored for ${item.name} (${item.size}): +${item.quantity}`);
                    }
                }
                console.log('Stock restored successfully for cancelled order status update');
            } catch (error) {
                console.error('Failed to restore stock for cancelled order status update:', error);
                // Don't fail the order status update if stock restoration fails
            }
        }

        // 🔧 DEBUG: Log the update data before saving
        console.log('🔧 Updating order with data:', updateData);
        
        const updatedOrder = await orderModel.findByIdAndUpdate(orderId, updateData, { new: true });
        console.log('🔧 Order updated successfully:', updatedOrder?.orderId, 'Status:', updatedOrder?.status, 'OrderStatus:', updatedOrder?.orderStatus);

        // Send email notifications
        try {
            if (status === 'Shipped' && shippingPartner && trackingId) {
                console.log('🔧 Sending shipping notification email for order:', order.orderId);
                // Send shipping notification email with tracking details
                await sendShippingNotification(order, { partner: shippingPartner, trackingId });
                console.log('🔧 Shipping notification email sent successfully');
            } else {
                console.log('🔧 Sending general status update email for order:', order.orderId, 'Status:', status);
                // Send general status update email for all other statuses (including Shipped without tracking)
                await sendOrderStatusUpdate(order, status);
                console.log('🔧 Status update email sent successfully');
            }
        } catch (emailError) {
            console.error('❌ Error sending email notification:', emailError);
            // Don't fail the request if email fails
        }

        res.json({ success: true, message: "Order status updated successfully" });

    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message });
    }
}

// Cancel order (User)
const cancelOrder = async (req, res) => {
    try {
        const { orderId } = req.body;
        const userId = req.user.id;

        if (!orderId) {
            return res.json({ success: false, message: "Order ID is required" });
        }

        const order = await orderModel.findById(orderId);
        if (!order) {
            return res.json({ success: false, message: "Order not found" });
        }

        // Check if user owns this order
        if (order.userId.toString() !== userId) {
            return res.json({ success: false, message: "You can only cancel your own orders" });
        }

        // Check if order can be cancelled (not delivered or already cancelled)
        if (order.status === 'Delivered' || order.status === 'Cancelled') {
            return res.json({ success: false, message: `Order cannot be cancelled in ${order.status} status` });
        }

        // Update order status
        await orderModel.findByIdAndUpdate(orderId, {
            status: 'Cancelled',
            cancelledBy: {
                name: req.user.name || 'User',
                userId: userId,
                timestamp: new Date()
            }
        });

        // Restore product stock using atomic operations
        const { batchChangeStock } = await import('../utils/stock.js');
        try {
            const operations = order.items.map(item => ({
                productId: item._id,
                size: item.size,
                quantityChange: item.quantity
            }));
            
            await batchChangeStock(operations);
            console.log('Stock restored successfully for cancelled order');
        } catch (error) {
            console.error('Failed to restore stock for cancelled order:', error);
            // Don't fail the order cancellation if stock restoration fails
        }

        res.json({ success: true, message: "Order cancelled successfully" });

    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message });
    }
};

// Delete order (Admin only) - Permanent deletion with stock restoration
const deleteOrder = async (req, res) => {
    try {
        const { orderId } = req.params;

        if (!orderId) {
            return res.json({ success: false, message: "Order ID is required" });
        }

        const order = await orderModel.findById(orderId);
        if (!order) {
            return res.json({ success: false, message: "Order not found" });
        }

        // Restore stock if order was confirmed/shipped (not cancelled/failed)
        const shouldRestoreStock = ['CONFIRMED', 'Pending', 'Processing', 'Shipped'].includes(order.status || order.orderStatus);
        
        if (shouldRestoreStock && order.cartItems) {
            const { releaseStockReservation } = await import('../utils/stock.js');
            
            for (const item of order.cartItems) {
                try {
                    await releaseStockReservation(item.productId, item.size, item.quantity);
                    console.log(`Stock restored for ${item.name} (${item.size}): ${item.quantity} units`);
                } catch (stockError) {
                    console.error(`Failed to restore stock for item ${item.productId}:`, stockError);
                    // Continue with deletion even if stock restoration fails
                }
            }
        }

        // Delete the order permanently
        await orderModel.findByIdAndDelete(orderId);

        console.log(`Order ${order.orderId} deleted permanently by admin`);

        res.json({ 
            success: true, 
            message: "Order deleted successfully",
            stockRestored: shouldRestoreStock
        });

    } catch (error) {
        console.error('Delete order error:', error);
        res.json({ success: false, message: error.message });
    }
};

// Get all orders (Admin)
const getAllOrders = async (req, res) => {
    try {
        const orders = await orderModel.find().sort({ createdAt: -1 });
        // Always include shippingAddress in each order and ensure price fields are present
        const ordersWithShipping = orders.map(order => {
            const orderObj = order.toObject();
            
            // 🔍 DEBUG: Log all available fields for debugging
            console.log(`Order ${orderObj._id} all fields:`, {
                totalAmount: orderObj.totalAmount,
                total: orderObj.total,
                totalPrice: orderObj.totalPrice,
                amount: orderObj.amount,
                cartItems: orderObj.cartItems?.length,
                items: orderObj.items?.length,
                orderId: orderObj.orderId
            });
            
            // Ensure price fields are present - check cartItems first, then items
            const itemsToCheck = orderObj.cartItems && orderObj.cartItems.length > 0 
                ? orderObj.cartItems 
                : orderObj.items;
                
            if (!orderObj.totalAmount && !orderObj.total && !orderObj.totalPrice && !orderObj.amount) {
                // Calculate total from items if available
                if (itemsToCheck && Array.isArray(itemsToCheck) && itemsToCheck.length > 0) {
                    const calculatedTotal = itemsToCheck.reduce((sum, item) => {
                        return sum + (item.price || 0) * (item.quantity || 1);
                    }, 0);
                    orderObj.totalAmount = calculatedTotal;
                    orderObj.total = calculatedTotal;
                    orderObj.totalPrice = calculatedTotal;
                    orderObj.amount = calculatedTotal;
                    console.log(`Calculated total ${calculatedTotal} for order ${orderObj._id}`);
                }
            }
            
            // Ensure items array is available for frontend
            if (!orderObj.items && orderObj.cartItems) {
                orderObj.items = orderObj.cartItems;
            } else if (!orderObj.cartItems && orderObj.items) {
                orderObj.cartItems = orderObj.items;
            }
            
            return { ...orderObj, shippingAddress: orderObj.shippingAddress || null };
        });
        console.log('Orders fetched:', ordersWithShipping.length);
        res.status(200).json({ success: true, orders: ordersWithShipping });
    } catch (err) {
        console.error('Get Orders Error:', err);
        res.status(500).json({ message: 'Server error while fetching orders' });
    }
};

// Update order status (Admin) - Use the comprehensive updateStatus function
const updateOrderStatus = async (req, res) => {
  // Delegate to the comprehensive updateStatus function
  return await updateStatus(req, res);
};

export const generateInvoice = async (req, res) => {
  try {
    const { orderId } = req.params;
    const order = await orderModel.findById(orderId);
    if (!order) return res.status(404).json({ message: "Order not found" });

    // Access control: only owner or admin, or allow if test order
    if (!order.isTestOrder) {
      // Determine admin access from either attached user (optionalAuth)
      // or directly from the JWT (admin panel tokens may not map to userModel).
      let isAdmin = false;
      const user = req.user;
      if (user && (user.role === 'admin' || user.isAdmin === true)) {
        isAdmin = true;
      } else if (req.headers.token) {
        try {
          const jwt = (await import('jsonwebtoken')).default;
          const decoded = jwt.verify(req.headers.token, process.env.JWT_SECRET);
          if (decoded && decoded.role === 'admin') isAdmin = true;
        } catch (_) {}
      }
      const isOwner = user && (order.email === user.email || order.userInfo?.email === user.email);
      if (!isAdmin && !isOwner) {
        return res.status(403).json({ message: 'Unauthorized to access this invoice' });
      }
    }

    // Use new structured fields if present
    const shipping = order.shippingInfo || order.address;
    const billing = order.billingInfo;
    const items = order.cartItems?.length ? order.cartItems : order.items;
    const safeSubtotal = (items || []).reduce((sum, it) => sum + (Number(it?.price) || 0) * (Number(it?.quantity) || 0), 0);
    
    // 🔧 FIX: Calculate loungwear offer discount
    const loungwearOfferDiscount = order.offerDetails?.offerApplied ? (order.offerDetails?.offerDiscount || 0) : 0;
    
    const couponPct = (order.couponUsed?.discount || (order.discount?.type === 'percentage' ? (order.discount?.value || 0) : 0));
    const fixedDiscount = order.discount?.type && order.discount?.type !== 'percentage' ? (Number(order.discount?.value) || 0) : 0;
    const couponDiscount = Math.round((safeSubtotal * (couponPct || 0)) / 100) + (fixedDiscount || 0);
    const coupon = order.couponUsed?.code || order.discount?.appliedCouponCode;
    const shippingCost = Number(order.shippingCost) || 0;
    
    // 🔧 FIX: Include loungwear offer discount in total calculation
    const totalDiscount = loungwearOfferDiscount + couponDiscount;
    const total = order.totalAmount || order.total || order.totalPrice || order.amount || (safeSubtotal - totalDiscount + shippingCost);

    // PDF generation
    const doc = new PDFDocument({ size: "A4", margin: 40 });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename=Invoice_${order.orderId || order._id}.pdf`);
    doc.pipe(res);

    // --- HEADER ---
    doc.font('Helvetica-Bold').fontSize(30).fillColor('#473C66').text('Shithaa', { align: 'center' });
    doc.moveDown(0.1);
    doc.font('Helvetica').fontSize(13).fillColor('#B39DDB').text('Elegance for Every Mother', { align: 'center' });
    doc.moveDown(0.5);
    if (order.isTestOrder) {
      doc.font('Helvetica-Bold').fontSize(14).fillColor('#1976D2').text('TEST ORDER', { align: 'center' });
      doc.moveDown(0.5);
    }
    doc.moveTo(40, doc.y).lineTo(555, doc.y).strokeColor('#E1D5F6').lineWidth(1.2).stroke();
    doc.moveDown(0.7);
    doc.font('Helvetica-Bold').fontSize(11).fillColor('#333').text(`Order #`, { continued: true }).font('Helvetica').text(order.orderId || order._id);
    doc.font('Helvetica-Bold').text(`Order Date: `, { continued: true }).font('Helvetica').text(new Date(order.createdAt).toLocaleDateString('en-IN'));
    doc.moveDown(0.7);
    doc.moveTo(40, doc.y).lineTo(555, doc.y).strokeColor('#E1D5F6').lineWidth(1.2).stroke();
    doc.moveDown(0.7);

    // --- CUSTOMER INFO ---
    doc.font('Helvetica-Bold').fontSize(13).fillColor('#473C66').text('Customer Information');
    doc.moveDown(0.4);
    doc.font('Helvetica').fontSize(11).fillColor('#333');
    doc.text(`Name: `, { continued: true }).font('Helvetica-Bold').text(shipping?.fullName || order.customerName);
    doc.moveDown(0.2);
    doc.font('Helvetica').text(`Email: `, { continued: true }).font('Helvetica-Bold').text(shipping?.email || order.email);
    doc.moveDown(0.2);
    doc.font('Helvetica').text(`Phone: `, { continued: true }).font('Helvetica-Bold').text(shipping?.phone || order.phone);
    doc.moveDown(0.2);
    doc.font('Helvetica').text(`Address: `, { continued: true }).font('Helvetica-Bold').text([
      shipping?.addressLine1 || shipping?.line1,
      shipping?.addressLine2 || shipping?.line2,
      shipping?.city,
      shipping?.state,
      shipping?.zip || shipping?.pincode,
      shipping?.country
    ].filter(Boolean).join(', '));
    if (billing) {
      doc.moveDown(0.3);
      doc.font('Helvetica').text(`Billing Address: `, { continued: true }).font('Helvetica-Bold').text([
        billing.addressLine1,
        billing.addressLine2,
        billing.city,
        billing.state,
        billing.zip,
        billing.country
      ].filter(Boolean).join(', '));
    }
    doc.moveDown(0.7);
    doc.moveTo(40, doc.y).lineTo(555, doc.y).strokeColor('#E1D5F6').lineWidth(1.2).stroke();
    doc.moveDown(0.7);

    // --- PRODUCT SUMMARY TABLE ---
    doc.font('Helvetica-Bold').fontSize(13).fillColor('#473C66').text('Product Summary');
    doc.moveDown(0.4);

    // 🔧 IMPROVED: Better column layout with proper spacing
    const tableTop = doc.y;
    const colX = [40, 280, 320, 380, 450, 520]; // Adjusted column X coordinates

    // Table header with better spacing
    doc.font('Helvetica-Bold').fontSize(10).fillColor('#333');
    doc.text('Product', colX[0], tableTop, { width: colX[1] - colX[0] - 5 });
    doc.text('Qty', colX[1], tableTop, { width: colX[2] - colX[1] - 5, align: 'center' });
    doc.text('Size', colX[2], tableTop, { width: colX[3] - colX[2] - 5, align: 'center' });
    doc.text('Price', colX[3], tableTop, { width: colX[4] - colX[3] - 5, align: 'right' });
    doc.text('Subtotal', colX[4], tableTop, { width: colX[5] - colX[4] - 5, align: 'right' });

    // Header underline
    doc.moveDown(0.2);
    doc.moveTo(colX[0], doc.y).lineTo(colX[5], doc.y).strokeColor('#E1D5F6').lineWidth(1).stroke();
    doc.moveDown(0.3);
    
    // Product rows
    doc.font('Helvetica').fontSize(10).fillColor('#333');
    items.forEach((item, index) => {
      const startY = doc.y;
      
      // 🔧 IMPROVED: Better product name handling with truncation for long names
      const productNameWidth = colX[1] - colX[0] - 10;
      let productName = item.name;
      
      // Truncate very long product names to fit better
      if (productName.length > 50) {
        productName = productName.substring(0, 47) + '...';
      }
      
      const productNameHeight = doc.heightOfString(productName, { width: productNameWidth });
      
      // Draw product name with proper wrapping
      doc.text(productName, colX[0], startY, { 
        width: productNameWidth,
        align: 'left',
        lineGap: 1
      });
      
      // Calculate the actual height used by the product name
      const actualProductHeight = Math.max(12, productNameHeight);
      
      // Position other columns at the top of the row
      doc.text(String(item.quantity), colX[1], startY, { 
        width: colX[2] - colX[1] - 5, 
        align: 'center' 
      });
      doc.text(item.size || '-', colX[2], startY, { 
        width: colX[3] - colX[2] - 5, 
        align: 'center' 
      });
      doc.text(`Rs ${item.price}`, colX[3], startY, { 
        width: colX[4] - colX[3] - 5, 
        align: 'right' 
      });
      doc.text(`Rs ${item.price * item.quantity}`, colX[4], startY, { 
        width: colX[5] - colX[4] - 5,
        align: 'right' 
      });
      
      // Move down based on the actual height of the product name
      doc.y = startY + actualProductHeight + 3; // Reduced spacing for better density
      
      // Add subtle row separator for every other row
      if (index % 2 === 1) {
        doc.moveTo(colX[0], doc.y - 1).lineTo(colX[5], doc.y - 1).strokeColor('#F5F5F5').lineWidth(0.5).stroke();
      }
    });
    
    // Table bottom border
    doc.moveDown(0.5);
    doc.moveTo(colX[0], doc.y).lineTo(colX[5], doc.y).strokeColor('#E1D5F6').lineWidth(1.2).stroke();
    doc.moveDown(0.7);

    // --- ORDER SUMMARY ---
    doc.font('Helvetica-Bold').fontSize(13).fillColor('#473C66').text('Order Summary');
    doc.moveDown(0.5);
    
    // 🔧 FIXED: Use much more of the available width
    const summaryLeft = 100;  // Start much earlier to use more space
    const summaryRight = 480; // End earlier to balance the layout
    
    doc.font('Helvetica').fontSize(11).fillColor('#333');
    
    // Subtotal
    doc.text('Subtotal:', summaryLeft, doc.y, { width: summaryRight - summaryLeft - 5, align: 'right' });
    doc.font('Helvetica-Bold').text(`Rs ${safeSubtotal}`, summaryRight, doc.y, { align: 'right' });
    doc.moveDown(0.3);
    
    // Loungewear offer discount
    if (loungwearOfferDiscount > 0) {
      doc.font('Helvetica').text(`${order.offerDetails?.offerDescription || 'Loungewear Offer (Buy 3 @ Rs 1299)'}:`, summaryLeft, doc.y, { width: summaryRight - summaryLeft - 5, align: 'right' });
      doc.font('Helvetica-Bold').fillColor('#E53E3E').text(`-Rs ${loungwearOfferDiscount}`, summaryRight, doc.y, { align: 'right' });
      doc.fillColor('#333'); // Reset color
      doc.moveDown(0.3);
    }
    
    // Coupon discount
    if (couponDiscount > 0) {
      doc.font('Helvetica').text(`Discount${coupon ? ` (${coupon})` : ''}:`, summaryLeft, doc.y, { width: summaryRight - summaryLeft - 5, align: 'right' });
      doc.font('Helvetica-Bold').fillColor('#E53E3E').text(`-Rs ${couponDiscount}`, summaryRight, doc.y, { align: 'right' });
      doc.fillColor('#333'); // Reset color
      doc.moveDown(0.3);
    }
    
    // Shipping
    doc.font('Helvetica').text('Shipping:', summaryLeft, doc.y, { width: summaryRight - summaryLeft - 5, align: 'right' });
    doc.font('Helvetica-Bold').text(`Rs ${shippingCost}`, summaryRight, doc.y, { align: 'right' });
    doc.moveDown(0.3);
    
    // Total with emphasis
    doc.moveDown(0.2);
    doc.moveTo(summaryLeft - 10, doc.y).lineTo(summaryRight + 10, doc.y).strokeColor('#E1D5F6').lineWidth(1).stroke();
    doc.moveDown(0.3);
    doc.font('Helvetica-Bold').fontSize(12).text('Total:', summaryLeft, doc.y, { width: summaryRight - summaryLeft - 5, align: 'right' });
    doc.font('Helvetica-Bold').fontSize(12).fillColor('#473C66').text(`Rs ${total}`, summaryRight, doc.y, { align: 'right' });
    doc.fillColor('#333'); // Reset color
    doc.moveDown(0.8);
    
    // Order details - PROPERLY ALIGNED
    doc.font('Helvetica').fontSize(10).fillColor('#666');
    doc.text(`Payment Method: `, summaryLeft, doc.y, { width: summaryRight - summaryLeft - 5, align: 'right' });
    doc.font('Helvetica-Bold').text(order.paymentMethod || '-', summaryRight, doc.y, { align: 'right' });
    doc.moveDown(0.2);
    doc.font('Helvetica').text(`Order Status: `, summaryLeft, doc.y, { width: summaryRight - summaryLeft - 5, align: 'right' });
    doc.font('Helvetica-Bold').text(order.status || order.orderStatus || '-', summaryRight, doc.y, { align: 'right' });
    doc.moveDown(0.8);
    
    // Final separator
    doc.moveTo(40, doc.y).lineTo(555, doc.y).strokeColor('#E1D5F6').lineWidth(1.2).stroke();
    doc.moveDown(0.8);

    // --- FOOTER ---
    // Add proper spacing before footer
    doc.moveDown(1.5);
    
    // Add a subtle line above footer
    doc.moveTo(40, doc.y).lineTo(555, doc.y).strokeColor('#E1D5F6').lineWidth(0.5).stroke();
    doc.moveDown(0.5);
    
    // Thank you message with proper spacing - CENTERED with width constraint
    doc.font('Helvetica-Bold').fontSize(12).fillColor('#473C66').text('Thank you for shopping with SHITHAA!', 40, doc.y, { width: 515, align: 'center' });
    doc.moveDown(0.3);
    
    // Contact info with proper spacing - CENTERED with width constraint
    doc.font('Helvetica').fontSize(10).fillColor('#888').text(`${process.env.BASE_URL?.replace('https://', 'www.').replace('http://', 'www.') || 'www.shithaa.in'} | info.shithaa@gmail.com`, 40, doc.y, { width: 515, align: 'center' });
    doc.moveDown(0.5);
    
    // Add final spacing to ensure proper bottom margin
    doc.moveDown(1);
    
    doc.end();

  } catch (error) {
    console.error('Generate Invoice Error:', error);
    res.status(500).json({ message: 'Server error while generating invoice' });
  }
};

// GET /api/orders/user/count - Get order count for authenticated user
export const getUserOrderCount = async (req, res) => {
    try {
        const count = await orderModel.countDocuments({ userId: req.user.id });
        res.json({ success: true, count });
    } catch (error) {
        console.error('Get User Order Count Error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// GET /api/orders/by-email/:email - Fetch all orders for a given email (for account page)
export const getOrdersByEmail = async (req, res) => {
  try {
    const email = req.params.email;
    if (!email) return res.status(400).json({ message: 'Email is required' });
    // Match both legacy email field and new userInfo.email field
    let orders = await orderModel.find({
      $or: [
        { email: { $regex: new RegExp('^' + email + '$', 'i') } },
        { 'userInfo.email': { $regex: new RegExp('^' + email + '$', 'i') } }
      ]
    }).sort({ date: -1 });
    // Patch: always include a top-level status field for frontend compatibility
    orders = orders.map(order => {
      const o = order.toObject();
      o.status = o.status || o.orderStatus || o.paymentStatus || 'PENDING';
      return o;
    });
    res.json({ success: true, orders });
  } catch (error) {
    console.error('getOrdersByEmail error:', error);
    res.status(500).json({ message: 'Server error while fetching orders by email' });
  }
};

// NEW: Function to decrement stock after payment confirmation
export const confirmOrderStock = async (orderId) => {
    try {
        const order = await orderModel.findById(orderId);
        if (!order) {
            throw new Error('Order not found');
        }
        
        // Check if stock is already confirmed
        if (order.stockConfirmed) {
            console.log('Stock already confirmed for order:', order.orderId);
            return { message: 'Stock already confirmed', orderId: order._id };
        }
        
        // Validate order items - check both items and cartItems fields
        const itemsToProcess = order.cartItems && order.cartItems.length > 0 ? order.cartItems : order.items;
        if (!itemsToProcess || itemsToProcess.length === 0) {
            throw new Error('Order has no items to process');
        }
        
        // Decrement stock using atomic operations
        const { confirmStockReservation } = await import('../utils/stock.js');
        const results = [];
        
        for (const item of itemsToProcess) {
            // 🔧 CRITICAL FIX: Handle all possible product ID field names
            let productId = null;
            if (item.productId) {
                productId = item.productId;
            } else if (item._id) {
                productId = item._id;
            } else if (item.id) {
                productId = item.id;
            } else if (item.product) {
                productId = item.product;
            }
            
            if (!productId) {
                console.error('Item missing product ID:', item);
                throw new Error(`Missing product ID for item: ${item.name || 'Unknown'}`);
            }
            
            if (!item.size) {
                console.error('Item missing size:', item);
                throw new Error(`Missing size for item: ${item.name || 'Unknown'}`);
            }
            
            if (!item.quantity || item.quantity <= 0) {
                console.error('Item missing or invalid quantity:', item);
                throw new Error(`Invalid quantity for item: ${item.name || 'Unknown'}`);
            }
            
            console.log('Processing stock confirmation for item:', item.name, 'Product:', productId, 'Size:', item.size, 'Qty:', item.quantity);
            
            const result = await confirmStockReservation(productId, item.size, item.quantity);
            results.push({
                productId,
                size: item.size,
                quantity: item.quantity,
                success: result
            });
        }
        
        console.log('Stock confirmation results for order:', order.orderId, 'Results:', results);
        
        // Update order to mark stock as confirmed
        await orderModel.findByIdAndUpdate(orderId, { 
            stockConfirmed: true,
            stockConfirmedAt: new Date(),
            updatedAt: new Date()
        });
        
        console.log('Order stock confirmation completed successfully for order:', order.orderId);
        
        return {
            success: true,
            message: 'Stock confirmed successfully',
            orderId: order._id,
            results
        };
    } catch (error) {
        console.error('Failed to confirm order stock for order:', orderId, 'Error:', error);
        throw error;
    }
};

export { 
    placeOrder, 
    processCardPayment, 
    allOrders, 
    userOrders, 
    updateStatus, 
    cancelOrder,
    deleteOrder, 
    getAllOrders, 
  updateOrderStatus,
    createStructuredOrder,
    getUniqueOrderId
};