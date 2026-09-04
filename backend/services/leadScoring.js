const VALID_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const VALID_INDIAN_PHONE = /^[6-9]\d{9}$/;

function normalizedPhone(value = '') {
  const digits = String(value).replace(/\D/g, '');
  return digits.length === 12 && digits.startsWith('91') ? digits.slice(2) : digits;
}

function qualifyLead(input = {}) {
  let score = 0;
  const reasons = [];
  const add = (points, reason) => {
    score += points;
    reasons.push(reason);
  };

  if (String(input.name || '').trim().length >= 3) add(5, 'Customer name captured');
  if (VALID_EMAIL.test(String(input.email || '').trim())) add(8, 'Valid email captured');
  if (VALID_INDIAN_PHONE.test(normalizedPhone(input.phone))) add(12, 'Valid phone captured');
  if (String(input.city || '').trim()) add(5, 'City identified');
  if (String(input.vehicle || '').trim()) add(10, 'Vehicle preference identified');
  if (input.budget) add(10, 'Budget range captured');

  const interestPoints = { purchase: 20, 'test-ride': 18, service: 6, charging: 5, general: 0 };
  const interestScore = interestPoints[input.interest] || 0;
  if (interestScore) add(interestScore, `${input.interest.replace('-', ' ')} intent detected`);

  const timelinePoints = { '0-30-days': 25, '31-90-days': 16, '3-6-months': 8, researching: 2 };
  const timelineScore = timelinePoints[input.purchaseTimeline] || 0;
  if (timelineScore) add(timelineScore, `Purchase timeline: ${input.purchaseTimeline}`);

  if (input.source === 'booking' || input.source === 'demo-booking') add(10, 'Test-drive booking submitted');
  if (input.consent?.whatsapp) add(5, 'WhatsApp follow-up consent received');

  score = Math.min(score, 100);
  const temperature = score >= 70 ? 'hot' : score >= 40 ? 'warm' : 'cold';
  const nextBestAction = temperature === 'hot'
    ? 'Call within 10 minutes and confirm a test-drive slot'
    : temperature === 'warm'
      ? 'Send a personalised EV comparison and follow up within 24 hours'
      : 'Capture budget, city, preferred model and purchase timeline';

  return { score, temperature, reasons, nextBestAction };
}

module.exports = { qualifyLead, normalizedPhone, VALID_EMAIL, VALID_INDIAN_PHONE };
