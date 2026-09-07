const test = require('node:test');
const assert = require('node:assert/strict');
const { app } = require('../server');

async function withServer(run) {
  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  const { port } = server.address();
  try {
    await run(`http://127.0.0.1:${port}`);
  } finally {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
}

test('health endpoint works without MongoDB and exposes safe service state', async () => {
  await withServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/health`);
    const body = await response.json();
    assert.equal(response.status, 200);
    assert.equal(body.success, true);
    assert.equal(body.database, 'Disconnected');
    assert.equal(typeof body.requestId, 'string');
    assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
  });
});

test('database-backed routes fail fast with an actionable 503', async () => {
  await withServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/leads`, { headers: { Authorization: 'Bearer invalid' } });
    const body = await response.json();
    assert.equal(response.status, 503);
    assert.match(body.message, /Database is not connected/i);
  });
});

test('public billing catalog works without MongoDB and contains all three tiers', async () => {
  await withServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/payments/plans`);
    const body = await response.json();
    assert.equal(response.status, 200);
    assert.equal(body.plans.length, 6);
    assert.equal(body.plans.find(plan => plan.code === 'starter_monthly').amountPaise, 49900);
    assert.equal(body.plans.find(plan => plan.code === 'growth_monthly').amountPaise, 100000);
    assert.equal(body.plans.find(plan => plan.code === 'enterprise_monthly').amountPaise, 249900);
    assert.equal(JSON.stringify(body).includes('keySecret'), false);
    assert.equal(JSON.stringify(body).includes('razorpayPlanId'), false);
  });
});
