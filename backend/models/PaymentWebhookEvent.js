const mongoose = require('mongoose');

const paymentWebhookEventSchema = new mongoose.Schema({
  eventId: { type: String, required: true, unique: true, index: true },
  eventType: { type: String, required: true, index: true },
  payloadHash: { type: String, required: true },
  status: {
    type: String,
    enum: ['received', 'processed', 'ignored', 'failed'],
    default: 'received',
    index: true,
  },
  providerCreatedAt: { type: Date },
  processedAt: { type: Date },
  error: { type: String, default: '' },
}, { timestamps: true });

paymentWebhookEventSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 180 });

module.exports = mongoose.model('PaymentWebhookEvent', paymentWebhookEventSchema);
