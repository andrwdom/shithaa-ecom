import mongoose from 'mongoose';

const RawWebhookSchema = new mongoose.Schema({
  provider: { type: String, required: true },
  headers: { type: mongoose.Schema.Types.Mixed },
  raw: { type: String, required: true },
  receivedAt: { type: Date, default: Date.now, index: true },
  processed: { type: Boolean, default: false, index: true },
  processedAt: Date,
  error: String
});

// TTL - auto-delete after 48 hours (172800 seconds)
RawWebhookSchema.index({ receivedAt: 1 }, { expireAfterSeconds: 172800 });

export default mongoose.models.RawWebhook || mongoose.model('RawWebhook', RawWebhookSchema);
