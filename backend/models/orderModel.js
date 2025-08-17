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
        quantity: Number
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
    // Shipping tracking information
    shippingTracking: {
        partner: { type: String, enum: ['DTDC', 'ST Courier', 'XpressBees', 'India Post', 'Delhivery', 'Blue Dart', 'Ecom Express', 'Other'] },
        trackingId: { type: String },
        shippedAt: { type: Date },
        trackingUrl: { type: String }
    },
    // Legacy fields for backward compatibility
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'user' },
    amount: { type: Number },
    date: { type: Date, default: Date.now }
}, { timestamps: true });

// Add explicit unique index for orderId
orderSchema.index({ orderId: 1 }, { unique: true });

const orderModel = mongoose.models.order || mongoose.model('order',orderSchema)
export default orderModel;