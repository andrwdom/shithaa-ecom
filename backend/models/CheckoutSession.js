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
    enum: ['cart', 'buynow', 'buy-now'], // Support both formats
    required: true,
    set: function(val) {
      // Normalize to 'buynow' internally
      return val === 'buy-now' ? 'buynow' : val;
    }
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
  // Offer information for invoice generation
  offerDetails: {
    offerApplied: { type: Boolean, default: false },
    offerType: { type: String }, // e.g., 'loungewear_buy3_1299'
    offerDiscount: { type: Number, default: 0 },
    offerDescription: { type: String }, // e.g., "Buy 3 @ ₹1299"
    offerCalculation: {
      completeSets: { type: Number, default: 0 },
      remainingItems: { type: Number, default: 0 },
      originalPrice: { type: Number, default: 0 },
      offerPrice: { type: Number, default: 0 },
      savings: { type: Number, default: 0 }
    }
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
    // 🔧 CRITICAL FIX: Remove TTL index to prevent automatic deletion
    // We need to control when sessions are deleted to ensure stock is released first
    index: true // Simple index for queries, but no TTL
  },
  timeoutAt: {
    type: Date,
    required: true,
    // 🔧 CRITICAL FIX: This is when we'll force-release stock if no response
    default: function() {
      return new Date(Date.now() + 5 * 60 * 1000); // 🚨 CRITICAL MITIGATION: Reduced from 15 to 5 minutes total timeout
    }
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
checkoutSessionSchema.index({ sessionId: 1 }, { unique: true }); // sessionId is not unique in schema
checkoutSessionSchema.index({ phonepeTransactionId: 1 });
checkoutSessionSchema.index({ userId: 1 });
checkoutSessionSchema.index({ status: 1 });
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
checkoutSessionSchema.methods.extend = function(minutes = 5) {
  this.expiresAt = new Date(Date.now() + minutes * 60 * 1000);
  return this.save();
};

// Static method to clean expired sessions and release stock
checkoutSessionSchema.statics.cleanExpired = async function() {
  // Find expired sessions that have reserved stock
  const expiredSessions = await this.find({
    expiresAt: { $lt: new Date() },
    stockReserved: true
  });
  
  console.log(`Found ${expiredSessions.length} expired sessions with reserved stock`);
  
  // Release stock for each expired session
  for (const session of expiredSessions) {
    try {
      // Import stock utilities
      const { releaseStockReservation } = await import('../utils/stock.js');
      
      // Release stock for all items in the session
      const releasePromises = session.items.map(item =>
        releaseStockReservation(item.productId, item.size, item.quantity).catch(error => {
          console.error(`Failed to release stock for product ${item.productId} size ${item.size}:`, error);
        })
      );
      
      await Promise.all(releasePromises);
      
      // Mark session as expired
      session.status = 'expired';
      session.stockReserved = false;
      await session.save();
      
      console.log(`Released stock for expired session: ${session.sessionId}`);
    } catch (error) {
      console.error(`Error processing expired session ${session.sessionId}:`, error);
    }
  }
  
  // Delete all expired sessions (including those without stock)
  const result = await this.deleteMany({
    expiresAt: { $lt: new Date() }
  });
  
  console.log(`Cleaned ${result.deletedCount} expired checkout sessions`);
  return result;
};

const CheckoutSession = mongoose.model('CheckoutSession', checkoutSessionSchema);

export default CheckoutSession;
