"""Model lists, budget-safe continuation and source labels without an external AI call."""
import json
import re
from pathlib import Path
RULES = json.loads((Path(__file__).parent.parent/'shared/ev-advice.json').read_text())

def record_id(v):
    return v['make']+'|'+v['model']

def budget_from(text):
    match = re.search(RULES['budget'], text, re.I) or re.fullmatch(r'([\d,]+(?:\.\d+)?)\s*(k|lakh?s?|lacs?|thousand)?[!.? ]*', text.strip(), re.I)
    if not match: return None
    groups = match.groups() + (None, None)
    value = float((groups[0] or groups[2]).replace(',', ''))
    unit = (groups[1] or groups[3] or '').lower()
    value *= 100000 if unit.startswith('la') else 1000 if unit in ('k','thousand') else 1
    return int(value) if 1000 <= value <= 100000000 else None

def subtype_from(text):
    scooter = bool(re.search(r'\bscooters?\b', text, re.I))
    bike = bool(re.search(r'\b(bikes?|motorcycles?)\b', text, re.I))
    return None if scooter == bike else 'scooter' if scooter else 'motorcycle'

def list_intent(question):
    text = re.sub(r'[-/]', ' ', re.sub(r'\b(suggesy|sugest|sugges|suffest)\b', 'suggest', question.lower()))
    two = bool(re.search(r'\b(two|2)\s*(wheelers?|wheels?)\b|\btwo\s*vehicles?\b|\b(scooters?|bikes?|motorcycles?)\b', text) or (re.search(r'\b2\s*vehicles?\b', text) and re.search(r'\b(both|which)\b', text)))
    four = bool(re.search(r'\b(four|4)\s*(wheelers?|wheels?)\b|\bfour\s*vehicles?\b|\bcars?\b', text) or (re.search(r'\b4\s*vehicles?\b', text) and re.search(r'\b(both|which)\b', text)))
    more = bool(re.search(r'\b(more|other|another|additional|next|aur)\b', text))
    bare_more = bool(re.fullmatch(r'(?:(?:please|suggest|show|give|me|some|a few|more|others?|next|names?|options?|aur|batao|dikhao)\s*)+[.!?]*', text))
    named_list = bool(re.search(r'\b(list|names?|models|options)\b', text))
    listing = bool((named_list or re.search(r'\b(evs|vehicles)\b', text) or two or four) and re.search(r'\b(list|names?|which|what|show|give|suggest|recommend|all|available|availbe|kaun|konsi|batao|more|other|next)\b', text))
    if more and bare_more: listing = True
    if re.search(r'range|battery|charg|fastest|best|highest|lowest|compare', text) and not named_list: listing = False
    if re.search(r'more\s+(details|information|info)', text) and not named_list: listing = False
    count_text = re.sub(RULES['budget'], '', text, flags=re.I)
    count_text = re.sub(r'\b(two|four|2|4)\s*(wheelers?|wheels?)\b', '', count_text)
    if re.search(r'\b(both|which)\b', text): count_text = re.sub(r'\b(two|four|2|4)\s*vehicles?\b', '', count_text)
    count = re.search(r'\b(\d{1,3})\b', count_text)
    return dict(kind='list' if listing else 'details', more=more, vehicle_subtype=subtype_from(text), explicit_category=two or four,
                category='both' if two and four else 'two_wheeler' if two else 'four_wheeler' if four else 'both', count=min(100,max(1,int(count[1]))) if count else None)

def clean_catalog_context(value, catalog):
    if not isinstance(value,dict) or value.get('version') != 1 or value.get('category') not in ['both','two_wheeler','four_wheeler']: return None
    ids={record_id(v) for v in catalog['vehicles']}; makes={b['make'] for b in catalog['brands']}
    budget=value.get('budget_inr')
    return dict(version=1,category=value['category'],vehicle_subtype=value.get('vehicle_subtype') if value.get('vehicle_subtype') in ['scooter','motorcycle'] else None,brands=[s for s in value.get('brands',[]) if isinstance(s,str) and s in makes][:60] if isinstance(value.get('brands'),list) else [],
                budget_inr=budget if type(budget) in (int,float) and 1000<=budget<=100000000 else None,
                seen=list(dict.fromkeys(s for s in value.get('seen',[]) if isinstance(s,str) and s in ids))[:200] if isinstance(value.get('seen'),list) else [])

def context_for(knowledge):
    if knowledge.get('catalog_context'):return knowledge['catalog_context']
    vehicles=knowledge.get('vehicles',[])
    if not vehicles:return None
    intent=knowledge.get('intent',{}); types=list(dict.fromkeys(v['vehicle_type'] for v in vehicles))
    return dict(version=1,vehicle_subtype=intent.get('vehicle_subtype'),category=intent.get('category') or (types[0] if len(types)==1 else 'both'),
                brands=intent.get('scope_brands',[]) if intent.get('kind')=='recommendation' else list(dict.fromkeys(v['make'] for v in vehicles)),
                budget_inr=intent.get('budget_inr'),seen=[record_id(v) for v in vehicles])

