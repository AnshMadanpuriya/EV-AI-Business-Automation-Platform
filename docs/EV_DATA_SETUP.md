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
