const mongoose = require('mongoose');

const leadSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, default: '', lowercase: true, trim: true },
  phone: { type: String, default: '', trim: true },
  city: { type: String, default: '', trim: true },
  source: { type: String, enum: ['chatbot', 'voice', 'form', 'booking', 'demo-booking', 'whatsapp', 'manual'], default: 'chatbot' },
  status: { type: String, enum: ['new', 'contacted', 'qualified', 'converted', 'lost'], default: 'new' },
  interest: { type: String, enum: ['test-ride', 'purchase', 'service', 'charging', 'general'], default: 'general' },
  vehicle: { type: String, default: '' },
  budget: { type: String, enum: ['', 'under-10', '10-15', '15-20', '20-plus'], default: '' },
  purchaseTimeline: { type: String, enum: ['', '0-30-days', '31-90-days', '3-6-months', 'researching'], default: '' },
  score: { type: Number, min: 0, max: 100, default: 0, index: true },
  temperature: { type: String, enum: ['hot', 'warm', 'cold'], default: 'cold', index: true },
  scoreReasons: [{ type: String }],
  nextBestAction: { type: String, default: '' },
  notes: { type: String, default: '' },
  sessionId: { type: String },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  convertedAt: { type: Date },
  tags: [{ type: String }],
  consent: {
    whatsapp: { type: Boolean, default: false },
    marketing: { type: Boolean, default: false },
    capturedAt: { type: Date }
  },
  followUp: {
    channel: { type: String, enum: ['whatsapp', 'email', 'call', 'none'], default: 'none' },
    scheduledAt: { type: Date },
    status: { type: String, enum: ['none', 'scheduled', 'triggered', 'completed', 'failed'], default: 'none' },
    lastAttemptAt: { type: Date },
    error: { type: String, default: '' }
  },
  automationPaused: { type: Boolean, default: false },
  handoff: {
    status: { type: String, enum: ['none', 'requested', 'assigned', 'resolved'], default: 'none' },
    reason: { type: String, default: '' },
    requestedAt: { type: Date },
    resolvedAt: { type: Date }
  },
  activities: [{
    type: { type: String, required: true },
    detail: { type: String, default: '' },
    actor: { type: String, default: 'system' },
    createdAt: { type: Date, default: Date.now }
  }],
  archivedAt: { type: Date }
}, { timestamps: true });

leadSchema.index({ email: 1 }, { sparse: true });
leadSchema.index({ phone: 1 }, { sparse: true });
leadSchema.index({ status: 1, temperature: 1, createdAt: -1 });
leadSchema.index({ 'followUp.scheduledAt': 1, 'followUp.status': 1 });

module.exports = mongoose.model('Lead', leadSchema);
