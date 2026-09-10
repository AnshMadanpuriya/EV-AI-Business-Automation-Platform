"""Dependency-free lexical retrieval; shared with the Node vehicle explorer."""
import json
import os
import re
import unicodedata
from pathlib import Path
from urllib.request import Request, urlopen
from ev_advice import advice_knowledge
from ev_conversation import resolve_list, list_answer, price_line, context_for

CATALOG = json.loads((Path(__file__).resolve().parent.parent / 'shared' / 'ev-catalog.json').read_text(encoding='utf-8'))


def normalize(value):
    return ' '.join(''.join(c if c.isalnum() else ' ' for c in unicodedata.normalize('NFKD', str(value)).lower() if not unicodedata.combining(c)).split())


def contains(text, phrase):
    return f' {normalize(phrase)} ' in f' {normalize(text)} '


def identify(question, history=None):
    brands = [b for b in CATALOG['brands'] if any(contains(question, a) for a in [b['make'], *b['aliases']])]
    candidates = []
    for v in CATALOG['vehicles']:
        aliases = [v['model'], *v.get('model_aliases', []), re.sub(r'\b(electric|ev)\b', '', v['model'], flags=re.I).strip()]
        spans = [normalize(a) for a in aliases if normalize(a) and contains(question, a)
                 and ((len(normalize(a)) >= 3 and normalize(a) not in ['one','air','eva','crossover']) or any(b['make'] == v['make'] for b in brands))]
        if spans and (not brands or any(b['make'] == v['make'] for b in brands)):
            candidates.append((v, spans))
    vehicles = [v for v, spans in candidates if not any(other is not v and other['make'] == v['make']
                and all(any(long != span and contains(long, span) for long in other_spans) for span in spans)
                for other, other_spans in candidates)]
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


FAST_RULES = json.loads((Path(__file__).resolve().parent.parent / 'shared' / 'ev-fast-answer.json').read_text())


def can_answer_from_catalog(question, brands, vehicles):
    if re.fullmatch(r'(hi|hello|hey|namaste)[!?.\s]*', question.strip(), re.I):
        return True
    if not vehicles:
        return False
    if all(v.get('model_status') == 'unverified-name' for v in vehicles):
        return True
    if any(v.get('knowledge_status') == 'source-linked' and not v.get('battery_capacity') and not v.get('electric_range') for v in vehicles):
        return False
    remaining = f' {normalize(question)} '
    names = [name for b in brands for name in [b['make'], *b['aliases']]]
    names += [name for v in vehicles for name in [*v.get('model_aliases', []), v['model'], re.sub(r'\b(EV|Electric)\b', '', v['model'], flags=re.I).strip()]]
    if any(v['model'] == 'iX1 LWB' for v in vehicles):
        names.append('iX1')
    if any(v['make'] == 'Tesla' and v['model'].startswith('Model Y') for v in vehicles):
        names.append('Model Y')
    for name in sorted(names, key=len, reverse=True):
        remaining = remaining.replace(f' {normalize(name)} ', ' ')
    if not all(word in FAST_RULES['words'].split() for word in remaining.split()):
        return False
    return all(not contains(question, word) or all(v.get(field) for v in vehicles)
               for word, field in FAST_RULES['fields'].items())


def reference_knowledge(question, history=None, catalog_context=None):
    listing = resolve_list(question, history, identify, CATALOG, catalog_context)
    if listing is not None:
        return {**listing, 'context': json.dumps({'policy': CATALOG['notice'], **listing}, ensure_ascii=False),
                'brands': list(dict.fromkeys(v['make'].lower() for v in listing['vehicles'])),
                'sources': list(dict.fromkeys(url for v in listing['vehicles'] for url in [v['source_url'], v.get('price_reference', {}).get('source_url')] if url)), 'mode': 'catalog', 'notice': ''}
    advice = advice_knowledge(question, history, identify, CATALOG)
    if advice:
        return advice
    brands, vehicles = identify(question, history)
    return {'context': json.dumps({'policy': CATALOG['notice'], 'vehicles': vehicles}, ensure_ascii=False),
            'vehicles': vehicles, 'fast_answer': can_answer_from_catalog(question, brands, vehicles), 'brands': [b['make'].lower() for b in brands],
            'sources': list(dict.fromkeys(url for v in vehicles for url in [v['source_url'], v.get('price_reference', {}).get('source_url')] if url)), 'mode': 'catalog',
            'notice': 'Reference catalog; confirm the variant and current dealer quote.' if vehicles else ''}


def retrieve_knowledge(question, history=None, catalog_context=None):
    reference = reference_knowledge(question, history, catalog_context)
    if reference.get('fast_answer') or reference.get('intent', {}).get('kind') == 'list':
        return reference
    # Fixed server configuration, never a URL supplied by a chat user.
    endpoint = os.getenv('EV_KNOWLEDGE_API_URL', 'http://127.0.0.1:5000/api/ev/context')
    if os.getenv('EV_LIVE_CONTEXT_ENABLED', 'true').lower() == 'false':
        return reference
    try:
        request = Request(endpoint, data=json.dumps({'message': question, 'history': (history or [])[-8:], 'catalog_context': catalog_context}).encode(),
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
    if knowledge.get('advice_answer'):
        return knowledge['advice_answer']
    if knowledge.get('intent', {}).get('kind') == 'list':
        return list_answer(question, knowledge)
    vehicles = knowledge.get('vehicles', [])
    if vehicles:
        current = bool(re.search(r'price|cost|on.?road|latest|current|today|aaj|abhi|subsid', question, re.I))
        lines = ['**EV price references:**' if current else '**EV model overview:**']
        for v in vehicles[:18]:
            lines.extend([f"### {v['make']} {v['model']}", v.get('description','')])
            if v.get('model_status') and v['model_status'] != 'reference':
                lines.append(f"- Status: {v['model_status'].replace('-', ' ')}. {v.get('data_note','')}")
            lines.append(f"- Market: {v.get('market','confirm region')}")
            if current or v.get('price_reference'):
                lines.append('- ' + price_line(v))
            if current and v.get('pricing_note'):
                lines.append('- ' + v['pricing_note'])
            for field, label in [('electric_range', 'Range'), ('battery_capacity', 'Battery'), ('battery_type','Battery chemistry'),
                                 ('charge_power_max', 'Peak charging'), ('charging_time','Charging time'), ('top_speed', 'Top speed')]:
                if v.get(field):
                    lines.append(f'- {label}: {v[field]}')
            if not v.get('electric_range') or not v.get('battery_capacity'):
                lines.append('- This model is recognized; missing specifications need confirmation for its exact variant and model year.')
            if v.get('verified_at'):
                lines.append(f"- Reference checked: {v['verified_at']}")
            if v.get('source_url'):
                lines.append(f"[Manufacturer source]({v['source_url']})")
        lines.extend(['', 'Reference specifications and advertised prices; model year, market and test cycle can differ. Exact current on-road price is not confirmed here.',
                      'Which city and variant do you want a quote for?' if current else 'Which model would you like to compare or explore?'])
        return '\n'.join(lines)
    if re.match(r'^(hi|hello|hey|namaste)\b', question, re.I):
        return 'Namaste! Ask about an EV brand or model, for example “give data of Ather” or “BMW iX1 range”.'
    if re.search(r'list|brands|models|vehicles', question, re.I):
        return 'Catalog brands: ' + ', '.join(b['make'] for b in CATALOG['brands']) + '. Which brand should I show?'
    return 'I do not have a confirmed source for that question yet. Share the EV brand/model and the detail you need. I can help with buying steps, charging basics, or a comparison once I know what you need.'
