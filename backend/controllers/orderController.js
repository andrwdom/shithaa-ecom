import orderModel from "../models/orderModel.js";
import userModel from "../models/userModel.js";
import productModel from "../models/productModel.js";
import { successResponse, errorResponse, paginatedResponse } from '../utils/response.js'
import PDFDocument from "pdfkit";
import { Readable } from "stream";
import Coupon from '../models/Coupon.js';
import mongoose from 'mongoose';
import crypto from 'crypto';

// Conditional Razorpay initialization
let razorpayInstance = null;
try {
    if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
        const Razorpay = (await import('razorpay')).default;
        razorpayInstance = new Razorpay({
            key_id: process.env.RAZORPAY_KEY_ID,
            key_secret: process.env.RAZORPAY_KEY_SECRET
        });
        console.log('Razorpay initialized successfully');
    } else {
        console.log('Razorpay environment variables not found, skipping initialization');
    }
} catch (error) {
    console.log('Razorpay initialization failed:', error.message);
}

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
        const order = await orderModel.findById(req.params.id);
        if (!order) {
            return errorResponse(res, 'Order not found', 404);
        }
        // Check if user owns this order or is admin
        const userId = order.userInfo?.userId || order.userId;
        if (order.isTestOrder !== true) {
            if (!req.user || (userId && userId.toString() !== req.user.id && (!req.user.role || req.user.role !== 'admin'))) {
            return errorResponse(res, 'Access denied', 403);
            }
        }
        successResponse(res, order, 'Order fetched successfully');
    } catch (error) {
        console.error('Get Order By ID Error:', error);
        errorResponse(res, error.message);
    }
};

// PATCH: Always set both top-level email and userInfo.email for all order creation
// Helper to get user email
function getOrderUserEmail(req, fallback) {
  return (req.user && req.user.email) || fallback || '';
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

        if (!customerName || !email || !phone || !address || !items || !totalPrice || !paymentMethod) {
            return res.status(400).json({ message: 'Missing required fields' });
        }

        const userEmail = getOrderUserEmail(req, email);
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
            userId: req.body.userId || (req.user && req.user.id),
            userInfo: { email: userEmail }
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
    const orderDoc = {
      userInfo,
      shippingInfo,
      items: itemsWithIds,
      couponUsed: couponUsed || null,
      totalAmount,
      status: 'Pending',
      orderStatus: 'Pending',
      paymentStatus: paymentStatus === 'paid' ? 'paid' : 'pending',
      createdAt: createdAt ? new Date(createdAt) : new Date(),
      email: userEmail,
      userId: userInfo.userId || undefined,
    };
    const order = await orderModel.create(orderDoc);
    res.status(201).json({ success: true, order });
  } catch (err) {
    console.error('Create Structured Order Error:', err);
    res.status(500).json({ message: 'Server error while creating order' });
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
      userInfo: { email: userEmail }
    };
    const order = await orderModel.create(orderData);
    res.status(201).json({ success: true, order });
  } catch (err) {
    console.error('Place Order Error:', err);
    res.status(500).json({ message: 'Server error while placing order' });
  }
};

// PATCH placeOrderStripe
const placeOrderStripe = async (req,res) => {
    try {
        const { userId, items, amount, address} = req.body
        const { origin } = req.headers;
        await updateProductStock(items);
        const userEmail = getOrderUserEmail(req, req.body.email);
        const orderData = {
            userId,
            items,
            address,
            amount,
            paymentMethod:"Stripe",
            payment:false,
            date: Date.now(),
            email: userEmail,
            userInfo: { email: userEmail }
        }

        const newOrder = new orderModel(orderData)
        await newOrder.save()

        const line_items = items.map((item) => ({
            price_data: {
                currency:currency,
                product_data: {
                    name:item.name
                },
                unit_amount: item.price * 100
            },
            quantity: item.quantity
        }))

        line_items.push({
            price_data: {
                currency:currency,
                product_data: {
                    name:'Delivery Charges'
                },
                unit_amount: deliveryCharge * 100
            },
            quantity: 1
        })

        const session = await stripe.checkout.sessions.create({
            success_url: `${origin}/verify?success=true&orderId=${newOrder._id}`,
            cancel_url:  `${origin}/verify?success=false&orderId=${newOrder._id}`,
            line_items,
            mode: 'payment',
        })

        res.json({success:true,session_url:session.url});

    } catch (error) {
        console.log(error)
        res.json({success:false,message:error.message})
    }
}

