import mongoose from 'mongoose'

const orderSchema = new mongoose.Schema({
    // Legacy fields
    customerName: { type: String }, // legacy
    email: { type: String }, // legacy
    phone: { type: String }, // legacy
    address: {
        line1: { type: String },
        line2: { type: String },
        city: { type: String },
        state: { type: String },
        pincode: { type: String }
    },
    // --- Add new shippingAddress field for modern orders ---
    shippingAddress: {
        flatHouseNo: { type: String },
        areaLocality: { type: String },
        streetAddress: { type: String },
        landmark: { type: String },
        city: { type: String },
        state: { type: String },
        pincode: { type: String },
        country: { type: String },
        fullName: { type: String },
        email: { type: String },
        phone: { type: String }
    },
    items: [{
        name: String,
        quantity: Number,
        price: Number,
        image: String,
        size: String
    }],
    totalPrice: { type: Number },
    paymentMethod: { type: String },
    status: { type: String, default: 'Pending' },
    // New structured fields
    userInfo: {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'user' },
        name: String,
        email: String
    },
    // Updated shippingInfo with all required fields
    shippingInfo: {
        fullName: { type: String, required: true },
        email: { type: String, required: true },
        phone: { type: String, required: true },
        addressLine1: { type: String, required: true },
        addressLine2: { type: String },
        city: { type: String, required: true },
        state: { type: String, required: true },
        postalCode: { type: String, required: true },
        country: { type: String, required: true, default: 'India' }
    },
    billingInfo: {
        fullName: String,
        email: String,
        phone: String,
        addressLine1: String,
        addressLine2: String,
        city: String,
        state: String,
        zip: String,
        country: String
    },
    cartItems: [{
        productId: mongoose.Schema.Types.ObjectId,
        name: String,
        price: Number,
        quantity: Number,
        size: String
    }],
    subtotal: Number,
    discount: {
        type: { type: String }, // e.g. 'percentage'
        value: Number,
        appliedCouponCode: String
    },
    shippingCost: Number,
    total: Number,
    paymentStatus: { type: String, default: 'pending' },
    orderStatus: { type: String, default: 'pending' },
    placedAt: { type: Date, default: Date.now },
    isTestOrder: { type: Boolean, default: false },
    orderId: { type: String, required: true },
    // Payment gateway fields
    phonepeTransactionId: { type: String },
    // Link to CheckoutSession snapshot to enforce single source of truth
    checkoutSessionId: { type: String, unique: true, sparse: true },
    // Flow source for analytics and isolation guarantees
    source: { type: String, enum: ['cart', 'buynow'] },
    // Snapshot versioning for future evolutions
    itemsSnapshotVersion: { type: Number, default: 1 },
    // Refund tracking for PhonePe
    refunds: [{
        merchantRefundId: { type: String, required: true },
        amount: { type: Number, required: true }, // in paise
        state: { type: String, enum: ['PENDING', 'CONFIRMED', 'COMPLETED', 'FAILED'], default: 'PENDING' },
        log: { type: Object }, // raw response/log
        createdAt: { type: Date, default: Date.now },
        updatedAt: { type: Date, default: Date.now }
    }],
    // Legacy payment field
    payment: { type: Boolean, default: false },
    
    // Stock management fields
    stockConfirmed: { type: Boolean, default: false },
    stockConfirmedAt: { type: Date },
    
    // Shipping tracking information
    shippingTracking: {
        trackingNumber: String,
        carrier: String,
        status: String,
        estimatedDelivery: Date,
        actualDelivery: Date
    },
    // Legacy fields for backward compatibility
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'user' },
    amount: { type: Number },
    date: { type: Date, default: Date.now }
}, { timestamps: true });

// Add explicit unique index for orderId
orderSchema.index({ orderId: 1 }, { unique: true });

// 🔧 PRODUCTION OPTIMIZED: Comprehensive indexes for high-traffic e-commerce
// Basic indexes
orderSchema.index({ userId: 1 }); // For user-specific order queries
orderSchema.index({ 'userInfo.userId': 1 }); // For new user structure
orderSchema.index({ 'userInfo.email': 1 }); // For email-based queries
orderSchema.index({ orderStatus: 1 }); // For status-based queries
orderSchema.index({ paymentStatus: 1 }); // For payment status queries
orderSchema.index({ placedAt: -1 }); // For date-based sorting
orderSchema.index({ phonepeTransactionId: 1 }); // For payment lookups
orderSchema.index({ createdAt: -1 }); // For creation date queries

// Compound indexes for complex queries (CRITICAL for performance)
orderSchema.index({ userId: 1, orderStatus: 1 }); // User orders by status
orderSchema.index({ userId: 1, placedAt: -1 }); // User orders by date
orderSchema.index({ orderStatus: 1, placedAt: -1 }); // Orders by status and date
orderSchema.index({ paymentStatus: 1, placedAt: -1 }); // Payment status and date
orderSchema.index({ 'userInfo.email': 1, placedAt: -1 }); // Email and date
orderSchema.index({ source: 1, placedAt: -1 }); // Source and date for analytics
orderSchema.index({ isTestOrder: 1, placedAt: -1 }); // Test orders filtering

// Admin and analytics indexes
orderSchema.index({ total: 1, placedAt: -1 }); // Revenue analysis
orderSchema.index({ 'shippingInfo.state': 1, placedAt: -1 }); // Geographic analysis
orderSchema.index({ stockConfirmed: 1, orderStatus: 1 }); // Stock management

// Note: checkoutSessionId index already exists via unique: true in schema

const orderModel = mongoose.models.order || mongoose.model('order',orderSchema)
export default orderModel;