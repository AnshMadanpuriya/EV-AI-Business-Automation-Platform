const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  role: { type: String, enum: ['user', 'assistant'], required: true },
  content: { type: String, required: true },
  timestamp: { type: Date, default: Date.now }
});

const chatSessionSchema = new mongoose.Schema({
  sessionId: { type: String, required: true, unique: true },
  visitorName: { type: String, default: 'Visitor' },
  visitorEmail: { type: String, default: '' },
  messages: [messageSchema],
  status: { type: String, enum: ['active', 'closed', 'escalated'], default: 'active' },
  intent: { type: String, default: '' },
  leadId: { type: mongoose.Schema.Types.ObjectId, ref: 'Lead' },
  duration: { type: Number, default: 0 },
  satisfactionScore: { type: Number, min: 1, max: 5 },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} }
}, { timestamps: true });

module.exports = mongoose.model('ChatSession', chatSessionSchema);
