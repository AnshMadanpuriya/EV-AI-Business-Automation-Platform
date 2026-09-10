"""Bounded recommendation context, shared rules and dated facts with the Node fallback."""
import json
import re
from pathlib import Path
from ev_conversation import price_line, inr, budget_from, subtype_from
RULES = json.loads((Path(__file__).parent.parent / 'shared/ev-advice.json').read_text(encoding='utf-8'))


def matches(key, text):
    return bool(re.search(RULES[key], text, re.I))


def capacity(vehicle):
    match = re.search(r'([\d.]+)\s*kWh', str(vehicle.get('battery_capacity', '')), re.I)
    return float(match[1]) if match else 0


def range_value(vehicle):
    match = re.search(r'[\d.]+', str(vehicle.get('electric_range', '')))
    return float(match[0]) if match else 0


def amount(vehicle):
    return float((vehicle.get('price_reference') or {}).get('amount_inr') or 0)


def category_from(text, recommendation=False):
    if matches('two', text) or (recommendation and re.search(r'\b(two|2)\s+vehicles?\b', text, re.I)):
        return 'two_wheeler'
    if matches('four', text) or (recommendation and re.search(r'\b(four|4)\s+vehicles?\b', text, re.I)):
        return 'four_wheeler'
    return None


def recommendation_state(question, history, identify):
    def empty(category=None, language='en'):
        return dict(active=False, category=category, budget=None, vehicle_subtype=None, criteria='', vehicles=[], language=language)
    state = empty()
    turns = [h for h in (history or []) if h.get('role') == 'user'][-10:] + [{'content': question}]
    for turn in turns:
        text = str(turn.get('content') or '').strip()
        wants_recommendation = matches('recommend', text)
        category = category_from(text, wants_recommendation)
        rec = wants_recommendation and (category or identify(text)[1] or re.search(r'\bev\b|evehicle|electric|battery|range|charg', text, re.I) or matches('recommend_followup', text))
        budget = budget_from(text)
        _, explicit = identify(text)
        short = len(text.split()) <= 10
        named_reply = explicit and not re.search(r'\b(show|list|give|data|compare|which|price|prices|range|battery|charging|details|models)\b', text, re.I)
        clarify = matches('clarifier', text) or (short and (budget is not None or named_reply))
        if matches('greeting', text) or (not rec and not clarify):
            state = empty(category)
            continue
        if category and state['category'] and category != state['category']:
            state = empty(category, state['language'])
        if rec or (category and matches('clarifier', text)) or (state['active'] and clarify):
            state['active'] = True
            state['category'] = category or state['category']
            if category:
                state['vehicle_subtype'] = subtype_from(text)
            if budget is not None:
                state['budget'] = budget
            if explicit:
                state['vehicles'] = explicit
            if matches('preference', text):
                if re.search(r'range|battery|charg', text, re.I) or not state['criteria']:
                    state['criteria'] = text
            if matches('hinglish', text):
                state['language'] = 'hi'
    return state


