const crypto = require('crypto');

const RAZORPAY_API_BASE = 'https://api.razorpay.com/v1';

const PLAN_CATALOG = Object.freeze({
  starter_monthly: {
    code: 'starter_monthly',
    name: 'Starter',
    billingCycle: 'monthly',
    amountPaise: 49900,
    currency: 'INR',
    totalCount: 12,
    razorpayPlanEnv: 'RAZORPAY_PLAN_STARTER_MONTHLY',
    description: 'For a single-location EV dealership',
    features: ['Chat assistant', 'Lead capture and CRM', 'Test-drive requests', 'Basic analytics', 'Email support'],
  },
  starter_annual: {
    code: 'starter_annual',
    name: 'Starter',
    billingCycle: 'annual',
    amountPaise: 479040,
    currency: 'INR',
    totalCount: 3,
    razorpayPlanEnv: 'RAZORPAY_PLAN_STARTER_ANNUAL',
    description: 'Starter billed annually with 20% savings',
    features: ['Chat assistant', 'Lead capture and CRM', 'Test-drive requests', 'Basic analytics', 'Email support'],
  },
  growth_monthly: {
    code: 'growth_monthly',
    name: 'Growth',
    billingCycle: 'monthly',
    amountPaise: 100000,
    currency: 'INR',
    totalCount: 12,
    razorpayPlanEnv: 'RAZORPAY_PLAN_GROWTH_MONTHLY',
    description: 'For growing EV dealerships and OEMs',
    features: ['Everything in Starter', 'Voice agent connection', 'n8n workflow integration', 'Sales follow-up tools', 'Priority support'],
  },
  growth_annual: {
    code: 'growth_annual',
    name: 'Growth',
    billingCycle: 'annual',
    amountPaise: 960000,
    currency: 'INR',
    totalCount: 3,
    razorpayPlanEnv: 'RAZORPAY_PLAN_GROWTH_ANNUAL',
    description: 'Growth billed annually with 20% savings',
    features: ['Everything in Starter', 'Voice agent connection', 'n8n workflow integration', 'Sales follow-up tools', 'Priority support'],
  },
  enterprise_monthly: {
    code: 'enterprise_monthly',
    name: 'Enterprise',
    billingCycle: 'monthly',
    amountPaise: 249900,
    currency: 'INR',
    totalCount: 12,
    razorpayPlanEnv: 'RAZORPAY_PLAN_ENTERPRISE_MONTHLY',
    description: 'For EV teams that want assisted setup and support',
    features: ['Everything in Growth', 'Assisted onboarding', 'Workflow setup guidance', 'Team training', 'Priority implementation support'],
  },
  enterprise_annual: {
    code: 'enterprise_annual',
    name: 'Enterprise',
    billingCycle: 'annual',
    amountPaise: 2399040,
    currency: 'INR',
    totalCount: 3,
    razorpayPlanEnv: 'RAZORPAY_PLAN_ENTERPRISE_ANNUAL',
    description: 'Enterprise billed annually with 20% savings',
    features: ['Everything in Growth', 'Assisted onboarding', 'Workflow setup guidance', 'Team training', 'Priority implementation support'],
  },
});

function getPaymentMode() {
  return String(process.env.RAZORPAY_MODE || '').toLowerCase() === 'live'
    ? 'live'
    : 'test';
}

function getPlanDefinition(planCode) {
  if (typeof planCode !== 'string') return null;
  const code = planCode.toLowerCase();
  if (!Object.hasOwn(PLAN_CATALOG, code)) return null;
  const plan = PLAN_CATALOG[code];

  return {
    ...plan,
    razorpayPlanId: String(process.env[plan.razorpayPlanEnv] || '').trim(),
  };
}

