const catalog = require('../../shared/ev-catalog.json');
const rules = require('../../shared/ev-advice.json');
const { priceLine } = require('./evConversation');
const matches = (key, text) => new RegExp(rules[key], 'i').test(text);
const capacity = v => Number(String(v.battery_capacity || '').match(/([\d.]+)\s*kWh/i)?.[1]) || 0;
const range = v => Number(String(v.electric_range || '').match(/[\d.]+/)?.[0]) || 0;
const amount = v => Number(v.price_reference?.amount_inr) || 0;
const money = n => `₹${n.toLocaleString('en-IN')}`;

function budgetFrom(text) {
  const match = text.match(new RegExp(rules.budget, 'i'))
    || text.trim().match(/^([\d,]+(?:\.\d+)?)\s*(k|lakh?s?|lacs?|thousand)?[!.? ]*$/i);
  if (!match) return null;
  const value = Number((match[1] || match[3]).replace(/,/g, ''));
  const unit = (match[2] || match[4] || '').toLowerCase();
  const inr = value * (/^la/.test(unit) ? 100000 : /^(k|thousand)$/.test(unit) ? 1000 : 1);
  return Number.isFinite(inr) && inr >= 1000 && inr <= 100000000 ? inr : null;
}
function categoryFrom(text, recommendation = false) {
  return matches('two', text) || (recommendation && /\b(two|2)\s+vehicles?\b/i.test(text)) ? 'two_wheeler'
    : matches('four', text) || (recommendation && /\b(four|4)\s+vehicles?\b/i.test(text)) ? 'four_wheeler' : null;
}

// Reconstruct a bounded conversation state using USER turns only, never assistant claims.
// Short clarifications continue the active request; unrelated topics discard its constraints.
function recommendationState(question, history, identify) {
  let state = { active: false, category: null, budget: null, criteria: '', vehicles: [], language: 'en' };
  const turns = [...(Array.isArray(history) ? history : []).filter(h => h.role === 'user').slice(-10), { content: question }];
  for (const turn of turns) {
    const text = String(turn.content || '').trim();
    const wantsRecommendation = matches('recommend', text);
    const category = categoryFrom(text, wantsRecommendation);
    const rec = wantsRecommendation && (category || identify(text).vehicles.length || /\bev\b|evehicle|electric|battery|range|charg/i.test(text) || matches('recommend_followup', text));
    const budget = budgetFrom(text);
    const explicit = identify(text).vehicles;
    const short = text.split(/\s+/).length <= 10;
    const namedReply = explicit.length > 0 && !/\b(show|list|give|data|compare|which|price|prices|range|battery|charging|details|models)\b/i.test(text);
    const clarify = matches('clarifier', text) || (short && (budget !== null || namedReply));
    if (matches('greeting', text) || (!rec && !clarify)) {
      state = { active: false, category, budget: null, criteria: '', vehicles: [], language: 'en' };
      continue;
    }
    if (category && state.category && category !== state.category) {
      state = { active: false, category, budget: null, criteria: '', vehicles: [], language: state.language };
    }
    if (rec || (category && matches('clarifier', text)) || (state.active && clarify)) {
      state.active = true;
      state.category = category || state.category;
      if (budget !== null) state.budget = budget;
      if (explicit.length) state.vehicles = explicit;
      if (matches('preference', text) && (/range|battery|charg/i.test(text) || !state.criteria)) state.criteria = text;
      if (matches('hinglish', text)) state.language = 'hi';
    }
  }
  return state;
}

