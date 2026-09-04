const mongoose = require('mongoose');

const leadSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String },
  phone: { type: String },
  source: { type: String, enum: ['chatbot', 'voice', 'form', 'demo-booking'], default: 'chatbot' },
  status: { type: String, enum: ['new', 'contacted', 'qualified', 'converted', 'lost'], default: 'new' },
  interest: { type: String, enum: ['test-ride', 'purchase', 'service', 'charging', 'general'], default: 'general' },
  vehicle: { type: String, default: '' },
  notes: { type: String, default: '' },
  sessionId: { type: String },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  convertedAt: { type: Date },
  tags: [{ type: String }]
}, { timestamps: true });

module.exports = mongoose.model('Lead', leadSchema);