def recommendation_answer(state, catalog):
    hi = state['language'] == 'hi'
    category, budget = state['category'], state['budget']
    scope = state['vehicles'] or [v for v in catalog['vehicles'] if 'India' in v.get('market', '')]
    pool = [v for v in scope if (not category or v['vehicle_type'] == category) and (not state['vehicle_subtype'] or v.get('vehicle_subtype') == state['vehicle_subtype']) and v.get('model_status') not in ['unverified-name','racing-platform','demonstration-reference','announced-reference','prebooking-closed']]
    if not category and not state['vehicles']:
        prefix = (f'{inr(budget)} budget samajh gaya. ' if hi else f'Got it — your budget is {inr(budget)}. ') if budget else ''
        return prefix + ('Scooter compare karna hai ya car?' if hi else 'Are you looking for a scooter or a car?'), []
    by_range = matches('range', state['criteria'])
    by_charging = not by_range and matches('charging', state['criteria']) and not matches('battery', state['criteria'])
    def score(v):
        if by_range:
            return range_value(v)
        if by_charging:
            return 10000 - v['charging_0_80_minutes'] if v.get('charging_0_80_minutes') else 0
        return capacity(v)
    ordered = sorted(pool, key=score, reverse=True)
    price_focus = bool(re.search(r'price|budget|cost|affordable|cheapest|sast', state['criteria'], re.I))
    confirmed = []
    if budget is not None:
        confirmed = [v for v in ordered if 0 < amount(v) <= budget][:3]
        vehicles = confirmed + [v for v in ordered if not amount(v)][:1 if confirmed else 2]
    else:
        known = [v for v in ordered if capacity(v)]
        selected = list(reversed(known[-3:])) + known[:2] if price_focus and len(known) > 5 else known[:5]
        vehicles = selected + [v for v in pool if not capacity(v)][:max(0, 5-len(selected))]
    if budget is not None and confirmed:
        name = f"**{confirmed[0]['make']} {confirmed[0]['model']}**"
        answer = f'{inr(budget)} budget ke aas-paas main {name} ko shortlist karunga. Iska advertised reference price budget mein hai; on-road quote confirm karna hoga.' if hi else f'Near {inr(budget)}, I would shortlist {name} first from the priced records available. Its advertised reference price fits; the final on-road cost still needs confirmation.'
    elif budget is not None:
        answer = f'{inr(budget)} ke andar confirmed-price match is catalog mein nahi mila. Ye models compare kar sakte ho, lekin inhe budget ke andar assume mat karo:' if hi else f'I do not have a confirmed-price match within {inr(budget)} in this catalog. These are models to request quotes for, not confirmed options within your budget:'
    else:
        answer = 'Main in models se comparison shuru karunga. Battery capacity ke saath practical range, charging aur service support dekho:' if hi else 'I would start by comparing these models. Look at usable range, charging and service support alongside battery capacity:'
    for v in vehicles:
        missing = 'is catalog mein confirmed nahi' if hi else 'not confirmed in this catalog'
        quote = (' — price quote chahiye' if hi else ' — price quote needed') if budget is not None and not amount(v) else ''
        charging = v.get('charging_time') or ('exact variant ka charging time confirm karna hoga' if hi else 'confirm the exact variant’s charging time')
        answer += f"\n\n**{v['make']} {v['model']}**{quote}\n- {price_line(v)}\n- Battery: {v.get('battery_capacity') or missing}\n- Range: {v.get('electric_range') or missing}\n- Charging: {charging}"
    if not vehicles:
        answer += '\nIs brand/category ka affordable model record nahi mila; isse market mein unavailable hona prove nahi hota.' if hi else '\nNo qualifying model is recorded for this brand/category; this does not establish market unavailability.'
    answer += '\n\nAdvertised range real-world guarantee nahi hai. Badi battery se reliability prove nahi hoti. Ye dated references hain; current price, warranty aur charger cost dealer se confirm karo.' if hi else '\n\nAdvertised range is not guaranteed real-world range, and a bigger battery does not prove reliability. These are dated references; confirm current price, warranty and charger cost with the dealer.'
    if budget is None and price_focus:
        answer += '\nComparable prices are missing, so I cannot honestly rank the cheapest or best value.'
    if budget is not None:
        answer += '\n\nTum kis city mein kharidoge?' if hi else '\n\nWhich city will you buy in?'
    else:
        answer += '\n\nTumhara total budget kitna hai?' if hi else '\n\nWhat is your total budget?'
    return answer, vehicles


def advice_knowledge(question, history, identify, catalog):
    _, explicit = identify(question)
    state = recommendation_state(question, history, identify)
    language = 'hi' if matches('hinglish', question) else state['language']
    answer, kind, vehicles = None, None, []
    if matches('greeting', question.strip()):
        kind = 'greeting'
    elif state['active'] and not re.search(r'\b(why|kyun|kyu)\b', question, re.I):
        kind = 'recommendation'
        answer, vehicles = recommendation_answer(state, catalog)
    elif matches('purchase', question) and re.search(r'\bev\b|electric|vehicle|scooter|car|खरीद', question, re.I):
        kind = 'purchase'
    elif not explicit and not identify(question, history)[1] and not matches('recommend', question):
        kind = 'charging' if matches('charging', question) else 'battery' if matches('battery', question) else None
    if not kind:
        return None
    answer = answer or RULES['answers'][kind][language]
    sources = list(dict.fromkeys(RULES['sources'].get(kind, []) + [url for v in vehicles for url in [v.get('source_url'), v.get('price_reference', {}).get('source_url')] if url]))
    constraints = dict(scope_brands=list(dict.fromkeys(v['make'] for v in state['vehicles'])), category=state['category'], vehicle_subtype=state['vehicle_subtype'], budget_inr=state['budget'], criteria=state['criteria'])
    return {'advice_answer': answer, 'fast_answer': True, 'intent': {'kind': kind, **constraints}, 'vehicles': vehicles, 'sources': sources, 'pages': [], 'brands': list(dict.fromkeys(v['make'].lower() for v in vehicles)), 'mode': 'catalog', 'notice': '', 'context': json.dumps({'policy': catalog['notice'], 'constraints': constraints, 'vehicles': vehicles, 'advice': answer})}
