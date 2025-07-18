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
              const objectId = require('mongoose').Types.ObjectId(userId);
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
        console.log('getUserOrders FULL DEBUG:');
        console.log('req.user:', req.user);
        console.log('orQuery:', JSON.stringify(orQuery, null, 2));
        const orders = await orderModel.find({ $or: orQuery })
            .sort({ date: -1 })
            .skip(skip)
            .limit(Number(limit));
        console.log('Orders found:', orders.length);
        orders.forEach((order, idx) => {
          console.log(`Order[${idx}]: _id=${order._id}, userId=${order.userId}, email=${order.email}, isTestOrder=${order.isTestOrder}`);
        });
        const total = await orderModel.countDocuments({ $or: orQuery });
        const totalPages = Math.ceil(total / limit);
        paginatedResponse(res, orders, total, page, totalPages, 'Orders fetched successfully');
    } catch (error) {
        console.error('Get User Orders Error:', error);
        errorResponse(res, error.message);
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
            return errorResponse(res, 'Order not found', 404);
        }
        // Allow access to test orders for debugging
        if (order.isTestOrder === true) {
            // Always include shippingAddress in response
            return successResponse(res, { ...order.toObject(), shippingAddress: order.shippingAddress || null }, 'Order fetched successfully (test order, debug mode)');
        }
        // Check if user owns this order or is admin
        const userId = order.userInfo?.userId || order.userId;
        if (!req.user || (userId && userId.toString() !== req.user.id && (!req.user.role || req.user.role !== 'admin'))) {
            return errorResponse(res, 'Access denied', 403);
        }
        // Always include shippingAddress in response
        successResponse(res, { ...order.toObject(), shippingAddress: order.shippingAddress || null }, 'Order fetched successfully');
    } catch (error) {
        console.error('Get Order By ID Error:', error);
        errorResponse(res, error.message);
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
        console.log('Order Body:', req.body); // TEMP LOG FOR TESTING
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
            status: 'Pending',
            isTestOrder: isTestOrder || false,
            userId: req.body.userId || (req.user && req.user.id),
            userInfo: { email: userEmail },
            orderId
        };
        const order = await orderModel.create(orderData);
        res.status(201).json({ success: true, order });
    } catch (err) {
        console.error('Create Order Error:', err);
        res.status(500).json({ message: 'Server error while creating order' });
    }
};

