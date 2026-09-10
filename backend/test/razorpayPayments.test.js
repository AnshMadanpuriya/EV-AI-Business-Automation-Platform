const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');

const {
  getPlanDefinition,
  getPublicPlans,
  verifyCheckoutSignature,
  verifyWebhookSignature,
  getRazorpayConfiguration,
  getBillingSupport,
  createRazorpaySubscription,
  cancelRazorpaySubscription,
} = require('../services/razorpayPayments');

function configureTestBilling(t, overrides = {}) {
  const values = {
    RAZORPAY_MODE: 'test',
    RAZORPAY_KEY_ID: 'rzp_test_abc123',
    RAZORPAY_KEY_SECRET: 'unit-test-api-secret',
    RAZORPAY_WEBHOOK_SECRET: 'unit-test-webhook-secret-with-32-characters',
    RAZORPAY_PLAN_STARTER_MONTHLY: 'plan_starter123',
    ...overrides,
  };
  const before = Object.fromEntries(Object.keys(values).map(key => [key, process.env[key]]));
  Object.assign(process.env, values);
  t.after(() => Object.entries(before).forEach(([key, value]) => {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }));
}

function providerResponse(data) {
  return { ok: true, text: async () => JSON.stringify(data) };
}

test('checkout verification accepts a valid subscription signature', () => {
  const secret = 'test_checkout_secret';
  const paymentId = 'pay_test123456';
  const subscriptionId = 'sub_test123456';
  const signature = crypto
    .createHmac('sha256', secret)
    .update(`${paymentId}|${subscriptionId}`)
    .digest('hex');

  assert.equal(verifyCheckoutSignature({
    paymentId,
    subscriptionId,
    signature,
    secret,
  }), true);
});

test('checkout verification rejects a modified signature', () => {
  assert.equal(verifyCheckoutSignature({
    paymentId: 'pay_test123456',
    subscriptionId: 'sub_test123456',
    signature: '0'.repeat(64),
    secret: 'test_checkout_secret',
  }), false);
});

test('webhook verification uses the raw request body', () => {
  const secret = 'test_webhook_secret';
  const rawBody = Buffer.from('{"event":"subscription.activated","value":1}');
  const signature = crypto
    .createHmac('sha256', secret)
    .update(rawBody)
    .digest('hex');

  assert.equal(verifyWebhookSignature({ rawBody, signature, secret }), true);
  assert.equal(verifyWebhookSignature({
    rawBody: Buffer.from('{"value":1,"event":"subscription.activated"}'),
    signature,
    secret,
  }), false);
});

test('public plan catalog never exposes env variable names or provider plan IDs', (t) => {
  configureTestBilling(t);
  const publicPlan = getPublicPlans().find((plan) => plan.code === 'starter_monthly');
  const internalPlan = getPlanDefinition('starter_monthly');

  assert.equal(publicPlan.configured, true);
  assert.equal(publicPlan.amountPaise, 49900);
  assert.equal('razorpayPlanId' in publicPlan, false);
  assert.equal('razorpayPlanEnv' in publicPlan, false);
  assert.equal(internalPlan.razorpayPlanId, 'plan_starter123');
});

test('new monthly prices and annual 20% totals use integer paise', () => {
  for (const [tier, monthly] of [['starter', 49900], ['growth', 100000], ['enterprise', 249900]]) {
    assert.equal(getPlanDefinition(`${tier}_monthly`).amountPaise, monthly);
    assert.equal(getPlanDefinition(`${tier}_annual`).amountPaise, monthly * 12 * 80 / 100);
    assert.ok(Number.isInteger(getPlanDefinition(`${tier}_annual`).amountPaise));
  }
  assert.equal(getPlanDefinition('__proto__'), null);
  assert.equal(getPlanDefinition('constructor'), null);
  assert.equal(getPlanDefinition({ code: 'starter_monthly' }), null);
});

