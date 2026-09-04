const crypto = require('crypto');
const axios = require('axios');

function automationUrl(event) {
  if (event.startsWith('booking.')) return process.env.N8N_BOOKING_WEBHOOK_URL || process.env.N8N_AUTOMATION_WEBHOOK_URL || '';
  if (event.startsWith('lead.')) return process.env.N8N_LEAD_WEBHOOK_URL || process.env.N8N_AUTOMATION_WEBHOOK_URL || '';
  return process.env.N8N_AUTOMATION_WEBHOOK_URL || '';
}

async function dispatchAutomation(event, data) {
  const url = automationUrl(event);
  if (!url) return { status: 'not-configured', event };

  const envelope = {
    event,
    eventId: crypto.randomUUID(),
    occurredAt: new Date().toISOString(),
    source: 'tataev-api',
    data
  };
  const body = JSON.stringify(envelope);
  const headers = { 'Content-Type': 'application/json', 'X-TataEV-Event': event };
  if (process.env.N8N_WEBHOOK_SECRET) {
    headers['X-TataEV-Signature'] = crypto
      .createHmac('sha256', process.env.N8N_WEBHOOK_SECRET)
      .update(body)
      .digest('hex');
  }

  try {
    await axios.post(url, envelope, { headers, timeout: 8000 });
    return { status: 'delivered', event, eventId: envelope.eventId };
  } catch (error) {
    return {
      status: 'failed',
      event,
      eventId: envelope.eventId,
      error: error.response?.status ? `Webhook returned HTTP ${error.response.status}` : error.message
    };
  }
}

module.exports = { dispatchAutomation };
