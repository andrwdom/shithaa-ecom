import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema({
  // Unique payment identifier from PhonePe
  paymentId: { 
    type: String, 
    required: true
  },
  
  // Order reference
  orderId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'order', 
    required: true 
  },
  
  // Checkout session reference
  checkoutSessionId: { 
    type: String, 
    required: true 
  },
  
  // Payment provider information
  provider: { 
    type: String, 
    default: 'PhonePe' 
  },
  
  // Payment details
  amount: { 
    type: Number, 
    required: true 
  },
  currency: { 
    type: String, 
    default: 'INR' 
  },
  
  // Payment status
  status: { 
    type: String, 
    enum: ['pending', 'processing', 'completed', 'failed', 'cancelled', 'refunded'], 
    default: 'pending' 
  },
  
  // PhonePe specific fields
  phonepeTransactionId: { type: String },
  phonepeOrderId: { type: String },
  phonepeResponseCode: { type: String },
  phonepeResponseMessage: { type: String },
  
  // Raw response from payment provider
  rawPayload: { type: mongoose.Schema.Types.Mixed },
  
  // Timestamps
  initiatedAt: { type: Date, default: Date.now },
  completedAt: { type: Date },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Update timestamp on save
paymentSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Indexes for performance
paymentSchema.index({ paymentId: 1 }, { unique: true });
paymentSchema.index({ orderId: 1 });
paymentSchema.index({ checkoutSessionId: 1 });
paymentSchema.index({ phonepeTransactionId: 1 });
paymentSchema.index({ status: 1 });
paymentSchema.index({ createdAt: 1 });

// Method to mark payment as completed
paymentSchema.methods.markCompleted = function() {
  this.status = 'completed';
  this.completedAt = new Date();
  return this.save();
};

// Method to mark payment as failed
paymentSchema.methods.markFailed = function() {
  this.status = 'failed';
  this.completedAt = new Date();
  return this.save();
};

// Static method to find by PhonePe transaction ID
paymentSchema.statics.findByPhonePeTransaction = function(phonepeTransactionId) {
  return this.findOne({ phonepeTransactionId });
};

const Payment = mongoose.model('Payment', paymentSchema);

export default Payment;
