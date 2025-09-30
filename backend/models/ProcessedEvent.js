import mongoose from 'mongoose';

const processedEventSchema = new mongoose.Schema({
  eventId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  provider: {
    type: String,
    required: true,
    enum: ['phonepe', 'razorpay', 'stripe']
  },
  paymentId: {
    type: String,
    required: true
  },
  orderId: {
    type: String,
    required: true
  },
  status: {
    type: String,
    required: true,
    enum: ['processing', 'completed', 'failed']
  },
  processedAt: {
    type: Date,
    default: Date.now
  },
  error: {
    type: String,
    default: null
  },
  retryCount: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// TTL index to clean up old events after 30 days
processedEventSchema.index({ processedAt: 1 }, { expireAfterSeconds: 2592000 });

export default mongoose.model('ProcessedEvent', processedEventSchema);
