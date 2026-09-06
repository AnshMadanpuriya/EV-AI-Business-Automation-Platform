const crypto = require('crypto');

const RAZORPAY_API_BASE = 'https://api.razorpay.com/v1';

const PLAN_CATALOG = Object.freeze({
  starter_monthly: {
    code: 'starter_monthly',
    name: 'Starter',
    billingCycle: 'monthly',
    amountPaise: 499900,
    currency: 'INR',
    totalCount: 12,
    razorpayPlanEnv: 'RAZORPAY_PLAN_STARTER_MONTHLY',
    description: 'For a single-location EV dealership',
    features: ['500 AI conversations', 'Chat agent', 'Lead capture and CRM', 'Basic analytics', 'Email support'],
  },
  starter_annual: {
    code: 'starter_annual',
    name: 'Starter',
    billingCycle: 'annual',
    amountPaise: 4798800,
    currency: 'INR',
    totalCount: 3,
    razorpayPlanEnv: 'RAZORPAY_PLAN_STARTER_ANNUAL',
    description: 'Starter billed annually with 20% savings',
    features: ['500 AI conversations', 'Chat agent', 'Lead capture and CRM', 'Basic analytics', 'Email support'],
  },
  growth_monthly: {
    code: 'growth_monthly',
    name: 'Growth',
    billingCycle: 'monthly',
    amountPaise: 1499900,
    currency: 'INR',
    totalCount: 12,
    razorpayPlanEnv: 'RAZORPAY_PLAN_GROWTH_MONTHLY',
    description: 'For growing EV dealerships and OEMs',
    features: ['5,000 AI conversations', 'Voice and chat agents', 'n8n workflows', 'CRM integrations', 'Priority support'],
  },
  growth_annual: {
    code: 'growth_annual',
    name: 'Growth',
    billingCycle: 'annual',
    amountPaise: 14398800,
    currency: 'INR',
    totalCount: 3,
    razorpayPlanEnv: 'RAZORPAY_PLAN_GROWTH_ANNUAL',
    description: 'Growth billed annually with 20% savings',
    features: ['5,000 AI conversations', 'Voice and chat agents', 'n8n workflows', 'CRM integrations', 'Priority support'],
  },
});

function getPaymentMode() {
  return String(process.env.RAZORPAY_MODE || '').toLowerCase() === 'live'
    ? 'live'
    : 'test';
}

function getPlanDefinition(planCode) {
  const plan = PLAN_CATALOG[String(planCode || '').toLowerCase()];
  if (!plan) return null;

  return {
    ...plan,
    razorpayPlanId: String(process.env[plan.razorpayPlanEnv] || '').trim(),
  };
}

function toPublicPlan(plan) {
  return {
    code: plan.code,
    name: plan.name,
    billingCycle: plan.billingCycle,
    amountPaise: plan.amountPaise,
    currency: plan.currency,
    description: plan.description,
    features: plan.features,
    configured: Boolean(plan.razorpayPlanId),
  };
}

function getPublicPlans() {
  return Object.keys(PLAN_CATALOG).map((code) => (
    toPublicPlan(getPlanDefinition(code))
  ));
}

function getRazorpayConfiguration() {
  const keyId = String(process.env.RAZORPAY_KEY_ID || '').trim();
  const keySecret = String(process.env.RAZORPAY_KEY_SECRET || '').trim();
  const mode = getPaymentMode();

  return {
    keyId,
    keySecret,
    mode,
    apiConfigured: Boolean(keyId && keySecret),
    webhookConfigured: Boolean(process.env.RAZORPAY_WEBHOOK_SECRET),
  };
}

function configurationError(message) {
  const error = new Error(message);
  error.statusCode = 503;
  error.publicMessage = 'Secure payments are not configured yet. Please contact support.';
  return error;
}

