import mongoose from 'mongoose';

const paymentEventSchema = new mongoose.Schema({
  // Event identifier
  eventId: { 
    type: String, 
    required: true
  },
  
  // Correlation ID for request tracing
  correlationId: { 
    type: String, 
    required: true 
  },
  
  // Related entities
  checkoutSessionId: { type: String },
  orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'order' },
  paymentId: { type: String },
  
  // Event details
  eventType: { 
    type: String, 
    required: true,
    enum: [
      'session_created',
      'stock_reserved',
      'stock_released',
      'payment_initiated',
      'payment_redirected',
      'webhook_received',
      'webhook_verified',
      'payment_completed',
      'payment_failed',
      'order_created',
      'stock_decremented',
      'session_expired',
      'reconciliation_started',
      'reconciliation_completed',
      'cart_validation_failed'
    ]
  },
  
  // Event status
  status: { 
    type: String, 
    enum: ['success', 'failed', 'pending'], 
    default: 'pending' 
  },
  
  // Event data
  data: { type: mongoose.Schema.Types.Mixed },
  
  // Error information if applicable
  error: {
    message: String,
    code: String,
    stack: String
  },
  
  // Source information
  source: { 
    type: String, 
    enum: ['frontend', 'backend', 'webhook', 'cron', 'manual'], 
    required: true 
  },
  
  // User context
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'user' },
  userEmail: { type: String },
  
  // Timestamps
  occurredAt: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now }
});

// Indexes for performance and querying
paymentEventSchema.index({ eventId: 1 }, { unique: true });
paymentEventSchema.index({ correlationId: 1 });
paymentEventSchema.index({ checkoutSessionId: 1 });
paymentEventSchema.index({ orderId: 1 });
paymentEventSchema.index({ paymentId: 1 });
paymentEventSchema.index({ eventType: 1 });
paymentEventSchema.index({ status: 1 });
paymentEventSchema.index({ occurredAt: 1 });
paymentEventSchema.index({ userId: 1 });

// Method to mark event as successful
paymentEventSchema.methods.markSuccess = function(data = {}) {
  this.status = 'success';
  this.data = { ...this.data, ...data };
  return this.save();
};

// Method to mark event as failed
paymentEventSchema.methods.markFailed = function(error) {
  this.status = 'failed';
  this.error = {
    message: error.message || 'Unknown error',
    code: error.code || 'UNKNOWN',
    stack: error.stack
  };
  return this.save();
};

// Static method to create event
paymentEventSchema.statics.createEvent = function(eventData) {
  const eventId = `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  return this.create({
    eventId,
    ...eventData
  });
};

// Static method to find events by correlation ID
paymentEventSchema.statics.findByCorrelationId = function(correlationId) {
  return this.find({ correlationId }).sort({ occurredAt: 1 });
};

// Static method to find events by checkout session
paymentEventSchema.statics.findByCheckoutSession = function(checkoutSessionId) {
  return this.find({ checkoutSessionId }).sort({ occurredAt: 1 });
};

const PaymentEvent = mongoose.model('PaymentEvent', paymentEventSchema);

export default PaymentEvent;
