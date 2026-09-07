const catalog = require('../../shared/ev-catalog.json');

// Catalog questions are deterministic, so list length and category do not depend on an LLM/key.
function listIntent(question) {
  const text = String(question).toLowerCase().replace(/[-/]/g, ' ');
  const two = /\b(two|2)\s*(wheelers?|wheels?)\b|\btwo\s*vehicles?\b|\b(scooters?|bikes?)\b/.test(text)
    || (/\b2\s*vehicles?\b/.test(text) && /\b(both|which)\b/.test(text));
  const four = /\b(four|4)\s*(wheelers?|wheels?)\b|\bfour\s*vehicles?\b|\bcars?\b/.test(text)
    || (/\b4\s*vehicles?\b/.test(text) && /\b(both|which)\b/.test(text));
  let listing = /\b(list|models|options|which|what|show|give|all|available|availbe|kaun|konsi|batao)\b/.test(text)
    && (two || four || /\b(list|models|options|vehicles|evs)\b/.test(text));
  if (/range|battery|charg|fastest|best|highest|lowest|compare/.test(text) && !/\b(list|models|options)\b/.test(text)) listing = false;
  const countText = text.replace(/\b(two|four|2|4)\s*(wheelers?|wheels?)\b/g, '')
    .replace(/\b(two|four|2|4)\s*vehicles?\b/g, (s) => /\b(both|which)\b/.test(text) ? '' : s);
  const count = countText.match(/\b(\d{1,3})\b/);
  return { kind: listing ? 'list' : 'details', category: two && four ? 'both' : two ? 'two_wheeler' : four ? 'four_wheeler' : 'both',
    count: count ? Math.min(100, Math.max(1, Number(count[1]))) : null };
}

function resolveList(question, history, identify) {
  const intent = listIntent(question);
  const previous = [...(Array.isArray(history) ? history : [])].reverse().filter(h => h.role === 'user');
  const referring = /\b(these|those|this companies|same|above|their|them|their prices|inki|inke|in companies)\b/i.test(question);
  if (intent.kind !== 'list' && referring && /price|cost/i.test(question) && previous.length) {
    Object.assign(intent, listIntent(previous[0].content));
  }
  if (intent.kind !== 'list') return null;
  let matches = identify(question);
  if (!matches.brands.length && referring) {
    for (const item of previous) {
      matches = identify(item.content);
      if (matches.brands.length || listIntent(item.content).kind === 'list') break;
    }
  }
  const pool = (matches.brands.length ? catalog.vehicles.filter(v => matches.brands.some(b => b.make === v.make)) : catalog.vehicles)
    .filter(v => intent.category === 'both' || v.vehicle_type === intent.category);
  const limit = intent.count || 20;
  let vehicles;
  if (intent.category === 'both') {
    const two = pool.filter(v => v.vehicle_type === 'two_wheeler');
    const four = pool.filter(v => v.vehicle_type === 'four_wheeler');
    const selectedTwo = two.slice(0, Math.min(two.length, Math.ceil(limit / 2)));
    const selectedFour = four.slice(0, limit - selectedTwo.length);
    vehicles = [...two.slice(0, limit - selectedFour.length), ...selectedFour];
  } else vehicles = pool.slice(0, limit);
  return { intent, vehicles, total_matches: pool.length, requested_count: intent.count };
}

function priceLine(v) {
  const p = v.price_reference;
  if (!p) return 'Price: a verified amount is not available in this catalog.';
  return `₹${Number(p.amount_inr).toLocaleString('en-IN')} — ${p.label}; reference checked ${p.checked_at}.`;
}

function listAnswer(question, knowledge) {
  const vehicles = knowledge.vehicles || [];
  if (!vehicles.length) return 'No matching models in this reference catalog for that category and brand. This does not confirm whether the manufacturer sells other models. Try another brand or category.';
  const lines = [`**${vehicles.length} EV models from the reference catalog**`];
  if (knowledge.requested_count > vehicles.length) lines.push(`You requested ${knowledge.requested_count}; only ${vehicles.length} matching entries are recorded here.`);
  let index = 0;
  for (const [type, title] of [['two_wheeler', 'Two-wheelers (scooters / bikes)'], ['four_wheeler', 'Four-wheelers (cars / SUVs)']]) {
    const group = vehicles.filter(v => v.vehicle_type === type);
    if (!group.length) continue;
    lines.push('', `### ${title}`);
    for (const v of group) {
      lines.push(`${++index}. **${v.make} ${v.model}**${/price|cost/i.test(question) ? ` — ${priceLine(v)}` : ''}`);
    }
  }
  lines.push('', 'These are catalog models, not confirmed local stock. Availability varies by market, city and variant.');
  if (/price|cost/i.test(question)) lines.push('Listed prices are dated references, not current on-road quotes. Which city and variant should we check?');
  return lines.join('\n');
}

module.exports = { listIntent, resolveList, listAnswer, priceLine };
