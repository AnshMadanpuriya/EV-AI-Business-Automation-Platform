const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
process.env.JWT_SECRET = 'fixture-registration-secret-not-for-deployment';
const { app } = require('../server');
const User = require('../models/User');
const Subscription = require('../models/Subscription');
const { enableSignup } = require('../scripts/enableSignup');

async function setup(t, registration) {
  const flag = process.env.ALLOW_PUBLIC_REGISTRATION;
  if (registration === undefined) delete process.env.ALLOW_PUBLIC_REGISTRATION;
  else process.env.ALLOW_PUBLIC_REGISTRATION = registration;
  const descriptor = Object.getOwnPropertyDescriptor(mongoose.connection, 'readyState');
  Object.defineProperty(mongoose.connection, 'readyState', { configurable: true, value: 1 });
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  t.after(async () => {
    await new Promise(resolve => server.close(resolve));
    if (descriptor) Object.defineProperty(mongoose.connection, 'readyState', descriptor);
    else delete mongoose.connection.readyState;
    if (flag === undefined) delete process.env.ALLOW_PUBLIC_REGISTRATION;
    else process.env.ALLOW_PUBLIC_REGISTRATION = flag;
  });
  return `http://127.0.0.1:${server.address().port}`;
}
const payload = { name: 'Test Customer', email: 'customer@example.com', password: 'test-password-123', phone: '+12025550123', company: 'Test EV' };
const post = (base, body = payload) => fetch(`${base}/api/auth/register`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

test('signup enabled by default saves phone and ignores requested admin privileges', async t => {
  const base = await setup(t);
  t.mock.method(User, 'findOne', async () => null);
  t.mock.method(User, 'countDocuments', async () => { throw new Error('First-account admin logic must not run'); });
  let saved;
  t.mock.method(User, 'create', async values => { saved = values; return new User(values); });
  const response = await post(base, { ...payload, role: 'admin', isActive: false });
  const body = await response.json();
  assert.equal(response.status, 201);
  assert.equal(saved.role, 'user');
  assert.equal(saved.phone, payload.phone);
  assert.equal(body.user.role, 'user');
  assert.equal(body.user.password, undefined);
  assert.ok(jwt.verify(body.token, process.env.JWT_SECRET).userId);
});

test('explicit false closes registration before any account can be created', async t => {
  const base = await setup(t, 'false');
  const create = t.mock.method(User, 'create', async () => { throw new Error('Must not create'); });
  const response = await post(base);
  assert.equal(response.status, 403);
  assert.equal((await response.json()).code, 'REGISTRATION_CLOSED');
  assert.equal(create.mock.callCount(), 0);
});

test('explicit true handles duplicate races with a useful response', async t => {
  const base = await setup(t, 'true');
  t.mock.method(User, 'findOne', async () => null);
  t.mock.method(User, 'create', async () => { throw Object.assign(new Error('duplicate'), { code: 11000 }); });
  const response = await post(base);
  assert.equal(response.status, 409);
  assert.match((await response.json()).message, /sign in/);
});

test('invalid and excessive UTF-8 passwords fail validation without storage calls', async t => {
  const base = await setup(t, 'true');
  for (const password of [123456789, 'short', '🔒'.repeat(20)]) {
    assert.equal((await post(base, { ...payload, password })).status, 400);
  }
});

test('public customer is blocked from every staff read endpoint but can read own billing', async t => {
  const base = await setup(t, 'true');
  const customer = new User(payload);
  t.mock.method(User, 'findById', async () => customer);
  const headers = { Authorization: `Bearer ${jwt.sign({ userId: customer._id }, process.env.JWT_SECRET)}` };
  for (const route of ['/auth/users', '/enquiry', '/bookings', '/leads', '/leads/000000000000000000000001',
    '/analytics/dashboard', '/analytics/owner', '/chat/sessions', '/chat/session/example']) {
    assert.equal((await fetch(`${base}/api${route}`, { headers })).status, 403, route);
  }
  t.mock.method(Subscription, 'findOne', query => {
    assert.equal(String(query.user), String(customer._id));
    return { sort: async () => null };
  });
  assert.equal((await fetch(`${base}/api/payments/subscription`, { headers })).status, 200);
  assert.equal((await fetch(`${base}/api/auth/me`, { headers })).status, 200);
});

test('enable command preserves unrelated values and is idempotent', () => {
  const old = 'MONGODB_URI=fixture-db\r\nALLOW_PUBLIC_REGISTRATION=false\r\nJWT_SECRET=fixture-only\r\n';
  const changed = enableSignup(old);
  assert.ok(changed.includes('ALLOW_PUBLIC_REGISTRATION=true'));
  assert.ok(changed.includes('MONGODB_URI=fixture-db'));
  assert.ok(changed.includes('JWT_SECRET=fixture-only'));
  assert.equal(enableSignup(changed), changed);
  assert.equal(enableSignup('PORT=5000'), 'PORT=5000\nALLOW_PUBLIC_REGISTRATION=true\n');
});
