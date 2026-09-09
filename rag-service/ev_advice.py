"""General guidance and bounded recommendations; shares rules with the Node fallback."""
import json
import re
from pathlib import Path
from ev_conversation import price_line
RULES = json.loads((Path(__file__).parent.parent / 'shared/ev-advice.json').read_text(encoding='utf-8'))


def matches(key, text):
    return bool(re.search(RULES[key], text, re.I))


def capacity(vehicle):
    match = re.search(r'([\d.]+)\s*kWh', str(vehicle.get('battery_capacity', '')), re.I)
    return float(match[1]) if match else 0


def advice_knowledge(question, history, identify, catalog):
    language = 'hi' if matches('hinglish', question) else 'en'
    _, explicit = identify(question)
    recommendation = matches('recommend', question)
    if recommendation and re.search(r'\b(why|kyun|kyu)\b', question, re.I):
        return None
    category = 'two_wheeler' if matches('two', question) else 'four_wheeler' if matches('four', question) else None
    if recommendation and not category and not explicit:
        previous = next((h for h in reversed(history or []) if h.get('role') == 'user'), None)
        if previous:
            category = 'two_wheeler' if matches('two', previous['content']) else 'four_wheeler' if matches('four', previous['content']) else None
    answer, kind, vehicles = None, None, []
    if matches('greeting', question.strip()):
        kind = 'greeting'
    elif recommendation and (category or explicit or re.search(r'\bev\b|electric|battery', question, re.I)):
        kind = 'recommendation'
        pool = explicit or [v for v in catalog['vehicles'] if 'India' in v.get('market', '')]
        pool = [v for v in pool if not category or v['vehicle_type'] == category]
        if not category and not explicit:
            answer = 'Best EV tumhare budget, daily travel aur charging access par depend karti hai. Tum scooter compare karna chahte ho ya car?' if language == 'hi' else 'The best EV for you depends on budget, daily travel and charging access. Are you comparing scooters or cars?'
        else:
            price_focus = bool(re.search(r'price|budget|cost|affordable|cheapest|sast', question, re.I))
            known = sorted([v for v in pool if capacity(v)], key=capacity, reverse=True)
            selected = list(reversed(known[-3:])) + known[:2] if price_focus and len(known) > 5 else known[:5]
            vehicles = selected + [v for v in pool if not capacity(v)][:max(0, 5-len(selected))]
            answer = 'Best battery choose karte waqt capacity ke saath warranty, practical range aur service support bhi dekho. Available catalog se ye comparison hai:' if language == 'hi' else 'For the best battery, compare capacity alongside warranty, usable range and service support. Here is a comparison from the available catalog:'
            for v in vehicles:
                missing = 'is catalog mein confirmed nahi' if language == 'hi' else 'not confirmed in this catalog'
                answer += f"\n\n**{v['make']} {v['model']}**\n- Battery: {v.get('battery_capacity') or missing}\n- {price_line(v)}"
            if known and not price_focus:
                candidate = f"**{known[0]['make']} {known[0]['model']} ({known[0]['battery_capacity']})**"
                answer += f'\n\nRecorded capacities mein {candidate} sabse badi listed pack size ke liye ek candidate hai. Ye overall battery quality ya poore market ka winner nahi hai.' if language == 'hi' else f'\n\nAmong recorded capacities, {candidate} is one candidate for the largest listed pack. This does not establish overall battery quality or a market-wide winner.'
            answer += '\n\nYe variant-specific reference data hai; latest models aur sabhi variants cover nahi hote. Missing battery data wale models ko worse nahi maana gaya.' if language == 'hi' else '\n\nThese are variant-specific reference records, not a complete current-market comparison. Models with missing battery data are not ranked as worse.'
            if price_focus:
                answer += '\nCurrent comparable prices sabke liye available nahi hain, isliye cheapest ya best value ka claim nahi karunga.' if language == 'hi' else '\nComparable current prices are not available for every model, so I cannot honestly rank the cheapest or best value.'
            answer += '\n\nTumhara total budget kitna hai?' if language == 'hi' else '\n\nWhat is your total budget?'
    elif matches('purchase', question) and re.search(r'\bev\b|electric|vehicle|scooter|car|खरीद', question, re.I):
        kind = 'purchase'
    elif not explicit and not identify(question, history)[1] and not recommendation:
        kind = 'charging' if matches('charging', question) else 'battery' if matches('battery', question) else None
    if not kind:
        return None
    answer = answer or RULES['answers'][kind][language]
    sources = list(dict.fromkeys(RULES['sources'].get(kind, []) + [url for v in vehicles for url in [v.get('source_url'), v.get('price_reference', {}).get('source_url')] if url]))
    return {'advice_answer': answer, 'fast_answer': True, 'intent': {'kind': kind}, 'vehicles': vehicles, 'sources': sources, 'pages': [], 'brands': list(dict.fromkeys(v['make'].lower() for v in vehicles)), 'mode': 'catalog', 'notice': '', 'context': json.dumps({'policy': catalog['notice'], 'vehicles': vehicles, 'advice': answer})}
