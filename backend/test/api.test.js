const test = require('node:test');
const assert = require('node:assert/strict');
process.env.EV_API_KEY = '';
process.env.EV_LIVE_WEB_ENABLED = 'false';
process.env.MISTRAL_API_KEY = '';
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

test('Explorer accepts padded brands and rejects malformed query values', async () => {
  await withServer(async base => {
    for (const make of ['BMW ', 'Tesla ']) {
      const response = await fetch(`${base}/api/ev/search?make=${encodeURIComponent(make)}`);
      const body = await response.json();
      assert.equal(body.success, true);
      assert.ok(body.count >= 4);
      assert.equal(body.provider.status, 'not-configured');
    }
    assert.equal((await fetch(`${base}/api/ev/search?make[]=BMW`)).status, 400);
    assert.equal((await fetch(`${base}/api/ev/search?make=%20`)).status, 400);
  });
});

test('chat and Python context endpoints answer Ather without MongoDB or AI keys', async () => {
  await withServer(async base => {
    for (const route of ['/api/chat', '/api/ev/context']) {
      const response = await fetch(`${base}${route}`, { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'give data of ather' }) });
      const body = await response.json();
      assert.equal(response.status, 200);
      assert.match(body.response || body.context, /450X/);
      assert.ok(body.sources.some(s => s.includes('atherenergy')));
    }
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

test('chat serves the requested list and scoped follow-up through the public API', async () => {
  await withServer(async base => {
    const first = 'Give me 20 list of both two vehicles and four vehicles';
    for (const [message, history, count] of [[first, [], 20],
      ['which 2 vehicle are availbe from this companies ?', [{ role: 'user', content: first }], 8]]) {
      const response = await fetch(`${base}/api/chat`, { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, history }) });
      const body = await response.json();
      assert.equal(response.status, 200);
      assert.equal((body.response.match(/^\d+\. /gm) || []).length, count);
      assert.equal(body.mode, 'catalog');
      assert.equal(body.notice, '');
    }
  });
});

test('reported general questions return relevant answers through both API and context routes', async () => {
  await withServer(async base => {
    const history = [];
    for (const [message, expected] of [
      ['Fast charging ke baare mein batao', /DC charger/],
      ['which evehicle has best battery among all two wheelers vehicle', /Ola/],
      ['hy', /Hi!/],
      ['how i purchase ev', /written on-road quote/],
      ['which is best car ev in temrs of price and battery', /Tata/],
    ]) {
      const response = await fetch(`${base}/api/chat`, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({message, history}) });
      const result = await response.json();
      assert.equal(response.status, 200);
      assert.match(result.response, expected);
      assert.doesNotMatch(result.response, /General AI answers require|EVs use model-specific/);
      history.push({role:'user',content:message});
    }
    const context = await fetch(`${base}/api/ev/context`, {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:'hy'})});
    assert.match((await context.json()).advice_answer, /Hi!/);
  });
});
