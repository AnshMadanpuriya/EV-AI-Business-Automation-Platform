const axios = require('axios');
const jwt = require('jsonwebtoken');
const fs = require('node:fs');
const HEADERS = ['Booking ID', 'Source', 'Name', 'Phone', 'Email', 'Vehicle', 'Booking Type', 'Date', 'Time (Asia/Kolkata)', 'Mode', 'Address', 'City', 'PIN Code', 'Status', 'Created At', 'Updated At'];
let tokenCache;
function configuration() {
  return { spreadsheetId: process.env.BOOKING_SHEET_ID || '', tab: process.env.BOOKING_SHEET_TAB || 'Bookings', credentialsPath: process.env.GOOGLE_SERVICE_ACCOUNT_FILE || '' };
}
function configured() { const c = configuration(); return Boolean(c.spreadsheetId && c.credentialsPath); }
function bookingRow(b) {
  return [b.bookingCode, b.source || 'website', b.name, b.phone, b.email, b.vehicle, b.type,
    new Date(b.date).toISOString().slice(0, 10), b.timeSlot, b.testDriveMode, b.address, b.city, b.pincode, b.status,
    new Date(b.createdAt).toISOString(), new Date(b.updatedAt).toISOString()].map(v => String(v ?? ''));
}
async function accessToken(credentialsPath) {
  if (tokenCache?.path === credentialsPath && tokenCache.expires > Date.now()) return tokenCache.token;
  const credentials = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));
  if (credentials.type !== 'service_account' || !credentials.client_email || !credentials.private_key) throw new Error('Invalid service account file');
  const assertion = jwt.sign({ scope: 'https://www.googleapis.com/auth/spreadsheets' }, credentials.private_key,
    { algorithm: 'RS256', issuer: credentials.client_email, audience: 'https://oauth2.googleapis.com/token', expiresIn: '1h' });
  const response = await axios.post('https://oauth2.googleapis.com/token', new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion }).toString(),
    { headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, timeout: 10000, maxRedirects: 0 });
  if (!response.data.access_token) throw new Error('No Google access token');
  tokenCache = { path: credentialsPath, token: response.data.access_token, expires: Date.now() + 50 * 60 * 1000 };
  return tokenCache.token;
}
// Called only by the serialized worker. RAW keeps customer text from becoming a spreadsheet formula.
async function writeBooking(b, { token, request = axios.request, config = configuration() } = {}) {
  if (!/^[A-Za-z0-9_-]+$/.test(config.spreadsheetId)) throw new Error('Invalid spreadsheet ID');
  const auth = token || await accessToken(config.credentialsPath);
  const root = `https://sheets.googleapis.com/v4/spreadsheets/${config.spreadsheetId}/values/`;
  const range = suffix => encodeURIComponent(`'${config.tab.replace(/'/g, "''")}'!${suffix}`);
  const call = async (method, suffix, data, query = '') => {
    const response = await request({ method, url: root + range(suffix) + query, data,
      headers: { Authorization: `Bearer ${auth}` }, timeout: 10000, maxRedirects: 0, maxContentLength: 5_000_000 });
    return response.data;
  };
  const header = (await call('GET', 'A1:P1')).values?.[0] || [];
  if (!header.length) await call('PUT', 'A1:P1', { values: [HEADERS] }, '?valueInputOption=RAW');
  else if (JSON.stringify(header) !== JSON.stringify(HEADERS)) throw new Error('Sheet headers differ; use a dedicated empty Bookings tab');
  const ids = (await call('GET', 'A2:A')).values || [];
  const found = ids.findIndex(row => row[0] === b.bookingCode);
  const values = [bookingRow(b)];
  if (found >= 0) await call('PUT', `A${found + 2}:P${found + 2}`, { values }, '?valueInputOption=RAW');
  else await call('POST', 'A:P', { values }, ':append?valueInputOption=RAW&insertDataOption=INSERT_ROWS');
  return { spreadsheetId: config.spreadsheetId, tab: config.tab };
}
module.exports = { HEADERS, bookingRow, writeBooking, configured };