test('missing webhook secret or wrong-mode key cannot enable checkout', async (t) => {
  configureTestBilling(t, { RAZORPAY_WEBHOOK_SECRET: '' });
  const network = t.mock.method(global, 'fetch', async () => { throw new Error('Must not request a payment'); });
  assert.equal(getRazorpayConfiguration().checkoutConfigured, false);
  assert.equal(getPublicPlans()[0].configured, false);
  await assert.rejects(createRazorpaySubscription(getPlanDefinition('starter_monthly'), 'user1'));
  process.env.RAZORPAY_WEBHOOK_SECRET = 'a'.repeat(32);
  process.env.RAZORPAY_KEY_ID = 'rzp_live_abc123';
  assert.equal(getRazorpayConfiguration().checkoutConfigured, false);
  await assert.rejects(createRazorpaySubscription(getPlanDefinition('starter_monthly'), 'user1'));
  assert.equal(network.mock.callCount(), 0);
});

test('copied example credentials and plan placeholders stay disabled', (t) => {
  configureTestBilling(t, { RAZORPAY_KEY_ID: 'rzp_test_replace_me' });
  assert.equal(getPublicPlans()[0].configured, false);
  process.env.RAZORPAY_KEY_ID = 'rzp_test_abc123';
  process.env.RAZORPAY_PLAN_STARTER_MONTHLY = 'plan_replace_me';
  assert.equal(getPublicPlans()[0].configured, false);
});

test('billing support phone is not a receiving VPA or payer identity', (t) => {
  configureTestBilling(t, { PAYMENT_SUPPORT_PHONE: '' });
  assert.deepEqual(getBillingSupport(), { phone: '' });
  process.env.PAYMENT_SUPPORT_PHONE = '12025550123';
  assert.deepEqual(getBillingSupport(), { phone: '+12025550123' });
  process.env.PAYMENT_SUPPORT_PHONE = 'not-a-phone';
  assert.deepEqual(getBillingSupport(), { phone: '' });
});

test('old price, wrong currency or wrong interval never creates a subscription', async (t) => {
  configureTestBilling(t);
  const correct = { id: 'plan_starter123', item: { amount: 49900, currency: 'INR' }, period: 'monthly', interval: 1 };
  for (const remote of [
    { ...correct, item: { amount: 499900, currency: 'INR' } },
    { ...correct, item: { amount: 49900, currency: 'USD' } },
    { ...correct, period: 'yearly' },
    { ...correct, interval: 2 },
    { ...correct, id: 'plan_different' },
  ]) {
    const methods = [];
    const mock = t.mock.method(global, 'fetch', async (url, options) => {
      methods.push(options.method);
      assert.equal(url, 'https://api.razorpay.com/v1/plans/plan_starter123');
      return providerResponse(remote);
    });
    await assert.rejects(createRazorpaySubscription(getPlanDefinition('starter_monthly'), 'user1'), error => error.statusCode === 503);
    assert.deepEqual(methods, ['GET']);
    mock.mock.restore();
  }
});

test('matching provider plan creates only the trusted plan and quantity', async (t) => {
  configureTestBilling(t);
  const requests = [];
  t.mock.method(global, 'fetch', async (url, options) => {
    requests.push({ url, method: options.method, body: options.body && JSON.parse(options.body) });
    return providerResponse(options.method === 'GET'
      ? { id: 'plan_starter123', item: { amount: 49900, currency: 'INR' }, period: 'monthly', interval: 1 }
      : { id: 'sub_new123', status: 'created' });
  });
  const subscription = await createRazorpaySubscription(getPlanDefinition('starter_monthly'), 'user1');
  assert.equal(subscription.id, 'sub_new123');
  assert.deepEqual(requests.map(request => request.method), ['GET', 'POST']);
  assert.equal(requests[1].body.plan_id, 'plan_starter123');
  assert.equal(requests[1].body.quantity, 1);
  assert.equal(requests[1].body.total_count, 12);
  assert.equal('amount' in requests[1].body, false);
});

test('an unfinished checkout can be cancelled without a current billing cycle', async (t) => {
  configureTestBilling(t);
  let sentBody;
  t.mock.method(global, 'fetch', async (url, options) => {
    sentBody = JSON.parse(options.body);
    return providerResponse({ id: 'sub_unfinished', status: 'cancelled' });
  });
  await cancelRazorpaySubscription('sub_unfinished', { atCycleEnd: false });
  assert.deepEqual(sentBody, { cancel_at_cycle_end: 0 });
});
