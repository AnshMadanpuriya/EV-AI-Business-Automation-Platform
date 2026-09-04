const axios = require('axios');
const ChatSession = require('../models/ChatSession');
const Lead = require('../models/Lead');


// Fallback AI responses when n8n is not available
const evResponses = {
  greeting: ["Hello! Welcome to Tata Motors EV. I'm your AI assistant. How can I help you today? I can assist with test rides, vehicle info, charging support, or service queries."],
  'test-ride': ["Great choice! I'd love to schedule a test ride for you. We have the Nexon EV, Tiago EV, Punch EV, and Tigor EV available. Which model interests you? Please share your name, email, and preferred date."],
  charging: ["Tata Motors EVs support both AC and DC fast charging. The Nexon EV can charge 0-100% in ~8.5 hrs on AC or ~60 mins on DC fast charger. We also offer home charging installation. What specific charging question do you have?"],
  service: ["Our EV service centers are equipped with specialized EV technicians. We offer free first service, annual maintenance contracts, and 24/7 roadside assistance. Would you like to book a service appointment?"],
  pricing: ["Our EV lineup starts from ₹8.49 Lakhs (Tiago EV) to ₹25+ Lakhs (Nexon EV Long Range). All models qualify for government FAME-II subsidies. Would you like a detailed price quote?"],
  default: ["I'm here to help with your EV journey! I can assist with test rides, pricing info, charging queries, or service bookings. What would you like to know?"]
};

const detectIntent = (message) => {
  const lower = message.toLowerCase();
  if (lower.includes('test ride') || lower.includes('test drive') || lower.includes('drive')) return 'test-ride';
  if (lower.includes('charg') || lower.includes('battery') || lower.includes('range')) return 'charging';
  if (lower.includes('service') || lower.includes('repair') || lower.includes('maintenance')) return 'service';
  if (lower.includes('price') || lower.includes('cost') || lower.includes('lakh') || lower.includes('budget')) return 'pricing';
  if (lower.includes('hello') || lower.includes('hi') || lower.includes('hey')) return 'greeting';
  return 'default';
};

exports.sendMessage = async (req, res) => {
  try {
    const { message, sessionId: clientSessionId, visitorName, visitorEmail } = req.body;
    if (!message?.trim()) return res.status(400).json({ success: false, message: 'Message is required' });

    const sessionId = clientSessionId || `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Get or create session
    let session = await ChatSession.findOne({ sessionId });
    if (!session) {
      session = new ChatSession({ sessionId, visitorName: visitorName || 'Visitor', visitorEmail: visitorEmail || '' });
    }

    session.messages.push({ role: 'user', content: message });

    let aiResponse = '';
    let usedN8n = false;

    // Try n8n webhook
    if (process.env.N8N_WEBHOOK_URL) {
      try {
        const n8nPayload = {
          sessionId,
          message,
          visitorName: visitorName || 'Visitor',
          visitorEmail: visitorEmail || '',
          timestamp: new Date().toISOString(),
          messageHistory: session.messages.slice(-10).map(m => ({ role: m.role, content: m.content })),
          metadata: { source: 'chatbot', product: 'Tata Motors EV Agent' }
        };

        const n8nRes = await axios.post(process.env.N8N_WEBHOOK_URL, n8nPayload, { timeout: 8000 });
        aiResponse = n8nRes.data?.response || n8nRes.data?.message || n8nRes.data?.text || '';
        usedN8n = !!aiResponse;
      } catch (n8nError) {
        console.log('n8n unavailable, using fallback:', n8nError.message);
      }
    }

    // Fallback response
    if (!aiResponse) {
      const intent = detectIntent(message);
      const responses = evResponses[intent] || evResponses.default;
      aiResponse = responses[Math.floor(Math.random() * responses.length)];
    }

    session.messages.push({ role: 'assistant', content: aiResponse });
    session.intent = detectIntent(message);
    await session.save();

    // Auto-create lead if contact info provided
    if (visitorEmail && !session.leadId) {
      const lead = await Lead.findOneAndUpdate(
        { email: visitorEmail },
        { name: visitorName || 'Visitor', email: visitorEmail, source: 'chatbot', sessionId, status: 'new' },
        { upsert: true, new: true }
      );
      session.leadId = lead._id;
      await session.save();
    }

    res.json({ success: true, sessionId, response: aiResponse, intent: session.intent, usedN8n });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getSession = async (req, res) => {
  try {
    const session = await ChatSession.findOne({ sessionId: req.params.sessionId });
    if (!session) return res.status(404).json({ success: false, message: 'Session not found' });
    res.json({ success: true, session });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getAllSessions = async (req, res) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const filter = status ? { status } : {};
    const sessions = await ChatSession.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));
    const total = await ChatSession.countDocuments(filter);
    res.json({ success: true, sessions, total, page: parseInt(page), pages: Math.ceil(total / limit) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
