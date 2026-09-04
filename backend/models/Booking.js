const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  bookingCode: {
    type: String,
    unique: true,
    index: true,
    default: () => `TEV-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`
  },
  name: { type: String, required: true },
  email: { type: String, required: true },
  phone: { type: String, required: true },
  type: { type: String, enum: ['test-ride', 'demo', 'service', 'consultation'], default: 'test-ride' },
  vehicle: { type: String, default: '' },
  date: { type: Date, required: true },
  timeSlot: { type: String, required: true },
  testDriveMode: { type: String, enum: ['showroom', 'home'], default: 'showroom' },
  city: { type: String, default: '', trim: true },
  pincode: { type: String, default: '', trim: true },
  address: { type: String, default: '', trim: true },
  location: { type: String, default: '' },
  status: { type: String, enum: ['pending', 'confirmed', 'completed', 'cancelled', 'no-show'], default: 'pending' },
  notes: { type: String, default: '' },
  sessionId: { type: String },
  leadId: { type: mongoose.Schema.Types.ObjectId, ref: 'Lead' },
  idempotencyKey: { type: String, sparse: true, unique: true },
  cancellationReason: { type: String, default: '' },
  reminderSent: { type: Boolean, default: false },
  consent: {
    privacyAccepted: { type: Boolean, default: false },
    emailUpdates: { type: Boolean, default: true },
    capturedAt: { type: Date, default: Date.now }
  },
  automation: {
    status: { type: String, enum: ['not-configured', 'queued', 'delivered', 'failed'], default: 'not-configured' },
    lastEvent: { type: String, default: '' },
    lastAttemptAt: { type: Date },
    error: { type: String, default: '' }
  },
  rescheduleHistory: [{
    fromDate: Date,
    fromTimeSlot: String,
    toDate: Date,
    toTimeSlot: String,
    changedAt: { type: Date, default: Date.now },
    changedBy: { type: String, default: 'admin' }
  }]
}, { timestamps: true });

bookingSchema.index({ date: 1, timeSlot: 1, location: 1, status: 1 });

module.exports = mongoose.model('Booking', bookingSchema);
