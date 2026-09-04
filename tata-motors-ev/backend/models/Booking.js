const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true },
  phone: { type: String, required: true },
  type: { type: String, enum: ['test-ride', 'demo', 'service', 'consultation'], default: 'test-ride' },
  vehicle: { type: String, default: '' },
  date: { type: Date, required: true },
  timeSlot: { type: String, required: true },
  location: { type: String, default: '' },
  status: { type: String, enum: ['pending', 'confirmed', 'completed', 'cancelled'], default: 'pending' },
  notes: { type: String, default: '' },
  sessionId: { type: String },
  reminderSent: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model('Booking', bookingSchema);
