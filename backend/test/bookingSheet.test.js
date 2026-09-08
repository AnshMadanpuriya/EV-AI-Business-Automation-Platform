const test = require('node:test');
const assert = require('node:assert/strict');
const { writeBooking, bookingRow, HEADERS } = require('../services/bookingSheet');
const { voiceBookingAuth } = require('../middleware/voiceBooking');
const booking = { bookingCode: 'TEV-TEST', source: 'elevenlabs', name: '=IMPORTXML("x")', phone: '+919876543210', email: 'example@example.com', vehicle: 'Ather 450X', type: 'test-ride', date: '2030-01-01', timeSlot: '10:00', testDriveMode: 'home', address: 'Example street 10', city: 'Indore', pincode: '452001', status: 'pending', createdAt: new Date(), updatedAt: new Date() };
const config = { spreadsheetId: 'test_sheet', tab: 'Bookings' };

test('sheet stores both sources, phone and customer text as RAW values', async () => {
  const calls = [];
  const request = async options => {
    calls.push(options);
    return { data: options.method === 'GET' && decodeURIComponent(options.url).includes('A1:P1') ? { values: [HEADERS] } : {} };
  };
  await writeBooking(booking, { config, token: 'fixture', request });
  const append = calls.find(c => c.method === 'POST');
  assert.ok(append.url.includes('valueInputOption=RAW'));
  assert.equal(append.data.values[0][2], booking.name);
  assert.equal(append.data.values[0][1], 'elevenlabs');
  assert.equal(bookingRow({ ...booking, source: 'website' })[1], 'website');
  assert.equal(append.data.values[0].length, HEADERS.length);
});

test('a retry after an ambiguous append updates the existing booking row', async () => {
  let saved = false, appends = 0, updates = 0;
  const request = async options => {
    const url = decodeURIComponent(options.url);
    if (options.method === 'GET') return { data: { values: url.includes('A1:P1') ? [HEADERS] : saved ? [[booking.bookingCode]] : [] } };
    if (options.method === 'POST') { appends++; saved = true; throw new Error('Response lost after write'); }
    updates++;
    assert.ok(url.includes('A2:P2'));
    return { data: {} };
  };
  await assert.rejects(writeBooking(booking, { config, token: 'fixture', request }));
  await writeBooking(booking, { config, token: 'fixture', request });
  assert.equal(appends, 1);
  assert.equal(updates, 1);
});

test('unrelated sheet headers are rejected instead of overwritten', async () => {
  const request = async () => ({ data: { values: [['Private unrelated sheet']] } });
  await assert.rejects(writeBooking(booking, { config, token: 'fixture', request }), /headers differ/);
});

test('voice tool rejects missing/wrong secrets and derives a stable server-side key', t => {
  const old = process.env.ELEVENLABS_BOOKING_SECRET;
  process.env.ELEVENLABS_BOOKING_SECRET = 'a'.repeat(40);
  t.after(() => { if (old === undefined) delete process.env.ELEVENLABS_BOOKING_SECRET; else process.env.ELEVENLABS_BOOKING_SECRET = old; });
  const response = { status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; } };
  const request = { get: () => 'wrong', body: { conversationId: 'conv_example_123' } };
  voiceBookingAuth(request, response, () => assert.fail('Unauthorized'));
  assert.equal(response.code, 401);
  request.get = () => 'a'.repeat(40);
  voiceBookingAuth(request, response, () => {});
  assert.equal(request.bookingSource, 'elevenlabs');
  const first = request.bookingKey;
  voiceBookingAuth(request, response, () => {});
  assert.equal(request.bookingKey, first);
});