// PATCH createStructuredOrder
const createStructuredOrder = async (req, res) => {
  try {
    let { userInfo, shippingInfo, items, couponUsed, totalAmount, paymentStatus, createdAt } = req.body;
    if (!userInfo || !shippingInfo || !items || !Array.isArray(items) || items.length === 0 || !totalAmount) {
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
    for (const field of requiredShippingFields) {
      if (!shippingInfo[field]) {
        return res.status(400).json({ message: `Missing required shipping field: ${field}` });
      }
    }
    
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
    
    // Extra validation and logging for items
    for (const item of itemsWithIds) {
      if (!item._id) {
        console.error('Order item missing _id:', item);
        return res.status(400).json({ message: `Order item missing _id: ${JSON.stringify(item)}` });
      }
      const product = await productModel.findById(item._id);
      if (!product) {
        console.error(`Product not found for _id: ${item._id}`);
        return res.status(400).json({ message: `Product not found for _id: ${item._id}` });
      }
      const sizeObj = product.sizes.find(s => s.size === item.size);
      if (!sizeObj) {
        console.error(`Size ${item.size} not found for product ${product.name}`);
        return res.status(400).json({ message: `Size ${item.size} not found for product ${product.name}` });
      }
      if (sizeObj.stock < item.quantity) {
        console.error(`Insufficient stock for ${product.name} in size ${item.size}. Only ${sizeObj.stock} available.`);
        return res.status(400).json({ message: `Insufficient stock for ${product.name} in size ${item.size}. Only ${sizeObj.stock} available.` });
      }
    }
    const orderId = await getUniqueOrderId();
    const orderDoc = {
      userInfo,
      shippingInfo: validatedShippingInfo,
      items: itemsWithIds,
      couponUsed: couponUsed || null,
      totalAmount,
      status: 'Pending',
      orderStatus: 'Pending',
      paymentStatus: paymentStatus === 'paid' ? 'paid' : 'pending',
      createdAt: createdAt ? new Date(createdAt) : new Date(),
      email: userEmail,
      userId: userInfo.userId || undefined,
      orderId
    };
    const order = await orderModel.create(orderDoc);
    res.status(201).json({ success: true, order });
  } catch (err) {
    console.error('Create Structured Order Error (detailed):', err);
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
        // Log before and after
        console.log(`Stock before: ${product.sizes[sizeIndex].stock}`);
        product.sizes[sizeIndex].stock -= item.quantity;
        console.log(`Stock after: ${product.sizes[sizeIndex].stock}`);
        await product.save();
        // Fetch again to confirm
        const updated = await productModel.findById(product._id);
        console.log(`Stock in DB after save: ${updated.sizes[sizeIndex].stock}`);
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
    await updateProductStock(items);
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
      status: 'Pending',
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
        await updateProductStock(items);
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
const updateStatus = async (req,res) => {
    try {
        const { orderId, status, cancelledBy } = req.body;

        if (!orderId || !status) {
            return res.json({ success: false, message: "Order ID and status are required" });
        }

        const order = await orderModel.findById(orderId);
        if (!order) {
            return res.json({ success: false, message: "Order not found" });
        }

        const updateData = { status };
        // Also update orderStatus for new structured orders
        updateData.orderStatus = status;
        // Optionally update paymentStatus if delivered
        if (status === 'Delivered') updateData.paymentStatus = 'paid';

        // If cancelling, add cancellation details
        if (status === 'Cancelled' && cancelledBy) {
            updateData.cancelledBy = {
                name: cancelledBy.name,
                userId: cancelledBy.userId,
                timestamp: new Date()
            };

            // Restore product stock if order is cancelled
            for (const item of order.items) {
                const product = await productModel.findById(item._id);
                if (product) {
                    const sizeIndex = product.sizes.findIndex(s => s.size === item.size);
                    if (sizeIndex !== -1) {
                        product.sizes[sizeIndex].stock += item.quantity;
                        await product.save();
                    }
                }
            }
        }

        await orderModel.findByIdAndUpdate(orderId, updateData);
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

        // Restore product stock
        for (const item of order.items) {
            const product = await productModel.findById(item._id);
            if (product) {
                const sizeIndex = product.sizes.findIndex(s => s.size === item.size);
                if (sizeIndex !== -1) {
                    product.sizes[sizeIndex].stock += item.quantity;
                    await product.save();
                }
            }
        }

        res.json({ success: true, message: "Order cancelled successfully" });

    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message });
    }
};

// Get all orders (Admin)
const getAllOrders = async (req, res) => {
    try {
        const orders = await orderModel.find().sort({ createdAt: -1 });
        // Always include shippingAddress in each order
        const ordersWithShipping = orders.map(order => ({ ...order.toObject(), shippingAddress: order.shippingAddress || null }));
        console.log('Orders fetched:', ordersWithShipping.length);
        res.status(200).json({ success: true, orders: ordersWithShipping });
    } catch (err) {
        console.error('Get Orders Error:', err);
        res.status(500).json({ message: 'Server error while fetching orders' });
    }
};

// Update order status (Admin)
const updateOrderStatus = async (req, res) => {
  try {
    const { orderId, status } = req.body;
    if (!orderId || !status) {
      return res.status(400).json({ message: 'Missing orderId or status' });
    }
    const order = await orderModel.findByIdAndUpdate(orderId, { status }, { new: true });
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }
    res.status(200).json({ success: true, order });
  } catch (err) {
    console.error('Update Order Status Error:', err);
    res.status(500).json({ message: 'Server error while updating order status' });
  }
};

