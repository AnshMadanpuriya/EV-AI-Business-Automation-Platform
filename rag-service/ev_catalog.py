"""Dependency-free lexical retrieval; shared with the Node vehicle explorer."""
import json
import os
import re
import unicodedata
from pathlib import Path
from urllib.request import Request, urlopen

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
    brands, vehicles = identify(question, history)
    return {'context': json.dumps({'policy': CATALOG['notice'], 'vehicles': vehicles}, ensure_ascii=False),
            'vehicles': vehicles, 'brands': [b['make'].lower() for b in brands],
            'sources': list(dict.fromkeys(v['source_url'] for v in vehicles)), 'mode': 'catalog',
            'notice': 'Reference catalog; live data could not be checked.'}


def retrieve_knowledge(question, history=None):
    reference = reference_knowledge(question, history)
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
    vehicles = knowledge.get('vehicles', [])
    if vehicles:
        lines = ['**EV details:**']
        if re.search(r'price|cost|on.?road|latest|current|today|aaj|abhi|subsid', question, re.I):
            lines.append('Exact current on-road price is not confirmed here. Please specify your city and variant and check the official source for a quote.')
        for v in vehicles[:8]:
            specs = '; '.join(f'{label}: {v[field]}' for field, label in [('electric_range', 'range'),
                ('battery_capacity', 'battery'), ('charge_power_max', 'charging'), ('top_speed', 'top speed')] if v.get(field))
            lines.append(f"- **{v['make']} {v['model']}:** {specs or 'Exact specifications need a variant-specific source.'}")
        lines.extend(['', 'Reference specifications; model year, market and range test cycle can differ. Which model or variant would you like to explore?'])
        return '\n'.join(lines)
    if re.match(r'^(hi|hello|hey|namaste)\b', question, re.I):
        return 'Namaste! Ask about an EV brand or model, for example “give data of Ather” or “BMW iX1 range”.'
    if re.search(r'charg|battery', question, re.I):
        return 'Charging time depends on battery size, charger power and state of charge. Which EV model are you considering?'
    if re.search(r'list|brands|models|vehicles', question, re.I):
        return 'Catalog brands: ' + ', '.join(b['make'] for b in CATALOG['brands']) + '. Which brand should I show?'
    return 'I do not have a confirmed source for that question yet. Share the EV brand/model and the detail you need. General AI answers require the configured AI service.'
