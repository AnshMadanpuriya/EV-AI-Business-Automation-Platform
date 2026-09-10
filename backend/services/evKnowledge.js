const catalog = require('../../shared/ev-catalog.json');
const { resolveList, listAnswer, priceLine, contextFor } = require('./evConversation');
const { adviceKnowledge } = require('./evAdvice');
const fastRules = require('../../shared/ev-fast-answer.json');

const normalize = (value) => String(value || '').normalize('NFKD').replace(/\p{M}/gu, '').toLowerCase()
  .replace(/[^\p{L}\p{N}]+/gu, ' ').trim().replace(/\s+/g, ' ');
const contains = (text, phrase) => (` ${normalize(text)} `).includes(` ${normalize(phrase)} `);
const cache = new Map();
const pending = new Map();
const API_URL = 'https://api.api-ninjas.com/v1/electricvehicle';
const safeFields = ['make', 'model', 'year_start', 'battery_capacity', 'battery_type',
  'battery_useable_capacity', 'charge_power', 'charge_power_max', 'charge_speed',
  'acceleration_0_100_kmh', 'top_speed', 'electric_range', 'total_power', 'total_torque',
  'drive', 'vehicle_consumption', 'co2_emissions', 'length', 'width', 'height',
  'seats', 'cargo_volume', 'car_body', 'segment'];

function canonicalMake(make) {
  const n = normalize(make);
  return catalog.brands.find(b => [b.make, ...b.aliases].some(a => normalize(a) === n))?.make || n;
}

function searchCatalog(make = '', model = '') {
  const m = normalize(canonicalMake(make));
  const query = normalize(model);
  return catalog.vehicles.filter(v => (!m || normalize(v.make) === m)
    && (!query || contains(`${v.make} ${v.model}`, query)
      || normalize(v.model).includes(query) || (v.model_aliases || []).some(a => contains(a, query))));
}

function identifyVehicles(question, history = []) {
  const text = normalize(question);
  let brands = catalog.brands.filter(b => [b.make, ...b.aliases].some(a => contains(text, a)));
  // Match complete tokens, including short model names only when their brand is explicit.
  // Prefer a longer variant name over its contained family name (iQube ST vs iQube).
  const candidates = catalog.vehicles.map(v => {
    const aliases = [v.model, ...(v.model_aliases || []), v.model.replace(/\b(electric|ev)\b/gi, '').trim()];
    const spans = aliases.map(normalize).filter(a => a && contains(text, a)
      && ((a.length >= 3 && !['one','air','eva','crossover'].includes(a)) || brands.some(b => b.make === v.make)));
    return { v, spans };
  }).filter(c => c.spans.length && (!brands.length || brands.some(b => b.make === c.v.make)));
  let vehicles = candidates.filter(c => !candidates.some(other => other.v.make === c.v.make && other !== c
    && c.spans.every(span => other.spans.some(long => long !== span && contains(long, span))))).map(c => c.v);
  const followupWords = new Set('and aur what about is the it its this that iski uski iska uska price cost range charging battery kitna kitni hai kya batao please tell me'.split(' '));
  if (!brands.length && !vehicles.length && text.split(' ').every(w => followupWords.has(w))
    && /\b(price|cost|range|charging|battery)\b/i.test(text)) {
    const previous = [...(Array.isArray(history) ? history : [])].reverse().find(h => h.role === 'user');
    if (previous) return identifyVehicles(previous.content);
  }
  if (!vehicles.length && brands.length) vehicles = catalog.vehicles.filter(v => brands.some(b => b.make === v.make));
  if (!brands.length) brands = catalog.brands.filter(b => vehicles.some(v => v.make === b.make));
  return { brands, vehicles };
}

async function cached(key, run) {
  const hit = cache.get(key);
  if (hit && hit.expires > Date.now()) return { ...hit.value, cached: true };
  if (pending.has(key)) return pending.get(key);
  const task = (async () => {
    const value = await run();
    if (cache.size >= 120) cache.delete(cache.keys().next().value);
    cache.set(key, { value, expires: Date.now() + (value.status === 'ok' ? 15 * 60_000 : 30_000) });
    return value;
  })();
  pending.set(key, task);
  try { return await task; } finally { pending.delete(key); }
}

