"""Deterministic category/count handling, also available when Node or the LLM is offline."""
import re


def list_intent(question):
    text = re.sub(r'[-/]', ' ', question.lower())
    two = bool(re.search(r'\b(two|2)\s*(wheelers?|wheels?)\b|\btwo\s*vehicles?\b|\b(scooters?|bikes?)\b', text)
               or (re.search(r'\b2\s*vehicles?\b', text) and re.search(r'\b(both|which)\b', text)))
    four = bool(re.search(r'\b(four|4)\s*(wheelers?|wheels?)\b|\bfour\s*vehicles?\b|\bcars?\b', text)
                or (re.search(r'\b4\s*vehicles?\b', text) and re.search(r'\b(both|which)\b', text)))
    listing = bool(re.search(r'\b(list|models|options|which|what|show|give|all|available|availbe|kaun|konsi|batao)\b', text)
                   and (two or four or re.search(r'\b(list|models|options|vehicles|evs)\b', text)))
    if re.search(r'range|battery|charg|fastest|best|highest|lowest|compare', text) and not re.search(r'\b(list|models|options)\b', text):
        listing = False
    count_text = re.sub(r'\b(two|four|2|4)\s*(wheelers?|wheels?)\b', '', text)
    if re.search(r'\b(both|which)\b', text):
        count_text = re.sub(r'\b(two|four|2|4)\s*vehicles?\b', '', count_text)
    count = re.search(r'\b(\d{1,3})\b', count_text)
    return {'kind': 'list' if listing else 'details',
            'category': 'both' if two and four else 'two_wheeler' if two else 'four_wheeler' if four else 'both',
            'count': min(100, max(1, int(count[1]))) if count else None}


def resolve_list(question, history, identify, catalog):
    intent = list_intent(question)
    previous = [h for h in reversed(history or []) if h.get('role') == 'user']
    referring = bool(re.search(r'\b(these|those|this companies|same|above|their|them|their prices|inki|inke|in companies)\b', question, re.I))
    if intent['kind'] != 'list' and referring and re.search(r'price|cost', question, re.I) and previous:
        intent = list_intent(previous[0].get('content', ''))
    if intent['kind'] != 'list':
        return None
    brands, _ = identify(question)
    if not brands and referring:
        for item in previous:
            brands, _ = identify(item.get('content', ''))
            if brands or list_intent(item.get('content', ''))['kind'] == 'list':
                break
    pool = [v for v in catalog['vehicles'] if (not brands or any(b['make'] == v['make'] for b in brands))
            and (intent['category'] == 'both' or v['vehicle_type'] == intent['category'])]
    limit = intent['count'] or 20
    if intent['category'] == 'both':
        two = [v for v in pool if v['vehicle_type'] == 'two_wheeler']
        four = [v for v in pool if v['vehicle_type'] == 'four_wheeler']
        selected_two = two[:min(len(two), (limit + 1) // 2)]
        selected_four = four[:limit - len(selected_two)]
        vehicles = two[:limit - len(selected_four)] + selected_four
    else:
        vehicles = pool[:limit]
    return {'intent': intent, 'vehicles': vehicles, 'total_matches': len(pool), 'requested_count': intent['count']}


def inr(amount):
    digits = str(int(amount))
    last = digits[-3:]
    prefix = digits[:-3]
    groups = []
    while prefix:
        groups.insert(0, prefix[-2:])
        prefix = prefix[:-2]
    return '₹' + ','.join(groups + [last])


def price_line(vehicle):
    price = vehicle.get('price_reference')
    if not price:
        return 'Price: a verified amount is not available in this catalog.'
    return f"{inr(price['amount_inr'])} — {price['label']}; reference checked {price['checked_at']}."


def list_answer(question, knowledge):
    vehicles = knowledge.get('vehicles', [])
    if not vehicles:
        return 'No matching models in this reference catalog for that category and brand. This does not confirm whether the manufacturer sells other models. Try another brand or category.'
    lines = [f'**{len(vehicles)} EV models from the reference catalog**']
    if (knowledge.get('requested_count') or 0) > len(vehicles):
        lines.append(f"You requested {knowledge['requested_count']}; only {len(vehicles)} matching entries are recorded here.")
    index = 0
    for category, title in [('two_wheeler', 'Two-wheelers (scooters / bikes)'), ('four_wheeler', 'Four-wheelers (cars / SUVs)')]:
        group = [v for v in vehicles if v['vehicle_type'] == category]
        if not group:
            continue
        lines.extend(['', f'### {title}'])
        for v in group:
            index += 1
            price = ' — ' + price_line(v) if re.search(r'price|cost', question, re.I) else ''
            lines.append(f"{index}. **{v['make']} {v['model']}**{price}")
    lines.extend(['', 'These are catalog models, not confirmed local stock. Availability varies by market, city and variant.'])
    if re.search(r'price|cost', question, re.I):
        lines.append('Listed prices are dated references, not current on-road quotes. Which city and variant should we check?')
    return '\n'.join(lines)