function recommendationAnswer(state) {
  const hi = state.language === 'hi';
  const { category, budget } = state;
  const scope = state.vehicles.length ? state.vehicles : catalog.vehicles.filter(v => /India/.test(v.market || ''));
  const pool = scope.filter(v => !category || v.vehicle_type === category);
  if (!category && !state.vehicles.length) return {
    vehicles: [], answer: `${budget ? (hi ? `${money(budget)} budget samajh gaya. ` : `Got it — your budget is ${money(budget)}. `) : ''}${hi ? 'Scooter compare karna hai ya car?' : 'Are you looking for a scooter or a car?'}`
  };
  const byRange = matches('range', state.criteria);
  const byCharging = !byRange && matches('charging', state.criteria) && !matches('battery', state.criteria);
  const score = v => byRange ? range(v) : byCharging ? (v.charging_0_80_minutes ? 10000 - v.charging_0_80_minutes : 0) : capacity(v);
  const sorted = [...pool].sort((a,b) => score(b) - score(a));
  let vehicles; let confirmed = [];
  const priceFocus = /price|budget|cost|affordable|cheapest|sast/i.test(state.criteria);
  if (budget !== null) {
    // Filter on dated advertised prices; unknown prices are explicitly separate quote candidates.
    confirmed = sorted.filter(v => amount(v) > 0 && amount(v) <= budget).slice(0,3);
    vehicles = [...confirmed, ...sorted.filter(v => !amount(v)).slice(0, confirmed.length ? 1 : 2)];
  } else {
    const known = sorted.filter(v => capacity(v));
    const selected = priceFocus && known.length > 5 ? [...known.slice(-3).reverse(), ...known.slice(0,2)] : known.slice(0,5);
    vehicles = [...selected, ...pool.filter(v => !capacity(v)).slice(0, Math.max(0,5-selected.length))];
  }
  let answer;
  if (budget !== null && confirmed.length) {
    answer = hi ? `${money(budget)} budget ke aas-paas main **${confirmed[0].make} ${confirmed[0].model}** ko shortlist karunga. Iska advertised reference price budget mein hai; on-road quote confirm karna hoga.`
      : `Near ${money(budget)}, I would shortlist **${confirmed[0].make} ${confirmed[0].model}** first from the priced records available. Its advertised reference price fits; the final on-road cost still needs confirmation.`;
  } else if (budget !== null) {
    answer = hi ? `${money(budget)} ke andar confirmed-price match is catalog mein nahi mila. Ye models compare kar sakte ho, lekin inhe budget ke andar assume mat karo:`
      : `I do not have a confirmed-price match within ${money(budget)} in this catalog. These are models to request quotes for, not confirmed options within your budget:`;
  } else {
    answer = hi ? 'Main in models se comparison shuru karunga. Battery capacity ke saath practical range, charging aur service support dekho:'
      : 'I would start by comparing these models. Look at usable range, charging and service support alongside battery capacity:';
  }
  for (const v of vehicles) {
    const missing = hi ? 'is catalog mein confirmed nahi' : 'not confirmed in this catalog';
    answer += `\n\n**${v.make} ${v.model}**${budget !== null && !amount(v) ? (hi ? ' — price quote chahiye' : ' — price quote needed') : ''}\n- ${priceLine(v)}\n- Battery: ${v.battery_capacity || missing}\n- Range: ${v.electric_range || missing}\n- Charging: ${v.charging_time || (hi ? 'exact variant ka charging time confirm karna hoga' : 'confirm the exact variant’s charging time')}`;
  }
  if (!vehicles.length) answer += hi ? '\nIs brand/category ka affordable model record nahi mila; isse market mein unavailable hona prove nahi hota.' : '\nNo qualifying model is recorded for this brand/category; this does not establish market unavailability.';
  answer += hi ? '\n\nAdvertised range real-world guarantee nahi hai. Badi battery se reliability prove nahi hoti. Ye dated references hain; current price, warranty aur charger cost dealer se confirm karo.' : '\n\nAdvertised range is not guaranteed real-world range, and a bigger battery does not prove reliability. These are dated references; confirm current price, warranty and charger cost with the dealer.';
  if (budget === null && priceFocus) answer += '\nComparable prices are missing, so I cannot honestly rank the cheapest or best value.';
  answer += budget !== null ? (hi ? '\n\nTum kis city mein kharidoge?' : '\n\nWhich city will you buy in?') : (hi ? '\n\nTumhara total budget kitna hai?' : '\n\nWhat is your total budget?');
  return { answer, vehicles };
}

function adviceKnowledge(question, history, identify) {
  const explicit = identify(question);
  const state = recommendationState(question, history, identify);
  const language = matches('hinglish', question) ? 'hi' : state.language;
  let answer; let vehicles = []; let kind;
  if (matches('greeting', question.trim())) kind = 'greeting';
  else if (state.active && !/\b(why|kyun|kyu)\b/i.test(question)) {
    kind = 'recommendation';
    ({answer, vehicles} = recommendationAnswer(state));
  } else if (matches('purchase', question) && /\bev\b|electric|vehicle|scooter|car|खरीद/i.test(question)) kind = 'purchase';
  else if (!explicit.vehicles.length && !identify(question, history).vehicles.length && !matches('recommend', question)) {
    if (matches('charging', question)) kind = 'charging';
    else if (matches('battery', question)) kind = 'battery';
  }
  if (!kind) return null;
  if (!answer) answer = rules.answers[kind][language];
  const sources = [...new Set([...(rules.sources[kind] || []), ...vehicles.flatMap(v => [v.source_url,v.price_reference?.source_url]).filter(Boolean)])];
  const constraints = { category: state.category, budget_inr: state.budget, criteria: state.criteria };
  return { advice_answer: answer, fast_answer: true, intent: {kind, ...constraints}, vehicles, sources, pages: [], brands: [...new Set(vehicles.map(v=>v.make.toLowerCase()))], mode: 'catalog', notice: '', context: JSON.stringify({policy:catalog.notice, constraints, vehicles, advice:answer}) };
}
module.exports = { adviceKnowledge, budgetFrom, recommendationState };
