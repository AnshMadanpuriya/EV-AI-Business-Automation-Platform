"""Dependency-free lexical retrieval; shared with the Node vehicle explorer."""
import json
import os
import re
import unicodedata
from pathlib import Path
from urllib.request import Request, urlopen
from ev_conversation import resolve_list, list_answer, price_line

CATALOG = json.loads((Path(__file__).resolve().parent.parent / 'shared' / 'ev-catalog.json').read_text(encoding='utf-8'))


def normalize(value):
    return ' '.join(''.join(c if c.isalnum() else ' ' for c in unicodedata.normalize('NFKC', str(value)).lower()).split())


def contains(text, phrase):
    return f' {normalize(phrase)} ' in f' {normalize(text)} '


def identify(question, history=None):
    brands = [b for b in CATALOG['brands'] if any(contains(question, a) for a in [b['make'], *b['aliases']])]
    vehicles = []
    for v in CATALOG['vehicles']:
        short = re.sub(r'\b(electric|ev)\b', '', normalize(v['model'])).strip()
        matched = contains(question, v['model']) or (len(short) >= 3 and contains(question, short))
        matched |= v['make'] == 'Tesla' and v['model'].startswith('Model Y') and contains(question, 'model y')
        matched |= v['model'] == 'iX1 LWB' and contains(question, 'ix1')
        if matched and (not brands or any(b['make'] == v['make'] for b in brands)):
            vehicles.append(v)
    followup_words = set('and aur what about is the it its this that iski uski iska uska price cost range charging battery kitna kitni hai kya batao please tell me'.split())
    if not brands and not vehicles and all(w in followup_words for w in normalize(question).split()) and re.search(r'\b(price|cost|range|charging|battery)\b', normalize(question)):
        previous = next((h for h in reversed(history or []) if h.get('role') == 'user'), None)
        if previous:
            return identify(previous.get('content', ''))
    if not vehicles and brands:
        vehicles = [v for v in CATALOG['vehicles'] if any(b['make'] == v['make'] for b in brands)]
    if not brands:
        brands = [b for b in CATALOG['brands'] if any(v['make'] == b['make'] for v in vehicles)]
    return brands, vehicles


def reference_knowledge(question, history=None):
    listing = resolve_list(question, history, identify, CATALOG)
    if listing is not None:
        return {**listing, 'context': json.dumps({'policy': CATALOG['notice'], **listing}, ensure_ascii=False),
                'brands': list(dict.fromkeys(v['make'].lower() for v in listing['vehicles'])),
                'sources': list(dict.fromkeys(url for v in listing['vehicles'] for url in [v['source_url'], v.get('price_reference', {}).get('source_url')] if url)), 'mode': 'catalog', 'notice': ''}
    brands, vehicles = identify(question, history)
    return {'context': json.dumps({'policy': CATALOG['notice'], 'vehicles': vehicles}, ensure_ascii=False),
            'vehicles': vehicles, 'brands': [b['make'].lower() for b in brands],
            'sources': list(dict.fromkeys(url for v in vehicles for url in [v['source_url'], v.get('price_reference', {}).get('source_url')] if url)), 'mode': 'catalog',
            'notice': 'Reference catalog; confirm the variant and current dealer quote.' if vehicles else ''}


def retrieve_knowledge(question, history=None):
    reference = reference_knowledge(question, history)
    if reference.get('intent', {}).get('kind') == 'list':
        return reference
    # Fixed server configuration, never a URL supplied by a chat user.
    endpoint = os.getenv('EV_KNOWLEDGE_API_URL', 'http://127.0.0.1:5000/api/ev/context')
    if os.getenv('EV_LIVE_CONTEXT_ENABLED', 'true').lower() == 'false':
        return reference
    try:
        request = Request(endpoint, data=json.dumps({'message': question, 'history': (history or [])[-8:]}).encode(),
                          headers={'Content-Type': 'application/json'}, method='POST')
        with urlopen(request, timeout=7) as response:
            raw = response.read(150_001)
        if len(raw) > 150_000:
            raise ValueError('Context response too large')
        result = json.loads(raw)
        if not isinstance(result.get('context'), str) or not isinstance(result.get('sources'), list):
            raise ValueError('Invalid context service response')
        return {**reference, **result}
    except Exception:
        return reference


def reference_answer(question, knowledge):
    if knowledge.get('intent', {}).get('kind') == 'list':
        return list_answer(question, knowledge)
    vehicles = knowledge.get('vehicles', [])
    if vehicles:
        current = bool(re.search(r'price|cost|on.?road|latest|current|today|aaj|abhi|subsid', question, re.I))
        lines = ['**EV price references:**' if current else '**EV model overview:**']
        for v in vehicles[:18]:
            lines.append(f"### {v['make']} {v['model']}")
            if current or v.get('price_reference'):
                lines.append('- ' + price_line(v))
            for field, label in [('electric_range', 'range'), ('battery_capacity', 'battery'),
                                 ('charge_power_max', 'charging'), ('top_speed', 'top speed')]:
                if v.get(field):
                    lines.append(f'- {label}: {v[field]}')
            if not v.get('electric_range') and not v.get('price_reference'):
                lines.append('- Detailed specifications need a variant-specific source.')
        lines.extend(['', 'Reference specifications and advertised prices; model year, market and test cycle can differ. Exact current on-road price is not confirmed here.',
                      'Which city and variant do you want a quote for?' if current else 'Which model would you like to compare or explore?'])
        return '\n'.join(lines)
    if re.match(r'^(hi|hello|hey|namaste)\b', question, re.I):
        return 'Namaste! Ask about an EV brand or model, for example “give data of Ather” or “BMW iX1 range”.'
    if re.search(r'charg|battery', question, re.I):
        return 'Charging time depends on battery size, charger power and state of charge. Which EV model are you considering?'
    if re.search(r'list|brands|models|vehicles', question, re.I):
        return 'Catalog brands: ' + ', '.join(b['make'] for b in CATALOG['brands']) + '. Which brand should I show?'
    return 'I do not have a confirmed source for that question yet. Share the EV brand/model and the detail you need. General AI answers require the configured AI service.'
