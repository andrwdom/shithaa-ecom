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
    orderId: { type: String, unique: true, required: true },
    // Payment gateway fields
    phonepeTransactionId: { type: String },
    // Legacy payment field
    payment: { type: Boolean, default: false },
    // Legacy fields for backward compatibility
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'user' },
    amount: { type: Number },
    date: { type: Date, default: Date.now }
}, { timestamps: true });

const orderModel = mongoose.models.order || mongoose.model('order',orderSchema)
export default orderModel;