async function readLimited(response, limit = 600_000) {
  if (Number(response.headers.get('content-length')) > limit) throw new Error('Response too large');
  const reader = response.body.getReader();
  const chunks = []; let size = 0;
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > limit) throw new Error('Response too large');
      chunks.push(Buffer.from(value));
    }
  } finally { await reader.cancel().catch(() => {}); }
  return Buffer.concat(chunks).toString('utf8');
}

async function providerSearch(make, model) {
  const key = process.env.EV_API_KEY;
  if (!key || /replace|your.*key/i.test(key)) return { status: 'not-configured', vehicles: [] };
  return cached(`api:${normalize(make)}:${normalize(model)}`, async () => {
    const params = new URLSearchParams();
    if (make) params.set('make', canonicalMake(make));
    if (model) params.set('model', model.trim());
    // API Ninjas' limit/offset and several specifications need a premium plan.
    // Do not add premium parameters to a customer's free-key request.
    try {
      const response = await fetch(`${API_URL}?${params}`, {
        headers: { 'X-Api-Key': key }, signal: AbortSignal.timeout(4500), redirect: 'error',
      });
      if (!response.ok) return { status: [401, 403].includes(response.status) ? 'access-denied'
        : response.status === 429 ? 'rate-limited' : 'unavailable', vehicles: [] };
      const rows = JSON.parse(await readLimited(response));
      if (!Array.isArray(rows)) throw new Error('Invalid provider result');
      const retrievedAt = new Date().toISOString();
      const vehicles = rows.slice(0, 30).filter(v => v && typeof v.make === 'string' && typeof v.model === 'string')
        .filter(v => (!make || normalize(v.make) === normalize(canonicalMake(make)))
          && (!model || normalize(v.model).includes(normalize(model))))
        .map(v => ({ ...Object.fromEntries(safeFields.filter(f => ['string', 'number'].includes(typeof v[f]))
          .map(f => [f, String(v[f]).slice(0, 200)])), source: 'api-ninjas',
        source_url: 'https://api-ninjas.com/api/electricvehicle', retrieved_at: retrievedAt,
        data_note: 'Fetched from API Ninjas. Model year/market may differ; not a live price or inventory quote.' }));
      return { status: vehicles.length ? 'ok' : 'empty', vehicles, retrieved_at: retrievedAt };
    } catch { return { status: 'unavailable', vehicles: [] }; }
  });
}

function providerNotice(status) {
  return ({ 'not-configured': 'Showing reference catalog. Live vehicle API is not configured.',
    'access-denied': 'Live provider access was denied. Showing reference catalog where available.',
    'rate-limited': 'Live provider limit reached. Showing reference catalog where available.',
    unavailable: 'Live provider is temporarily unavailable. Showing reference catalog where available.',
    empty: 'No additional match from the live provider. Catalog coverage is not exhaustive.',
    ok: 'Provider data fetched; reference entries are labeled separately. Confirm market, variant and price.' })[status];
}

async function searchVehicles(make = '', model = '') {
  const local = searchCatalog(make, model);
  const live = await providerSearch(make, model);
  // Keep records separate across variants/year; never mix two configurations' specifications.
  const vehicles = [...live.vehicles];
  for (const v of local) if (!vehicles.some(r => normalize(r.make) === normalize(v.make)
    && normalize(r.model) === normalize(v.model) && String(r.year_start || '') === String(v.year_start || ''))) vehicles.push(v);
  return { vehicles, count: vehicles.length, source: live.vehicles.length ? 'provider-and-catalog' : 'reference-catalog',
    provider: { status: live.status, cached: Boolean(live.cached), retrieved_at: live.retrieved_at || null },
    notice: providerNotice(live.status), exhaustive: false };
}

