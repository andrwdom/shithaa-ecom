import mongoose from 'mongoose'

const paymentSessionSchema = new mongoose.Schema({
  // Unique session identifier
  sessionId: { 
    type: String, 
    required: true
  },
  
  // PhonePe transaction identifier
  phonepeTransactionId: { 
    type: String, 
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
  
  // Order details (stored temporarily)
  orderData: {
    amount: { type: Number, required: true },
    shipping: {
      fullName: { type: String, required: true },
      email: { type: String, required: true },
      phone: { type: String, required: true },
      addressLine1: { type: String, required: true },
      addressLine2: { type: String },
      city: { type: String, required: true },
      state: { type: String, required: true },
      postalCode: { type: String, required: true },
      country: { type: String, default: 'India' }
    },
    cartItems: [{
      _id: { type: mongoose.Schema.Types.ObjectId, required: true },
      name: { type: String, required: true },
      quantity: { type: Number, required: true },
      price: { type: Number, required: true },
      image: { type: String },
      size: { type: String, required: true }
    }]
  },
  
  // Complete order payload for order creation (stored temporarily)
  orderPayload: { type: mongoose.Schema.Types.Mixed },
  
  // Order ID reference (set after order creation)
  orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'order' },
  
  // Payment status
  status: { 
    type: String, 
    enum: ['pending', 'success', 'failed', 'cancelled'], 
    default: 'pending' 
  },
  
  // PhonePe response data
  phonepeResponse: {
    redirectUrl: String,
    merchantOrderId: String,
    responseCode: String,
    responseMessage: String
  },
  
  // Stock reservation tracking
  stockReserved: { 
    type: Boolean, 
    default: false 
  },
  
  // Timestamps
  createdAt: { 
    type: Date, 
    default: Date.now, 
    expires: 1800 // Auto-delete after 30 minutes
  },
  updatedAt: { 
    type: Date, 
    default: Date.now 
  },
  
  // Additional metadata
  metadata: {
    userAgent: String,
    ipAddress: String,
    checkoutSource: String // 'cart' or 'buy-now'
  }
})

// Update timestamp on save
paymentSessionSchema.pre('save', function(next) {
  this.updatedAt = new Date()
  next()
})

// Index for quick lookups
paymentSessionSchema.index({ phonepeTransactionId: 1 })
paymentSessionSchema.index({ sessionId: 1 })
paymentSessionSchema.index({ status: 1 })
// createdAt already has TTL index with expires: 1800

const PaymentSession = mongoose.model('PaymentSession', paymentSessionSchema)

export default PaymentSession 