// Verify Stripe 
const verifyStripe = async (req,res) => {
    const { orderId, success, userId } = req.body

    try {
        if (success === "true") {
            await orderModel.findByIdAndUpdate(orderId, {payment:true});
            await userModel.findByIdAndUpdate(userId, {cartData: {}})
            res.json({success: true});
        } else {
            // If payment failed, restore stock
            const order = await orderModel.findById(orderId);
            if (order) {
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
                await orderModel.findByIdAndDelete(orderId);
            }
            res.json({success:false})
        }
        
    } catch (error) {
        console.log(error)
        res.json({success:false,message:error.message})
    }
}

// PATCH placeOrderRazorpay
const placeOrderRazorpay = async (req,res) => {
    try {
        if (!razorpayInstance) {
            return res.status(400).json({
                success: false,
                message: 'Razorpay is not configured. Please contact support.'
            });
        }

        const { userId, items, amount, address} = req.body
        await updateProductStock(items);
        const userEmail = getOrderUserEmail(req, req.body.email);
        const orderData = {
            userId,
            items,
            address,
            amount,
            paymentMethod:"Razorpay",
            payment:false,
            date: Date.now(),
            email: userEmail,
            userInfo: { email: userEmail }
        }

        const newOrder = new orderModel(orderData)
        await newOrder.save()

        const options = {
            amount: amount * 100,
            currency: currency.toUpperCase(),
            receipt : newOrder._id.toString()
        }

        await razorpayInstance.orders.create(options, (error,order)=>{
            if (error) {
                console.log(error)
                return res.json({success:false, message: error})
            }
            res.json({success:true,order})
        })

    } catch (error) {
        console.log(error)
        res.json({success:false,message:error.message})
    }
}

// Verify Razorpay
const verifyRazorpay = async (req,res) => {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, orderId, userId } = req.body

    try {
        const sign = razorpay_order_id + "|" + razorpay_payment_id;
        const expectedSign = crypto.createHmac("sha256", process.env.RAZORPAY_KEY_SECRET).update(sign.toString()).digest("hex");

        if (razorpay_signature === expectedSign) {
            await orderModel.findByIdAndUpdate(orderId, {payment:true});
            await userModel.findByIdAndUpdate(userId, {cartData: {}})
            res.json({success: true});
        } else {
            // If payment failed, restore stock
            const order = await orderModel.findById(orderId);
            if (order) {
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
                await orderModel.findByIdAndDelete(orderId);
            }
            res.json({success:false})
        }
        
    } catch (error) {
        console.log(error)
        res.json({success:false,message:error.message})
    }
}

// PATCH processCardPayment
const processCardPayment = async (req, res) => {
    try {
        const { userId, items, amount, address, cardDetails, email } = req.body;
        if (!cardDetails) {
            return res.json({ success: false, message: "Card details are required" });
        }
        await updateProductStock(items);
        const userEmail = getOrderUserEmail(req, email);
        const orderData = {
            userId,
            items,
            address,
            amount,
            paymentMethod: "Card",
            payment: true, // Assuming card payment is immediate
            date: Date.now(),
            email: userEmail,
            userInfo: { email: userEmail }
        };
        const newOrder = new orderModel(orderData);
        await newOrder.save();
        await userModel.findByIdAndUpdate(userId, { cartData: {} });
        res.json({ success: true, message: "Order placed successfully", orderId: newOrder._id });
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
        console.log('Orders fetched:', orders.length);
        res.status(200).json({ success: true, orders });
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
    doc.font('Helvetica').fontSize(10).fillColor('#888').text('www.shithaa.in | Info.shitha@gmail.com', { align: 'center' });
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
    placeOrderStripe, 
    placeOrderRazorpay, 
    allOrders, 
    userOrders, 
    updateStatus, 
    verifyStripe, 
    verifyRazorpay, 
    processCardPayment, 
    cancelOrder, 
    getAllOrders, 
  updateOrderStatus,
    generateInvoice,
    createStructuredOrder
};