function htmlText(html) {
  return html.replace(/<(nav|header|footer)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, ' ')
    .replace(/<(script|style|svg|noscript)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, ' ')
    .replace(/<[^>]*>/g, '\n').replace(/&nbsp;|&#160;/g, ' ').replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/[ \t]+/g, ' ')
    .split('\n').map(s => s.trim()).filter(Boolean).join('\n');
}

async function officialPage(brand) {
  if (!brand.source_url || process.env.EV_LIVE_WEB_ENABLED === 'false') return { status: 'disabled' };
  // URL comes only from the checked-in model/brand allowlist. User URLs and redirects are never fetched.
  return cached(`web:${brand.source_url}:${normalize(brand.model || brand.make)}`, async () => {
    try {
      const response = await fetch(brand.source_url, { redirect: 'error', signal: AbortSignal.timeout(4500),
        headers: { Accept: 'text/html', 'User-Agent': 'EVKnowledgeBot/1.0' } });
      if (!response.ok || !/text\/html/i.test(response.headers.get('content-type') || '')) throw new Error('No readable page');
      const text = htmlText(await readLimited(response, 1_500_000));
      if (brand.model && ![brand.model, ...(brand.model_aliases || []), brand.model.replace(/\b(electric|ev)\b/gi, '').trim()]
        .some(name => contains(text, name))) throw new Error('Model not found on official page');
      const lines = text.split('\n');
      const matching = new Set();
      lines.forEach((line, i) => {
        if (/range|battery|charging|kwh|\bkm\b|price|₹|450|rizta|model y|ix1/i.test(line)) {
          for (let n = Math.max(0, i - 1); n <= Math.min(lines.length - 1, i + 2); n++) matching.add(n);
        }
      });
      const excerpt = [...matching].sort((a, b) => a - b).map(i => lines[i]).join('\n').slice(0, 5000);
      if (excerpt.length < 80 || /captcha|verify you are human|access denied/i.test(text.slice(0, 500))) throw new Error('No useful source');
      return { status: 'ok', source_url: brand.source_url, excerpt, retrieved_at: new Date().toISOString() };
    } catch { return { status: 'unavailable', source_url: brand.source_url }; }
  });
}

function canAnswerFromCatalog(question, matches) {
  if (/^(hi|hello|hey|namaste)[!?.\s]*$/i.test(question.trim())) return true;
  if (!matches.vehicles.length) return false;
  if (matches.vehicles.every(v => v.model_status === 'unverified-name')) return true;
  if (matches.vehicles.some(v => v.knowledge_status === 'source-linked' && !v.battery_capacity && !v.electric_range)) return false;
  let remaining = ` ${normalize(question)} `;
  const names = [...matches.brands.flatMap(b => [b.make, ...b.aliases]),
    ...matches.vehicles.flatMap(v => [...(v.model_aliases || []), v.model, v.model.replace(/\b(EV|Electric)\b/gi, '').trim()])];
  if (matches.vehicles.some(v => v.model === 'iX1 LWB')) names.push('iX1');
  if (matches.vehicles.some(v => v.make === 'Tesla' && v.model.startsWith('Model Y'))) names.push('Model Y');
  for (const name of names.sort((a, b) => b.length - a.length)) remaining = remaining.split(` ${normalize(name)} `).join(' ');
  const allowed = new Set(fastRules.words.split(' '));
  if (!remaining.trim().split(/\s+/).filter(Boolean).every(word => allowed.has(word))) return false;
  return Object.entries(fastRules.fields).every(([word, field]) => !contains(question, word)
    || matches.vehicles.every(v => v[field]));
}

async function retrieveKnowledge(question, history = [], { referenceOnly = false, catalogContext = null } = {}) {
  const listing = resolveList(question, history, identifyVehicles, catalogContext);
  if (listing) return { ...listing, context: JSON.stringify({ policy: catalog.notice, ...listing }),
    brands: [...new Set(listing.vehicles.map(v => v.make.toLowerCase()))],
    sources: [...new Set(listing.vehicles.flatMap(v => [v.source_url, v.price_reference?.source_url]).filter(Boolean))], pages: [], mode: 'catalog', notice: '' };
  const advice = adviceKnowledge(question, history, identifyVehicles);
  if (advice) return advice;
  const matches = identifyVehicles(question, history);
  if (referenceOnly || canAnswerFromCatalog(question, matches)) {
    const vehicles = matches.vehicles;
    return { context: JSON.stringify({ policy: catalog.notice, vehicles }), vehicles, pages: [],
      brands: matches.brands.map(b => b.make.toLowerCase()), fast_answer: true, mode: 'catalog',
      sources: [...new Set(vehicles.flatMap(v => [v.source_url, v.price_reference?.source_url]).filter(Boolean))],
      notice: vehicles.length ? 'Reference catalog; confirm current prices and availability with the dealer.' : '' };
  }
  const lookups = matches.brands.slice(0, 2).map(async brand => {
    const selected = matches.vehicles.filter(v => v.make === brand.make);
    const model = selected.length === 1 ? selected[0].model : '';
    const [search, web] = await Promise.all([searchVehicles(brand.make, model), officialPage(selected.length === 1 ? selected[0] : brand)]);
    return { search, web };
  });
  const responses = await Promise.all(lookups);
  const selected = matches.vehicles.length ? matches.vehicles : catalog.vehicles.slice(0, 0);
  const providerRows = responses.flatMap(r => r.search.vehicles.filter(v => v.source === 'api-ninjas'));
  const vehicles = [...providerRows, ...selected].slice(0, 18);
  const pages = responses.map(r => r.web).filter(p => p.status === 'ok');
  const sources = [...new Set([...vehicles.flatMap(v => [v.source_url, v.price_reference?.source_url]), ...pages.map(p => p.source_url)].filter(Boolean))];
  const context = JSON.stringify({ policy: catalog.notice, vehicles,
    live_pages: pages, live_status: responses.map(r => ({ provider: r.search.provider, web: r.web.status })) });
  return { context, sources, vehicles, pages, brands: matches.brands.map(b => b.make.toLowerCase()), mode: pages.length || providerRows.length ? 'live-retrieval' : 'catalog',
    notice: pages.length ? 'Official page excerpts retrieved; check the cited variant and region.'
      : vehicles.length ? 'Reference catalog; confirm the variant and current dealer quote.' : '' };
}

function localAnswer(question, knowledge) {
  if (knowledge.advice_answer) return knowledge.advice_answer;
  if (knowledge.intent?.kind === 'list') return listAnswer(question, knowledge);
  const vehicles = knowledge.vehicles || [];
  const current = /price|cost|on road|latest|current|today|aaj|abhi|subsid/i.test(question);
  if (vehicles.length) {
    const lines = [current ? '**EV price references:**' : '**EV model overview:**'];
    for (const v of vehicles.slice(0, 18)) {
      lines.push(`### ${v.make} ${v.model}`, v.description || '');
      if (v.model_status && v.model_status !== 'reference') lines.push(`- Status: ${v.model_status.replace(/-/g, ' ')}. ${v.data_note || ''}`);
      lines.push(`- Market: ${v.market || 'confirm region'}`);
      if (current || v.price_reference) lines.push(`- ${priceLine(v)}`);
      if (v.pricing_note && current) lines.push(`- ${v.pricing_note}`);
      for (const [field, label] of [['electric_range','Range'],['battery_capacity','Battery'],['battery_type','Battery chemistry'],['charge_power_max','Peak charging'],['charging_time','Charging time'],['top_speed','Top speed']]) {
        if (v[field]) lines.push(`- ${label}: ${v[field]}`);
      }
      if (!v.electric_range || !v.battery_capacity) lines.push('- This model is recognized; missing specifications need confirmation for its exact variant and model year.');
      if (v.verified_at) lines.push(`- Reference checked: ${v.verified_at}`);
      if (v.source_url) lines.push(`[Manufacturer source](${v.source_url})`);
    }
    lines.push('', 'Reference specifications and advertised prices; model year, market and test cycle can differ. Exact current on-road price is not confirmed here.');
    if (knowledge.pages?.length) lines.push('An official page was retrieved. Its current details require variant-specific interpretation; open the manufacturer link for details not in the reference above.');
    lines.push(current ? 'Which city and variant do you want a quote for?' : 'Which model would you like to compare or explore?');
    return lines.join('\n');
  }
  if (/^(hi|hello|hey|namaste)\b/i.test(question)) return 'Namaste! Ask about an EV brand or model, for example “give data of Ather”, “BMW iX1 range” or “Tesla Model Y charging”.';

  if (/test.?drive|book/i.test(question)) return 'Select a vehicle in Explore Electric Vehicles and choose Book Test Drive. The team will confirm the requested appointment.';
  if (/list|brands|models|vehicles/i.test(question)) return `Catalog brands: ${catalog.brands.map(b => b.make).join(', ')}. Which brand should I show?`;
  return 'I do not have a confirmed source for that question yet. Share the EV brand/model and the detail you need; current prices also need your city. I can help with buying steps, charging basics, or a comparison once I know what you need.';
}

module.exports = { catalog, normalize, canonicalMake, searchCatalog, identifyVehicles, searchVehicles, canAnswerFromCatalog,
  retrieveKnowledge, localAnswer, contextFor, htmlText, readLimited, clearCache: () => { cache.clear(); pending.clear(); } };
