/**
 * WebhookEvent Model - Idempotency Tracking
 * 
 * Prevents duplicate webhook processing by tracking webhook events
 * using PhonePe transaction ID as the unique identifier.
 * 
 * Critical for preventing:
 * - Double billing
 * - Duplicate order confirmation
 * - Race conditions in payment processing
 */

import mongoose from 'mongoose';

const webhookEventSchema = new mongoose.Schema({
  eventId: { 
    type: String, 
    unique: true, 
    required: true,
    index: true
  },
  payload: { 
    type: Object,
    required: true
  },
  status: { 
    type: String, 
    enum: ['received', 'processing', 'processed', 'failed'], 
    default: 'received',
    index: true
  },
  receivedAt: { 
    type: Date, 
    default: Date.now,
    index: true
  },
  processedAt: {
    type: Date,
    index: true
  },
  errorMessage: {
    type: String
  },
  retryCount: {
    type: Number,
    default: 0
  },
  // Additional metadata for debugging
  source: {
    type: String,
    default: 'phonepe',
    enum: ['phonepe', 'razorpay', 'manual']
  },
  ip: {
    type: String
  },
  userAgent: {
    type: String
  }
}, {
  timestamps: true,
  collection: 'webhookevents'
});

// Indexes for performance
webhookEventSchema.index({ eventId: 1, status: 1 });
webhookEventSchema.index({ receivedAt: -1 });
webhookEventSchema.index({ status: 1, receivedAt: -1 });

// Static methods for webhook management
webhookEventSchema.statics.findByEventId = function(eventId) {
  return this.findOne({ eventId });
};

webhookEventSchema.statics.markAsProcessed = function(eventId, processedAt = new Date()) {
  return this.updateOne(
    { eventId },
    { 
      $set: { 
        status: 'processed', 
        processedAt 
      }
    }
  );
};

webhookEventSchema.statics.markAsFailed = function(eventId, errorMessage) {
  return this.updateOne(
    { eventId },
    { 
      $set: { 
        status: 'failed', 
        errorMessage,
        processedAt: new Date()
      },
      $inc: { retryCount: 1 }
    }
  );
};

webhookEventSchema.statics.getFailedWebhooks = function(hoursAgo = 24) {
  const cutoffTime = new Date(Date.now() - (hoursAgo * 60 * 60 * 1000));
  return this.find({
    status: 'failed',
    receivedAt: { $gte: cutoffTime }
  }).sort({ receivedAt: -1 });
};

webhookEventSchema.statics.cleanupOldEvents = function(daysOld = 30) {
  const cutoffTime = new Date(Date.now() - (daysOld * 24 * 60 * 60 * 1000));
  return this.deleteMany({
    receivedAt: { $lt: cutoffTime },
    status: { $in: ['processed', 'failed'] }
  });
};

// Instance methods
webhookEventSchema.methods.isProcessed = function() {
  return this.status === 'processed';
};

webhookEventSchema.methods.isFailed = function() {
  return this.status === 'failed';
};

webhookEventSchema.methods.isProcessing = function() {
  return this.status === 'processing';
};

webhookEventSchema.methods.canRetry = function() {
  return this.status === 'failed' && this.retryCount < 3;
};

export default mongoose.model('WebhookEvent', webhookEventSchema);
