const catalog = require('../../shared/ev-catalog.json');
const rules = require('../../shared/ev-advice.json');
const { priceLine } = require('./evConversation');
const matches = (key, text) => new RegExp(rules[key], 'i').test(text);
const capacity = v => Number(String(v.battery_capacity || '').match(/([\d.]+)\s*kWh/i)?.[1]) || 0;

function adviceKnowledge(question, history, identify) {
  const language = matches('hinglish', question) ? 'hi' : 'en';
  const explicit = identify(question);
  const recommendation = matches('recommend', question);
  if (recommendation && /\b(why|kyun|kyu)\b/i.test(question)) return null;
  let category = matches('two', question) ? 'two_wheeler' : matches('four', question) ? 'four_wheeler' : null;
  if (recommendation && !category && !explicit.vehicles.length) {
    // Only recommendation follow-ups inherit the last user category; greetings/topic changes do not.
    const previous = [...(history || [])].reverse().find(h => h.role === 'user');
    if (previous) category = matches('two', previous.content) ? 'two_wheeler' : matches('four', previous.content) ? 'four_wheeler' : null;
  }
  let answer; let vehicles = []; let sources = []; let kind;
  if (matches('greeting', question.trim())) kind = 'greeting';
  else if (recommendation && (category || explicit.vehicles.length || /\bev\b|electric|battery/i.test(question))) {
    kind = 'recommendation';
    const pool = (explicit.vehicles.length ? explicit.vehicles : catalog.vehicles.filter(v => /India/.test(v.market || '')))
      .filter(v => !category || v.vehicle_type === category);
    if (!category && !explicit.vehicles.length) {
      answer = language === 'hi' ? 'Best EV tumhare budget, daily travel aur charging access par depend karti hai. Tum scooter compare karna chahte ho ya car?' : 'The best EV for you depends on budget, daily travel and charging access. Are you comparing scooters or cars?';
    } else {
      const priceFocus = /price|budget|cost|affordable|cheapest|sast/i.test(question);
      const known = pool.filter(v => capacity(v)).sort((a,b) => capacity(b) - capacity(a));
      // For a price/battery trade-off show both smaller and larger packs; do not rank unknown prices.
      const selected = priceFocus && known.length > 5 ? [...known.slice(-3).reverse(), ...known.slice(0,2)] : known.slice(0,5);
      vehicles = [...selected, ...pool.filter(v => !capacity(v)).slice(0, Math.max(0,5-selected.length))];
      answer = language === 'hi' ? 'Best battery choose karte waqt capacity ke saath warranty, practical range aur service support bhi dekho. Available catalog se ye comparison hai:' : 'For the best battery, compare capacity alongside warranty, usable range and service support. Here is a comparison from the available catalog:';
      for (const v of vehicles) answer += `\n\n**${v.make} ${v.model}**\n- Battery: ${v.battery_capacity || (language === 'hi' ? 'is catalog mein confirmed nahi' : 'not confirmed in this catalog')}\n- ${priceLine(v)}`;
      if (known.length && !priceFocus) answer += language === 'hi' ? `\n\nRecorded capacities mein **${known[0].make} ${known[0].model} (${known[0].battery_capacity})** sabse badi listed pack size ke liye ek candidate hai. Ye overall battery quality ya poore market ka winner nahi hai.` : `\n\nAmong recorded capacities, **${known[0].make} ${known[0].model} (${known[0].battery_capacity})** is one candidate for the largest listed pack. This does not establish overall battery quality or a market-wide winner.`;
      answer += language === 'hi' ? '\n\nYe variant-specific reference data hai; latest models aur sabhi variants cover nahi hote. Missing battery data wale models ko worse nahi maana gaya.' : '\n\nThese are variant-specific reference records, not a complete current-market comparison. Models with missing battery data are not ranked as worse.';
      if (priceFocus) answer += language === 'hi' ? '\nCurrent comparable prices sabke liye available nahi hain, isliye cheapest ya best value ka claim nahi karunga.' : '\nComparable current prices are not available for every model, so I cannot honestly rank the cheapest or best value.';
      answer += language === 'hi' ? '\n\nTumhara total budget kitna hai?' : '\n\nWhat is your total budget?';
    }
  } else if (matches('purchase', question) && /\bev\b|electric|vehicle|scooter|car|खरीद/i.test(question)) kind = 'purchase';
  else if (!explicit.vehicles.length && !identify(question, history).vehicles.length && !recommendation) {
    if (matches('charging', question)) kind = 'charging';
    else if (matches('battery', question)) kind = 'battery';
  }
  if (!kind) return null;
  if (!answer) answer = rules.answers[kind][language];
  sources = [...new Set([...(rules.sources[kind] || []), ...vehicles.flatMap(v => [v.source_url,v.price_reference?.source_url]).filter(Boolean)])];
  return { advice_answer: answer, fast_answer: true, intent: {kind}, vehicles, sources, pages: [], brands: [...new Set(vehicles.map(v=>v.make.toLowerCase()))], mode: 'catalog', notice: '', context: JSON.stringify({policy:catalog.notice,vehicles,advice:answer}) };
}
module.exports = { adviceKnowledge };