def resolve_list(question, history, identify, catalog, supplied_context=None):
    intent=list_intent(question)
    previous=[h for h in reversed(history or []) if h.get('role')=='user']
    referring=bool(re.search(r'\b(these|those|this companies|same|above|their|them|inki|inke|in companies)\b', question,re.I))
    if intent['kind']!='list' and referring and re.search(r'price|cost',question,re.I) and previous:intent.update(list_intent(previous[0]['content']))
    if intent['kind']!='list':return None
    brands=[b['make'] for b in identify(question)[0]]
    context=clean_catalog_context(supplied_context,catalog)
    if not context and (intent['more'] or referring):
        prior=next((h for h in previous if list_intent(h['content'])['explicit_category'] or identify(h['content'])[0] or re.search(r'\b(ev|vehicles|models)\b',h['content'],re.I)),None)
        if prior:
            seen=[record_id(v) for h in (history or []) if h.get('role')=='assistant' for v in identify(h['content'])[1]]
            context=dict(version=1,category=list_intent(prior['content'])['category'],vehicle_subtype=subtype_from(prior['content']),brands=[b['make'] for b in identify(prior['content'])[0]],budget_inr=budget_from(prior['content']),seen=seen)
    if (intent['more'] or referring) and context:
        brands=brands or context['brands']
        if not intent['explicit_category']:
            intent['category']=context['category']
            intent['vehicle_subtype']=context.get('vehicle_subtype')
    budget=budget_from(question)
    if budget is None and intent['more'] and context and (not intent['explicit_category'] or intent['category']==context['category']):budget=context['budget_inr']
    seen=list(dict.fromkeys(context['seen'])) if intent['more'] and context else []
    blocked=['racing-platform','demonstration-reference','announced-reference','prebooking-closed']
    pool=[v for v in catalog['vehicles'] if (not brands or v['make'] in brands) and (intent['category']=='both' or v['vehicle_type']==intent['category'])
          and (not intent['vehicle_subtype'] or v.get('vehicle_subtype')==intent['vehicle_subtype']) and v.get('model_status')!='unverified-name' and (budget is None or (v.get('model_status') not in blocked and (not v.get('price_reference') or v['price_reference']['amount_inr']<=budget)))]
    remaining=[v for v in pool if record_id(v) not in seen];limit=intent['count'] or 20
    if intent['category']=='both':
        two=[v for v in remaining if v['vehicle_type']=='two_wheeler'];four=[v for v in remaining if v['vehicle_type']=='four_wheeler']
        selected_four=four[:limit-min(len(two),(limit+1)//2)];vehicles=two[:limit-len(selected_four)]+selected_four
    else:vehicles=remaining[:limit]
    seen=list(dict.fromkeys(seen+[record_id(v) for v in vehicles]))
    return dict(intent={**intent,'budget_inr':budget},vehicles=vehicles,total_matches=len(pool),requested_count=intent['count'],remaining_count=len(remaining)-len(vehicles),
                catalog_context=dict(version=1,category=intent['category'],vehicle_subtype=intent['vehicle_subtype'],brands=brands,budget_inr=budget,seen=seen[:200]))

def inr(amount):
    digits=str(int(amount));last=digits[-3:];prefix=digits[:-3];groups=[]
    while prefix:groups.insert(0,prefix[-2:]);prefix=prefix[:-2]
    return '₹'+','.join(groups+[last])

def price_line(vehicle):
    p=vehicle.get('price_reference')
    return f"{inr(p['amount_inr'])} — {p['label']}; reference checked {p['checked_at']}." if p else 'Price: a verified amount is not available in this catalog.'

def list_answer(question,knowledge):
    vehicles=knowledge.get('vehicles',[]);intent=knowledge.get('intent',{})
    if not vehicles:
        return 'You have seen all matching models in this catalog. I will not repeat them. Try another category, brand or budget to broaden the list.' if intent.get('more') and knowledge.get('total_matches',0)>0 else 'No matching models in this reference catalog for those filters. This does not establish market unavailability. Try another brand, category or budget.'
    extra=' more' if intent.get('more') else '';lines=[f'**{len(vehicles)}{extra} EV models from the reference catalog**']
    if (knowledge.get('requested_count') or 0)>len(vehicles):
        extra=' that you have not seen' if intent.get('more') else ''
        lines.append(f"You requested {knowledge['requested_count']}; only {len(vehicles)} matching entries are recorded here{extra}.")
    if intent.get('budget_inr'):lines.append('Budget filter uses dated advertised prices. Models without a price need a dealer quote; they are not confirmed within your budget.')
    index=0
    for kind,title in [('two_wheeler','Two-wheelers (scooters / bikes)'),('four_wheeler','Four-wheelers (cars / SUVs)')]:
        group=[v for v in vehicles if v['vehicle_type']==kind]
        if not group:continue
        lines.extend(['',f'### {title}'])
        for v in group:
            index+=1;status=' — '+v['model_status'].replace('-',' ') if v.get('model_status') and v['model_status']!='reference' else ''
            price=' — '+price_line(v) if re.search(r'price|cost',question,re.I) else ' — price quote needed' if intent.get('budget_inr') and not v.get('price_reference') else ''
            lines.append(f"{index}. **{v['make']} {v['model']}**{status}{price}")
    lines.extend(['','These are catalog models, not confirmed local stock. Availability varies by market, city and variant.'])
    if knowledge.get('remaining_count',0)>0:lines.append(f"{knowledge['remaining_count']} more matching models are recorded. Ask “more names” to continue.")
    if re.search(r'price|cost',question,re.I):lines.append('Listed prices are dated references, not current on-road quotes. Which city and variant should we check?')
    return '\n'.join(lines)