async function razorpayRequest(pathname, { method = 'GET', body } = {}) {
  const { keyId, keySecret } = getRazorpayConfiguration();
  if (!keyId || !keySecret) {
    throw configurationError('RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET are required');
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);

  try {
    const response = await fetch(`${RAZORPAY_API_BASE}${pathname}`, {
      method,
      headers: {
        Authorization: `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString('base64')}`,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
    const responseText = await response.text();
    let data = {};

    try {
      data = responseText ? JSON.parse(responseText) : {};
    } catch {
      data = {};
    }

    if (!response.ok) {
      const error = new Error(
        data.error?.description || `Razorpay request failed with status ${response.status}`,
      );
      error.statusCode = response.status >= 500 ? 502 : 400;
      error.providerStatus = response.status;
      error.publicMessage = response.status >= 500
        ? 'Payment provider is temporarily unavailable. Please try again.'
        : (data.error?.description || 'Razorpay rejected the subscription request.');
      throw error;
    }

    return data;
  } catch (error) {
    if (error.name === 'AbortError') {
      const timeoutError = new Error('Razorpay request timed out');
      timeoutError.statusCode = 504;
      timeoutError.publicMessage = 'Payment provider timed out. Please try again.';
      throw timeoutError;
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

async function createRazorpaySubscription(plan, userId) {
  if (!plan?.razorpayPlanId) {
    throw configurationError(`${plan?.razorpayPlanEnv || 'Razorpay plan'} is not configured`);
  }

  return razorpayRequest('/subscriptions', {
    method: 'POST',
    body: {
      plan_id: plan.razorpayPlanId,
      total_count: plan.totalCount,
      quantity: 1,
      customer_notify: 1,
      notes: {
        application: 'EV AI Business Automation Platform',
        user_id: String(userId),
        plan_code: plan.code,
      },
    },
  });
}

async function cancelRazorpaySubscription(subscriptionId) {
  const safeId = String(subscriptionId || '').trim();
  if (!/^sub_[A-Za-z0-9]+$/.test(safeId)) {
    const error = new Error('Invalid Razorpay subscription ID');
    error.statusCode = 400;
    error.publicMessage = 'Invalid subscription reference.';
    throw error;
  }

  return razorpayRequest(`/subscriptions/${encodeURIComponent(safeId)}/cancel`, {
    method: 'POST',
    body: { cancel_at_cycle_end: 1 },
  });
}

function constantTimeHexMatch(expected, received) {
  if (!/^[a-f0-9]{64}$/i.test(String(received || ''))) return false;

  const expectedBuffer = Buffer.from(expected, 'hex');
  const receivedBuffer = Buffer.from(received, 'hex');
  return expectedBuffer.length === receivedBuffer.length
    && crypto.timingSafeEqual(expectedBuffer, receivedBuffer);
}

function verifyCheckoutSignature({
  paymentId,
  subscriptionId,
  signature,
  secret = process.env.RAZORPAY_KEY_SECRET,
}) {
  if (!secret || !paymentId || !subscriptionId || !signature) return false;
  const payload = `${paymentId}|${subscriptionId}`;
  const expected = crypto.createHmac('sha256', secret).update(payload).digest('hex');
  return constantTimeHexMatch(expected, signature);
}

function verifyWebhookSignature({
  rawBody,
  signature,
  secret = process.env.RAZORPAY_WEBHOOK_SECRET,
}) {
  if (!secret || !rawBody || !signature) return false;
  const expected = crypto
    .createHmac('sha256', secret)
    .update(rawBody)
    .digest('hex');
  return constantTimeHexMatch(expected, signature);
}

function hashWebhookPayload(rawBody) {
  return crypto.createHash('sha256').update(rawBody).digest('hex');
}

module.exports = {
  PLAN_CATALOG,
  getPaymentMode,
  getPlanDefinition,
  getPublicPlans,
  getRazorpayConfiguration,
  createRazorpaySubscription,
  cancelRazorpaySubscription,
  verifyCheckoutSignature,
  verifyWebhookSignature,
  hashWebhookPayload,
};
