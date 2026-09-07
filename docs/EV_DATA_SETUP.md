# EV search and sourced chat

Explorer and both chat backends share `shared/ev-catalog.json`: 18 brands and
51 model entries. It is a reference catalog, not exhaustive worldwide stock.
Unconfirmed specifications are left blank; historical rows retain model years.
A manufacturer homepage is not proof of today's model specifications.

BMW, Tesla and Ather work without provider keys. Brand-only queries, aliases,
Hindi brand names and follow-ups such as “iski range?” resolve to the relevant
catalog records. An unknown new brand does not inherit the previous brand.

## Live data setup

1. Set `EV_API_KEY` in **backend/.env** to your API Ninjas key. Structured
   specifications are fetched with a 4.5-second timeout and 15-minute cache.
   Missing keys, denied access, rate limits and empty results are distinct states.
   API Ninjas restricts some fields and result counts by plan. This API is not
   a current on-road price or dealer inventory feed.
2. `EV_LIVE_WEB_ENABLED=true` enables official HTML page retrieval for matched
   brands. Only checked-in URLs are fetched, at most two per question. No user
   URLs or redirects are followed. Responses are size/time limited and scripts
   are removed. The remaining excerpts are untrusted evidence, not instructions.
   JavaScript-only, blocked or unavailable pages fall back to reference data.
   Cached responses preserve the original retrieval time; fetching a historical
   page today does not make its facts current.
3. Set `MISTRAL_API_KEY` in **rag-service/.env** for generative answers. Python
   combines Chroma documents with the shared evidence endpoint, default
   `EV_KNOWLEDGE_API_URL=http://127.0.0.1:5000/api/ev/context`. Configure an
   internal backend hostname when deployed. Brand-specific vector queries use
   a brand filter. Node chat uses the same retrieval if Python is unavailable.
   Without a key, deterministic catalog answers still work.

Keep all keys in private environment files. No provider credentials are included.

## Windows

From `D:\EV-AI-Business-Automation-Platform`, with your Python virtual
environment active and the old server stopped:

```powershell
npm run setup:rag
npm run rag:ingest
npm run dev:all
```

`rag:ingest` requires a valid Mistral key and replaces the current Chroma index.
It indexes the populated Ather document. Basic brand answers use the shared
catalog directly and work before reindexing. Restart after changing catalog,
credentials or index. `setup:rag` also installs a missing `uvicorn` module.

## Verify

- Search `BMW `, `Tesla `, `Ather`, mixed-case brands and specific models.
- Ask “give data of ather”, “Ather ke models batao”, “BMW iX1 range”, then
  “iski battery?”. Check the model and source links.
- Missing/invalid API keys must retain catalog results with provider status.
- Unknown models must produce an evidence gap, not invented specifications.
- Compare exact variants: IDC, MIDC and WLTP are different range test cycles.

Coverage and answer accuracy cannot be guaranteed for every vehicle/question.
Dealer/OEM inventory feeds are needed for guaranteed current quotes; ask the
customer for city and variant. No local reference is labeled live inventory.

References:
- https://api-ninjas.com/api/electricvehicle
- https://www.atherenergy.com/450
- https://www.atherenergy.com/electric-scooter-all-models
- https://media.atherenergy.com/Ather-Rizta-Brochure.pdf
- https://www.tesla.com/en_in/modely
- https://www.bmw.in/en/all-models/bmw-i/iX1/2025/bmw-ix1-highlights.html

## Structured conversations and dated price references

The same `fix/ev-search-rag-coverage` branch now includes the affordable billing changes from PR #3 (Starter ₹499/month, Growth ₹1,000/month and Enterprise ₹2,499/month). Restart both backend and frontend after pulling: the landing page and checkout read the backend catalog.

EV chat supports counted model lists, two-/four-wheeler categories, and scoped follow-ups without requiring an AI key or a live provider call. Examples covered in the shared regression fixtures:

- `Give me 20 list of both two vehicles and four vehicles` → 20 catalog entries grouped into 8 two-wheelers and 12 four-wheelers.
- `which 2 vehicle are availbe from this companies ?` → the two-wheeler category from the preceding scope.
- `Ather and TVS models`, then `which two-wheelers are available from these companies?` → only those brands.
- `Show 20 two-wheelers` → the 8 recorded entries with an explicit shortfall, without inventing another 12.
- `Ather 450X price` → a manufacturer advertised price reference with its checked date; a current city/variant on-road quote remains separate.

`vehicle_type` and optional `price_reference` live in `shared/ev-catalog.json`. Every reference price has an amount in INR, a precise label, source URL, checked date and `is_on_road_quote: false`. Prices are not available for every catalog model. Ather 450S/450X and Rizta starting prices were checked against https://www.atherenergy.com/450 and https://www.atherenergy.com/rizta on 2026-09-07. BMW iX1 LWB's reference is explicitly an advertised introductory price from its linked manufacturer page. Never replace these with an unlabeled EMI, battery-rental upfront amount or another city's on-road quote.

This is a retrieval and response-routing improvement, not foundation-model fine-tuning. General questions still use the configured Mistral service and retrieved context; catalog coverage is finite and does not prove current inventory. The live page and API adapters retain timeouts, caching and source boundaries. No real payment, Mistral completion or dealer inventory transaction is part of the automated tests.

Run the conversation regressions:

```powershell
npm --prefix backend test
python -m unittest discover -s rag-service -p "test_ev_catalog.py"
```

The browser formats numbered answers and collapses references, keeping more space for the actual answer. Long prior messages are bounded to the Python API's history limit.
