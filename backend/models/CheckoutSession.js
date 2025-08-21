import mongoose from 'mongoose';

const checkoutSessionSchema = new mongoose.Schema({
  // Unique session identifier
  sessionId: { 
    type: String, 
    required: true
  },
  
  // Source of checkout (cart or buy-now)
  source: { 
    type: String, 
    enum: ['cart', 'buynow'], 
    required: true 
  },
  
  // User information
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'user' 
  },
  userEmail: { 
    type: String, 
    required: true 
  },
  
  // Guest token for non-authenticated users
  guestToken: { 
    type: String 
  },
  
  // Checkout items with authoritative data from server
  items: [{
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'product', required: true },
    variantId: { type: String }, // Size in this case
    name: { type: String, required: true },
    price: { type: Number, required: true }, // Server-verified price
    quantity: { type: Number, required: true, min: 1 },
    size: { type: String, required: true },
    image: { type: String },
    categorySlug: { type: String },
    category: { type: String }
  }],
  
  // Pricing information
  subtotal: { type: Number, required: true },
  discount: {
    type: { type: String }, // 'percentage' or 'fixed'
    value: { type: Number },
    appliedCouponCode: { type: String }
  },
  shippingCost: { type: Number, default: 0 },
  total: { type: Number, required: true },
  currency: { type: String, default: 'INR' },
  
  // Session status
  status: { 
    type: String, 
    enum: ['pending', 'awaiting_payment', 'paid', 'failed', 'expired', 'cancelled'], 
    default: 'pending' 
  },
  
  // Payment information
  paymentMethod: { type: String, default: 'PhonePe' },
  phonepeTransactionId: { type: String },
  
  // Stock reservation tracking
  stockReserved: { 
    type: Boolean, 
    default: false 
  },
  
  // Expiration and timestamps
  expiresAt: { 
    type: Date, 
    required: true,
    index: { expireAfterSeconds: 0 } // TTL index
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  },
  updatedAt: { 
    type: Date, 
    default: Date.now 
  },
  
  // Metadata for debugging and analytics
  metadata: {
    userAgent: String,
    ipAddress: String,
    correlationId: String, // For request tracing
    checkoutFlow: String // Additional flow information
  }
});

// Update timestamp on save
checkoutSessionSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Indexes for performance
checkoutSessionSchema.index({ sessionId: 1 }, { unique: true });
checkoutSessionSchema.index({ phonepeTransactionId: 1 });
checkoutSessionSchema.index({ userId: 1 });
checkoutSessionSchema.index({ status: 1 });
// expiresAt already has TTL index defined in schema
// createdAt doesn't need additional indexing

// Virtual for session age
checkoutSessionSchema.virtual('ageInMinutes').get(function() {
  return Math.floor((Date.now() - this.createdAt.getTime()) / (1000 * 60));
});

// Method to check if session is expired
checkoutSessionSchema.methods.isExpired = function() {
  return new Date() > this.expiresAt;
};

// Method to extend session
checkoutSessionSchema.methods.extend = function(minutes = 15) {
  this.expiresAt = new Date(Date.now() + minutes * 60 * 1000);
  return this.save();
};

// Static method to clean expired sessions
checkoutSessionSchema.statics.cleanExpired = async function() {
  const result = await this.deleteMany({
    expiresAt: { $lt: new Date() }
  });
  console.log(`Cleaned ${result.deletedCount} expired checkout sessions`);
  return result;
};

const CheckoutSession = mongoose.model('CheckoutSession', checkoutSessionSchema);

export default CheckoutSession;
