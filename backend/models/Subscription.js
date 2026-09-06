const mongoose = require('mongoose');

const subscriptionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  provider: { type: String, enum: ['razorpay'], default: 'razorpay' },
  mode: { type: String, enum: ['test', 'live'], default: 'test', index: true },
  planCode: { type: String, required: true, index: true },
  planName: { type: String, required: true },
  billingCycle: { type: String, enum: ['monthly', 'annual'], required: true },
  amountPaise: { type: Number, required: true, min: 100 },
  currency: { type: String, enum: ['INR'], default: 'INR' },
  razorpayPlanId: { type: String, required: true },
  razorpaySubscriptionId: { type: String, required: true, unique: true, index: true },
  razorpayCustomerId: { type: String, default: '' },
  latestPaymentId: { type: String, default: '' },
  status: {
    type: String,
    enum: [
      'created',
      'authenticated',
      'active',
      'pending',
      'halted',
      'paused',
      'cancelled',
      'completed',
      'expired',
      'failed',
    ],
    default: 'created',
    index: true,
  },
  shortUrl: { type: String, default: '' },
  currentStart: { type: Date },
  currentEnd: { type: Date },
  chargeAt: { type: Date },
  endedAt: { type: Date },
  cancelAtCycleEnd: { type: Boolean, default: false },
  latestEvent: { type: String, default: '' },
  latestEventAt: { type: Date },
  latestPaymentStatus: { type: String, default: '' },
}, { timestamps: true });

subscriptionSchema.index({ user: 1, status: 1, createdAt: -1 });

module.exports = mongoose.model('Subscription', subscriptionSchema);
