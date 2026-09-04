const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizedPhone, qualifyLead } = require('../services/leadScoring');

test('normalizes Indian numbers with +91 prefix', () => {
  assert.equal(normalizedPhone('+91 98765 43210'), '9876543210');
});

test('marks a high-intent test-drive customer as hot', () => {
  const result = qualifyLead({
    name: 'Priya Mehta',
    email: 'priya@example.com',
    phone: '9876543210',
    city: 'Pune',
    vehicle: 'Nexon EV',
    budget: '15-20',
    interest: 'test-ride',
    purchaseTimeline: '0-30-days',
    source: 'booking',
    consent: { whatsapp: true }
  });

  assert.equal(result.temperature, 'hot');
  assert.equal(result.score, 100);
  assert.match(result.nextBestAction, /Call within 10 minutes/i);
});

test('keeps a low-information enquiry cold and recommends data capture', () => {
  const result = qualifyLead({ name: 'Aman', email: 'aman@example.com', interest: 'general' });
  assert.equal(result.temperature, 'cold');
  assert.ok(result.score < 40);
  assert.match(result.nextBestAction, /Capture budget/i);
});