function toPublicPlan(plan) {
  const configuration = getRazorpayConfiguration();
  return {
    code: plan.code,
    name: plan.name,
    billingCycle: plan.billingCycle,
    amountPaise: plan.amountPaise,
    currency: plan.currency,
    description: plan.description,
    features: plan.features,
    totalCount: plan.totalCount,
    annualSavingsPercent: plan.billingCycle === 'annual' ? 20 : 0,
    configured: configuration.checkoutConfigured && /^plan_[A-Za-z0-9]+$/.test(plan.razorpayPlanId),
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
  const keyMatchesMode = new RegExp(`^rzp_${mode}_[A-Za-z0-9]+$`).test(keyId);
  const secretConfigured = Boolean(keySecret) && !/replace|your_.*secret/i.test(keySecret);
  const webhookConfigured = String(process.env.RAZORPAY_WEBHOOK_SECRET || '').trim().length >= 32
    && !/replace|your_.*secret/i.test(process.env.RAZORPAY_WEBHOOK_SECRET);
  const apiConfigured = keyMatchesMode && secretConfigured;

  return {
    keyId,
    keySecret,
    mode,
    apiConfigured,
    keyMatchesMode,
    webhookConfigured,
    checkoutConfigured: apiConfigured && webhookConfigured,
  };
}

function getBillingSupport() {
  const phone = String(process.env.PAYMENT_SUPPORT_PHONE || '').replace(/[\s()+-]/g, '');
  return { phone: /^\d{10,15}$/.test(phone) ? `+${phone}` : '' };
}

function assertCheckoutConfigured(plan) {
  if (!getRazorpayConfiguration().checkoutConfigured
    || !/^plan_[A-Za-z0-9]+$/.test(plan?.razorpayPlanId || '')) {
    throw configurationError('Razorpay keys, webhook secret and a valid plan ID are required');
  }
}

function configurationError(message) {
  const error = new Error(message);
  error.statusCode = 503;
  error.publicMessage = 'Secure payments are not configured yet. Please contact support.';
  return error;
}

async function razorpayRequest(pathname, { method = 'GET', body } = {}) {
  const { keyId, keySecret, apiConfigured } = getRazorpayConfiguration();
  if (!apiConfigured) {
    throw configurationError('Razorpay API keys are missing or do not match the selected mode');
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
        : 'Razorpay could not start this billing request. Please contact billing support.';
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

async function validateRazorpayPlan(plan) {
  assertCheckoutConfigured(plan);
  const remote = await razorpayRequest(`/plans/${encodeURIComponent(plan.razorpayPlanId)}`);
  const period = plan.billingCycle === 'annual' ? 'yearly' : 'monthly';
  if (remote.id !== plan.razorpayPlanId
    || remote.item?.amount !== plan.amountPaise
    || remote.item?.currency !== plan.currency
    || remote.period !== period
    || remote.interval !== 1) {
    const error = configurationError('The Razorpay plan price, currency or interval does not match the catalog');
    error.publicMessage = 'This billing plan is being updated. No payment was started. Please contact billing support.';
    throw error;
  }
  return remote;
}

async function createRazorpaySubscription(plan, userId) {
  await validateRazorpayPlan(plan);

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

async function cancelRazorpaySubscription(subscriptionId, { atCycleEnd = true } = {}) {
  const safeId = String(subscriptionId || '').trim();
  if (!/^sub_[A-Za-z0-9]+$/.test(safeId)) {
    const error = new Error('Invalid Razorpay subscription ID');
    error.statusCode = 400;
    error.publicMessage = 'Invalid subscription reference.';
    throw error;
  }

  return razorpayRequest(`/subscriptions/${encodeURIComponent(safeId)}/cancel`, {
    method: 'POST',
    body: { cancel_at_cycle_end: atCycleEnd ? 1 : 0 },
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
  getBillingSupport,
  assertCheckoutConfigured,
  validateRazorpayPlan,
  createRazorpaySubscription,
  cancelRazorpaySubscription,
  verifyCheckoutSignature,
  verifyWebhookSignature,
  hashWebhookPayload,
};
