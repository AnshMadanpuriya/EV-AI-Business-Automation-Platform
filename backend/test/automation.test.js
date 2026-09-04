const test = require('node:test');
const assert = require('node:assert/strict');
const { dispatchAutomation } = require('../services/automation');

test('reports not-configured without making a network request', async () => {
  const previous = {
    general: process.env.N8N_AUTOMATION_WEBHOOK_URL,
    booking: process.env.N8N_BOOKING_WEBHOOK_URL,
    lead: process.env.N8N_LEAD_WEBHOOK_URL
  };
  delete process.env.N8N_AUTOMATION_WEBHOOK_URL;
  delete process.env.N8N_BOOKING_WEBHOOK_URL;
  delete process.env.N8N_LEAD_WEBHOOK_URL;
  try {
    const result = await dispatchAutomation('lead.qualified', { leadId: 'test' });
    assert.deepEqual(result, { status: 'not-configured', event: 'lead.qualified' });
  } finally {
    if (previous.general) process.env.N8N_AUTOMATION_WEBHOOK_URL = previous.general;
    if (previous.booking) process.env.N8N_BOOKING_WEBHOOK_URL = previous.booking;
    if (previous.lead) process.env.N8N_LEAD_WEBHOOK_URL = previous.lead;
  }
});
