import mongoose from 'mongoose';

const RawWebhookSchema = new mongoose.Schema({
  provider: { type: String, required: true },
  headers: { type: mongoose.Schema.Types.Mixed },
  raw: { type: String, required: true },
  receivedAt: { type: Date, default: Date.now },
  processed: { type: Boolean, default: false, index: true },
  processedAt: Date,
  error: String,
  processing: { type: Boolean, default: false, index: true },
  
  // New bulletproof webhook fields
  idempotencyKey: { type: String, sparse: true },
  correlationId: String,
  orderId: String,
  priority: { type: String, enum: ['low', 'normal', 'high', 'critical'], default: 'normal' },
  retryCount: { type: Number, default: 0 },
  retryAfter: Date,
  lastError: String,
  lastErrorAt: Date,
  deadLetter: { type: Boolean, default: false, index: true },
  requiresManualProcessing: { type: Boolean, default: false },
  processingStartedAt: Date,
  result: String,
  processingTime: Number
});

// TTL - auto-delete after 48 hours (172800 seconds)
RawWebhookSchema.index({ receivedAt: 1 }, { expireAfterSeconds: 172800 });

// Compound indexes for efficient querying
RawWebhookSchema.index({ processed: 1, processing: 1, receivedAt: 1 });
RawWebhookSchema.index({ orderId: 1 });
RawWebhookSchema.index({ correlationId: 1 });
RawWebhookSchema.index({ priority: 1, receivedAt: 1 });
RawWebhookSchema.index({ retryAfter: 1 });
RawWebhookSchema.index({ deadLetter: 1, requiresManualProcessing: 1 });

export default mongoose.models.RawWebhook || mongoose.model('RawWebhook', RawWebhookSchema);