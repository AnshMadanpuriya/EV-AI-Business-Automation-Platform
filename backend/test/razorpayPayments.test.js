const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');

const {
  getPlanDefinition,
  getPublicPlans,
  verifyCheckoutSignature,
  verifyWebhookSignature,
} = require('../services/razorpayPayments');

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

test('public plan catalog never exposes env variable names or provider plan IDs', () => {
  process.env.RAZORPAY_PLAN_STARTER_MONTHLY = 'plan_test123';
  const publicPlan = getPublicPlans().find((plan) => plan.code === 'starter_monthly');
  const internalPlan = getPlanDefinition('starter_monthly');

  assert.equal(publicPlan.configured, true);
  assert.equal(publicPlan.amountPaise, 499900);
  assert.equal('razorpayPlanId' in publicPlan, false);
  assert.equal('razorpayPlanEnv' in publicPlan, false);
  assert.equal(internalPlan.razorpayPlanId, 'plan_test123');

  delete process.env.RAZORPAY_PLAN_STARTER_MONTHLY;
});
