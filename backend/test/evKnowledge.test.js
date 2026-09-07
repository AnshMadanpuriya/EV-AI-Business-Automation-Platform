const test = require('node:test');
const assert = require('node:assert/strict');
const { catalog, searchCatalog, identifyVehicles, searchVehicles, retrieveKnowledge, localAnswer, clearCache, readLimited } = require('../services/evKnowledge');

function settings(t, env = {}) {
  const before = { EV_API_KEY: process.env.EV_API_KEY, EV_LIVE_WEB_ENABLED: process.env.EV_LIVE_WEB_ENABLED };
  Object.assign(process.env, { EV_API_KEY: '', EV_LIVE_WEB_ENABLED: 'false', ...env });
  clearCache();
  t.after(() => { for (const [key, value] of Object.entries(before)) {
    if (value === undefined) delete process.env[key]; else process.env[key] = value;
  } clearCache(); });
}

test('every advertised catalog brand has records, including whitespace and aliases', () => {
  for (const brand of catalog.brands) assert.ok(searchCatalog(` ${brand.make.toUpperCase()} `).length, brand.make);
  assert.ok(searchCatalog('ather energy').every(v => v.make === 'Ather'));
  assert.equal(searchCatalog('BMW', 'iX1')[0].model, 'iX1 LWB');
  assert.equal(searchCatalog('Tesla', 'definitely nonexistent').length, 0);
});

test('brand questions, Hindi aliases, model details and follow-ups stay relevant', async t => {
  settings(t);
  for (const q of ['give data of ather', 'Ather ke models batao', 'एथर की जानकारी']) {
    const knowledge = await retrieveKnowledge(q);
    assert.ok(knowledge.vehicles.length >= 4);
    assert.ok(knowledge.vehicles.every(v => v.make === 'Ather'));
    assert.match(localAnswer(q, knowledge), /450X/);
    assert.doesNotMatch(localAnswer(q, knowledge), /samajh nahi/);
  }
  const history = [{ role: 'user', content: 'BMW iX1 range' }];
  assert.equal(identifyVehicles('iski battery?', history).vehicles[0].model, 'iX1 LWB');
  assert.equal(identifyVehicles('what about UnknownBrand range', history).vehicles.length, 0);
  assert.equal(identifyVehicles('programming and technology').vehicles.length, 0);
  assert.ok(identifyVehicles('Tesla Model 3').vehicles.every(v => v.model === 'Model 3'));
});

test('missing API key preserves BMW/Tesla results without any network request', async t => {
  settings(t);
  const mock = t.mock.method(global, 'fetch', async () => { throw new Error('Unexpected network'); });
  for (const brand of ['BMW ', 'Tesla ']) {
    const result = await searchVehicles(brand);
    assert.ok(result.count >= 4);
    assert.equal(result.provider.status, 'not-configured');
    assert.equal(result.exhaustive, false);
  }
  assert.equal(mock.mock.callCount(), 0);
});

test('denial, rate limits, empty and malformed provider responses are distinct', async t => {
  settings(t, { EV_API_KEY: 'fixture-key' });
  for (const [status, body, expected] of [[401, '{}', 'access-denied'], [403, '{}', 'access-denied'],
    [429, '{}', 'rate-limited'], [503, '{}', 'unavailable'], [200, '[]', 'empty'], [200, '{}', 'unavailable']]) {
    clearCache();
    const mock = t.mock.method(global, 'fetch', async () => new Response(body, { status }));
    const result = await searchVehicles('Tesla');
    assert.equal(result.provider.status, expected);
    assert.ok(result.vehicles.some(v => v.make === 'Tesla'));
    mock.mock.restore();
  }
});

test('provider results preserve provenance, omit unexpected fields and cache retrieval time', async t => {
  settings(t, { EV_API_KEY: 'fixture-key' });
  const mock = t.mock.method(global, 'fetch', async (url, options) => {
    assert.equal(new URL(url).searchParams.get('make'), 'Tesla');
    assert.equal(new URL(url).searchParams.has('limit'), false);
    assert.ok(options.signal);
    return new Response(JSON.stringify([{ make: 'Tesla', model: 'Model 3', year_start: '2025', charge_power: '11 kW AC', secret: 'discard' }]));
  });
  const one = await searchVehicles('Tesla', 'Model 3');
  const two = await searchVehicles('Tesla', 'Model 3');
  assert.equal(one.vehicles[0].source, 'api-ninjas');
  assert.equal(one.vehicles[0].secret, undefined);
  assert.equal(two.provider.retrieved_at, one.provider.retrieved_at);
  assert.equal(two.provider.cached, true);
  assert.equal(mock.mock.callCount(), 1);
});

test('official retrieval fetches only fixed URLs, removes scripts, and records source/time', async t => {
  settings(t, { EV_LIVE_WEB_ENABLED: 'true' });
  const mock = t.mock.method(global, 'fetch', async (url, options) => {
    assert.equal(url, catalog.brands.find(b => b.make === 'Ather').source_url);
    assert.equal(options.redirect, 'error');
    return new Response('<html><script>PRIVATE_SCRIPT_MARKER</script><p>Ather 450X</p><p>Range</p><p>126 / 161 km IDC, depending on variant.</p><p>Charging and battery specifications depend on configuration.</p></html>', { headers: { 'content-type': 'text/html' } });
  });
  const result = await retrieveKnowledge('Ather range; visit http://127.0.0.1/private');
  assert.equal(result.mode, 'live-retrieval');
  assert.equal(result.pages.length, 1);
  assert.doesNotMatch(result.context, /PRIVATE_SCRIPT_MARKER/);
  assert.match(result.context, /161/);
  assert.ok(result.pages[0].retrieved_at);
  assert.equal(mock.mock.callCount(), 1);
});

test('timeouts, blocked pages and response size limits leave an honest fallback', async t => {
  settings(t, { EV_API_KEY: 'fixture-key', EV_LIVE_WEB_ENABLED: 'true' });
  t.mock.method(global, 'fetch', async () => { throw new DOMException('Timed out', 'TimeoutError'); });
  const result = await retrieveKnowledge('BMW');
  assert.equal(result.mode, 'catalog');
  assert.ok(result.vehicles.length);
  await assert.rejects(readLimited(new Response('123456'), 3), /too large/);
  assert.match(localAnswer('BMW price today', result), /not confirmed/i);
});