const generateInvoice = async (req, res) => {
  try {
    const { orderId } = req.params;
    const order = await orderModel.findById(orderId);
    if (!order) return res.status(404).json({ message: "Order not found" });

    // Access control: only owner or admin, or allow if test order
    if (!order.isTestOrder) {
    const user = req.user;
    const isAdmin = user && user.role === "admin";
    const isOwner = user && (order.email === user.email);
    if (!isAdmin && !isOwner) {
      return res.status(403).json({ message: "Unauthorized to access this invoice" });
    }
    }

    // Use new structured fields if present
    const shipping = order.shippingInfo || order.address;
    const billing = order.billingInfo;
    const items = order.cartItems?.length ? order.cartItems : order.items;
    const subtotal = order.subtotal || order.totalPrice;
    const discount = order.discount?.value || 0;
    const discountType = order.discount?.type;
    const coupon = order.discount?.appliedCouponCode;
    const shippingCost = order.shippingCost || 0;
    const total = order.total || order.totalPrice;

    // PDF generation
    const doc = new PDFDocument({ size: "A4", margin: 40 });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename=Invoice_${order._id}.pdf`);
    doc.pipe(res);

    // --- HEADER ---
    doc.font('Helvetica-Bold').fontSize(30).fillColor('#473C66').text('Shitha', { align: 'center' });
    doc.moveDown(0.1);
    doc.font('Helvetica').fontSize(13).fillColor('#B39DDB').text('Elegance for Every Mother', { align: 'center' });
    doc.moveDown(0.5);
    if (order.isTestOrder) {
      doc.font('Helvetica-Bold').fontSize(14).fillColor('#1976D2').text('TEST ORDER', { align: 'center' });
      doc.moveDown(0.5);
    }
    doc.moveTo(40, doc.y).lineTo(555, doc.y).strokeColor('#E1D5F6').lineWidth(1.2).stroke();
    doc.moveDown(0.7);
    doc.font('Helvetica-Bold').fontSize(11).fillColor('#333').text(`Order ID: `, { continued: true }).font('Helvetica').text(order._id);
    doc.font('Helvetica-Bold').text(`Order Date: `, { continued: true }).font('Helvetica').text(new Date(order.createdAt).toLocaleDateString('en-IN'));
    doc.moveDown(0.7);
    doc.moveTo(40, doc.y).lineTo(555, doc.y).strokeColor('#E1D5F6').lineWidth(1.2).stroke();
    doc.moveDown(0.7);

    // --- CUSTOMER INFO ---
    doc.font('Helvetica-Bold').fontSize(13).fillColor('#473C66').text('Customer Information');
    doc.moveDown(0.2);
    doc.font('Helvetica').fontSize(11).fillColor('#333');
    doc.text(`Name: `, { continued: true }).font('Helvetica-Bold').text(shipping?.fullName || order.customerName);
    doc.font('Helvetica').text(`Email: `, { continued: true }).font('Helvetica-Bold').text(shipping?.email || order.email);
    doc.font('Helvetica').text(`Phone: `, { continued: true }).font('Helvetica-Bold').text(shipping?.phone || order.phone);
    doc.font('Helvetica').text(`Address: `, { continued: true }).font('Helvetica-Bold').text([
      shipping?.addressLine1 || shipping?.line1,
      shipping?.addressLine2 || shipping?.line2,
      shipping?.city,
      shipping?.state,
      shipping?.zip || shipping?.pincode,
      shipping?.country
    ].filter(Boolean).join(', '));
    if (billing) {
      doc.moveDown(0.2);
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
    doc.moveDown(0.3);
    const tableTop = doc.y;
    const colX = [40, 220, 270, 340, 410];
    doc.font('Helvetica-Bold').fontSize(11).fillColor('#333');
    doc.text('Product', colX[0], tableTop, { width: colX[1] - colX[0] - 5 });
    doc.text('Qty', colX[1], tableTop, { width: colX[2] - colX[1] - 5, align: 'center' });
    doc.text('Size', colX[2], tableTop, { width: colX[3] - colX[2] - 5, align: 'center' });
    doc.text('Price (INR)', colX[3], tableTop, { width: colX[4] - colX[3] - 5, align: 'right' });
    doc.text('Subtotal (INR)', colX[4], tableTop, { align: 'right' });
    doc.moveDown(0.2);
    doc.moveTo(colX[0], doc.y).lineTo(555, doc.y).strokeColor('#E1D5F6').lineWidth(1).stroke();
    doc.moveDown(0.2);
    doc.font('Helvetica').fontSize(11).fillColor('#333');
    items.forEach(item => {
      const y = doc.y;
      doc.text(item.name, colX[0], y, { width: colX[1] - colX[0] - 5 });
      doc.text(String(item.quantity), colX[1], y, { width: colX[2] - colX[1] - 5, align: 'center' });
      doc.text(item.size || '-', colX[2], y, { width: colX[3] - colX[2] - 5, align: 'center' });
      doc.text(`INR ${item.price}`, colX[3], y, { width: colX[4] - colX[3] - 5, align: 'right' });
      doc.text(`INR ${item.price * item.quantity}`, colX[4], y, { align: 'right' });
      doc.moveDown(0.2);
    });
    doc.moveDown(1);
    doc.moveTo(40, doc.y).lineTo(555, doc.y).strokeColor('#E1D5F6').lineWidth(1.2).stroke();
    doc.moveDown(0.7);

    // --- ORDER SUMMARY ---
    doc.font('Helvetica-Bold').fontSize(13).fillColor('#473C66').text('Order Summary');
    doc.moveDown(0.3);
    doc.font('Helvetica').fontSize(11).fillColor('#333');
    doc.text(`Subtotal: `, { continued: true }).font('Helvetica-Bold').text(`INR ${subtotal}`);
    if (discount && discount > 0) {
      doc.font('Helvetica').text(`Discount: `, { continued: true }).font('Helvetica-Bold').text(`-INR ${Math.round((subtotal * discount) / 100)} (${discountType === 'percentage' ? discount + '%' : ''}${coupon ? ', Coupon: ' + coupon : ''})`);
    }
    doc.font('Helvetica').text(`Shipping: `, { continued: true }).font('Helvetica-Bold').text(`INR ${shippingCost}`);
    doc.font('Helvetica').text(`Total: `, { continued: true }).font('Helvetica-Bold').text(`INR ${total}`);
    doc.font('Helvetica').text(`Payment Method: `, { continued: true }).font('Helvetica-Bold').text(order.paymentMethod);
    doc.font('Helvetica').text(`Order Status: `, { continued: true }).font('Helvetica-Bold').text(order.status || order.orderStatus);
    doc.moveDown(1);
    doc.moveTo(40, doc.y).lineTo(555, doc.y).strokeColor('#E1D5F6').lineWidth(1.2).stroke();
    doc.moveDown(1);

    // --- FOOTER ---
    doc.font('Helvetica-Bold').fontSize(11).fillColor('#473C66').text('Thank you for shopping with Shitha Clothings!', { align: 'center' });
    doc.font('Helvetica').fontSize(10).fillColor('#888').text(`${process.env.BASE_URL?.replace('https://', 'www.').replace('http://', 'www.') || 'www.shithaa.in'} | Info.shitha@gmail.com`, { align: 'center' });
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
      o.status = o.status || o.orderStatus || o.paymentStatus || 'Pending';
      return o;
    });
    res.json({ success: true, orders });
  } catch (error) {
    console.error('getOrdersByEmail error:', error);
    res.status(500).json({ message: 'Server error while fetching orders by email' });
  }
};

export { 
    placeOrder, 
    processCardPayment, 
    allOrders, 
    userOrders, 
    updateStatus, 
    cancelOrder, 
    getAllOrders, 
  updateOrderStatus,
    generateInvoice,
    createStructuredOrder
};