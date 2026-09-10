const crypto = require('node:crypto');

function voiceBookingAuth(req, res, next) {
  const expected = process.env.ELEVENLABS_BOOKING_SECRET || '';
  if (expected.length < 32) return res.status(503).json({ success: false, message: 'Voice booking is not configured.' });
  const supplied = req.get('X-EV-Voice-Secret') || '';
  const digest = value => crypto.createHash('sha256').update(value).digest();
  if (!crypto.timingSafeEqual(digest(expected), digest(supplied))) return res.status(401).json({ success: false, message: 'Invalid voice tool credentials.' });
  const conversationId = req.body?.conversationId;
  if (typeof conversationId !== 'string' || !/^[a-zA-Z0-9_-]{8,120}$/.test(conversationId)) {
    return res.status(400).json({ success: false, message: 'A valid conversationId is required.' });
  }
  req.bookingSource = 'elevenlabs';
  // One booking per conversation; retries use the same identifier.
  req.bookingKey = `voice:${crypto.createHash('sha256').update(conversationId).digest('hex')}`;
  next();
}
module.exports = { voiceBookingAuth };
