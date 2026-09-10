const catalog = require('../../shared/ev-catalog.json');
const rules = require('../../shared/ev-advice.json');
const id = v => `${v.make}|${v.model}`;
const normalizeQuestion = q => String(q || '').toLowerCase().replace(/\b(suggesy|sugest|sugges|suffest)\b/g, 'suggest').replace(/[-/]/g, ' ');
function budgetFrom(text) {
  const match = text.match(new RegExp(rules.budget, 'i')) || text.trim().match(/^([\d,]+(?:\.\d+)?)\s*(k|lakh?s?|lacs?|thousand)?[!.? ]*$/i);
  if (!match) return null;
  const value = Number((match[1] || match[3]).replace(/,/g, ''));
  const unit = (match[2] || match[4] || '').toLowerCase();
  const inr = value * (/^la/.test(unit) ? 100000 : /^(k|thousand)$/.test(unit) ? 1000 : 1);
  return Number.isFinite(inr) && inr >= 1000 && inr <= 100000000 ? inr : null;
}
function subtypeFrom(text) {
  const scooter = /\bscooters?\b/i.test(text), bike = /\b(bikes?|motorcycles?)\b/i.test(text);
  return scooter === bike ? null : scooter ? 'scooter' : 'motorcycle';
}
function listIntent(question) {
  const text = normalizeQuestion(question);
  const two = /\b(two|2)\s*(wheelers?|wheels?)\b|\btwo\s*vehicles?\b|\b(scooters?|bikes?|motorcycles?)\b/.test(text)
    || (/\b2\s*vehicles?\b/.test(text) && /\b(both|which)\b/.test(text));
  const four = /\b(four|4)\s*(wheelers?|wheels?)\b|\bfour\s*vehicles?\b|\bcars?\b/.test(text)
    || (/\b4\s*vehicles?\b/.test(text) && /\b(both|which)\b/.test(text));
  const more = /\b(more|other|another|additional|next)\b|\baur\b/.test(text);
  const bareMore = /^(?:(?:please|suggest|show|give|me|some|a few|more|others?|next|names?|options?|aur|batao|dikhao)\s*)+[.!?]*$/.test(text);
  const namedList = /\b(list|names?|models|options)\b/.test(text);
  let listing = (namedList || /\b(evs|vehicles)\b/.test(text) || two || four)
    && /\b(list|names?|which|what|show|give|suggest|recommend|all|available|availbe|kaun|konsi|batao|more|other|next)\b/.test(text);
  if (more && bareMore) listing = true;
  if (/range|battery|charg|fastest|best|highest|lowest|compare/.test(text) && !namedList) listing = false;
  if (/more\s+(details|information|info)/.test(text) && !namedList) listing = false;
  const countText = text.replace(new RegExp(rules.budget, 'gi'), '').replace(/\b(two|four|2|4)\s*(wheelers?|wheels?)\b/g, '')
    .replace(/\b(two|four|2|4)\s*vehicles?\b/g, s => /\b(both|which)\b/.test(text) ? '' : s);
  const count = countText.match(/\b(\d{1,3})\b/);
  return { kind: listing ? 'list' : 'details', more, vehicle_subtype: subtypeFrom(text), explicit_category: two || four,
    category: two && four ? 'both' : two ? 'two_wheeler' : four ? 'four_wheeler' : 'both', count: count ? Math.min(100, Math.max(1, Number(count[1]))) : null };
}
function cleanCatalogContext(value) {
  if (!value || value.version !== 1 || !['both','two_wheeler','four_wheeler'].includes(value.category)) return null;
  const ids = new Set(catalog.vehicles.map(id));
  return { version: 1, category: value.category, vehicle_subtype: ['scooter','motorcycle'].includes(value.vehicle_subtype) ? value.vehicle_subtype : null,
    brands: Array.isArray(value.brands) ? value.brands.filter(s => catalog.brands.some(b => b.make === s)).slice(0,60) : [],
    budget_inr: Number.isFinite(value.budget_inr) && value.budget_inr >= 1000 && value.budget_inr <= 100000000 ? value.budget_inr : null,
    seen: Array.isArray(value.seen) ? [...new Set(value.seen.filter(s => typeof s === 'string' && ids.has(s)))].slice(0,200) : [] };
}
function contextFor(knowledge) {
  if (knowledge.catalog_context) return knowledge.catalog_context;
  if (!knowledge.vehicles?.length) return null;
  const types = [...new Set(knowledge.vehicles.map(v => v.vehicle_type))];
  return { version: 1, vehicle_subtype: knowledge.intent?.vehicle_subtype || null, category: knowledge.intent?.category || (types.length === 1 ? types[0] : 'both'),
    brands: knowledge.intent?.kind === 'recommendation' ? knowledge.intent.scope_brands || [] : [...new Set(knowledge.vehicles.map(v => v.make))],
    budget_inr: knowledge.intent?.budget_inr ?? null, seen: knowledge.vehicles.map(id) };
}
function resolveList(question, history, identify, suppliedContext) {
  const intent = listIntent(question);
  const previous = [...(Array.isArray(history) ? history : [])].reverse().filter(h => h.role === 'user');
  const referring = /\b(these|those|this companies|same|above|their|them|inki|inke|in companies)\b/i.test(question);
  if (intent.kind !== 'list' && referring && /price|cost/i.test(question) && previous.length) Object.assign(intent, listIntent(previous[0].content));
  if (intent.kind !== 'list') return null;
  let brands = identify(question).brands.map(b => b.make);
  let context = cleanCatalogContext(suppliedContext);
  if (!context && (intent.more || referring)) {
    const prior = previous.find(h => listIntent(h.content).explicit_category || identify(h.content).brands.length || /\b(ev|vehicles|models)\b/i.test(h.content));
    if (prior) {
      const seen = (history || []).filter(h=>h.role==='assistant').flatMap(h=>identify(h.content).vehicles.map(id));
      context = { version:1, category:listIntent(prior.content).category, vehicle_subtype:subtypeFrom(prior.content), brands:identify(prior.content).brands.map(b=>b.make), budget_inr:budgetFrom(prior.content), seen };
    }
  }
  if ((intent.more || referring) && context) {
    if (!brands.length) brands = context.brands;
    if (!intent.explicit_category) { intent.category = context.category; intent.vehicle_subtype = context.vehicle_subtype || null; }
  }
  const budget = budgetFrom(question) ?? (intent.more && (!intent.explicit_category || intent.category === context?.category) ? context?.budget_inr : null) ?? null;
  const seen = new Set(intent.more ? context?.seen || [] : []);
  const pool = catalog.vehicles.filter(v => (!brands.length || brands.includes(v.make))
    && (intent.category === 'both' || v.vehicle_type === intent.category)
    && (!intent.vehicle_subtype || v.vehicle_subtype === intent.vehicle_subtype)
    && v.model_status !== 'unverified-name'
    && (budget === null || (!['racing-platform','demonstration-reference','announced-reference','prebooking-closed'].includes(v.model_status)
      && (!v.price_reference || Number(v.price_reference.amount_inr) <= budget))));
  const remaining = pool.filter(v => !seen.has(id(v)));
  const limit = intent.count || 20;
  let vehicles;
  if (intent.category === 'both') {
    const two = remaining.filter(v=>v.vehicle_type==='two_wheeler');
    const four = remaining.filter(v=>v.vehicle_type==='four_wheeler');
    const selectedFour = four.slice(0, limit-Math.min(two.length,Math.ceil(limit/2)));
    vehicles = [...two.slice(0,limit-selectedFour.length),...selectedFour];
  } else vehicles = remaining.slice(0,limit);
  vehicles.forEach(v=>seen.add(id(v)));
  return { intent:{...intent,budget_inr:budget}, vehicles, total_matches:pool.length, requested_count:intent.count,
    remaining_count:remaining.length-vehicles.length,
    catalog_context:{version:1,category:intent.category,vehicle_subtype:intent.vehicle_subtype,brands,budget_inr:budget,seen:[...seen].slice(0,200)} };
}
function priceLine(v) {
  const p=v.price_reference;
  return p ? `₹${Number(p.amount_inr).toLocaleString('en-IN')} — ${p.label}; reference checked ${p.checked_at}.` : 'Price: a verified amount is not available in this catalog.';
}
function listAnswer(question, knowledge) {
  const vehicles=knowledge.vehicles || [];
  if (!vehicles.length) return knowledge.intent?.more && knowledge.total_matches > 0
    ? 'You have seen all matching models in this catalog. I will not repeat them. Try another category, brand or budget to broaden the list.'
    : 'No matching models in this reference catalog for those filters. This does not establish market unavailability. Try another brand, category or budget.';
  const lines=[`**${vehicles.length}${knowledge.intent?.more ? ' more' : ''} EV models from the reference catalog**`];
  if (knowledge.requested_count > vehicles.length) lines.push(`You requested ${knowledge.requested_count}; only ${vehicles.length} matching entries are recorded here${knowledge.intent?.more ? ' that you have not seen' : ''}.`);
  if (knowledge.intent?.budget_inr) lines.push('Budget filter uses dated advertised prices. Models without a price need a dealer quote; they are not confirmed within your budget.');
  let index=0;
  for (const [type,title] of [['two_wheeler','Two-wheelers (scooters / bikes)'],['four_wheeler','Four-wheelers (cars / SUVs)']]) {
    const group=vehicles.filter(v=>v.vehicle_type===type);if(!group.length)continue;
    lines.push('',`### ${title}`);
    for(const v of group) lines.push(`${++index}. **${v.make} ${v.model}**${v.model_status && v.model_status !== 'reference' ? ` — ${v.model_status.replace(/-/g,' ')}` : ''}${/price|cost/i.test(question) ? ` — ${priceLine(v)}` : knowledge.intent?.budget_inr && !v.price_reference ? ' — price quote needed' : ''}`);
  }
  lines.push('','These are catalog models, not confirmed local stock. Availability varies by market, city and variant.');
  if(knowledge.remaining_count > 0)lines.push(`${knowledge.remaining_count} more matching models are recorded. Ask “more names” to continue.`);
  if(/price|cost/i.test(question))lines.push('Listed prices are dated references, not current on-road quotes. Which city and variant should we check?');
  return lines.join('\n');
}
module.exports={listIntent,resolveList,listAnswer,priceLine,budgetFrom,subtypeFrom,cleanCatalogContext,contextFor};
