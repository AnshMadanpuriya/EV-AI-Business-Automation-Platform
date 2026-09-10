# EV knowledge coverage and chat continuation

The shared catalog contains 143 model/variant records across 59 brands (53 two-wheelers and 90 four-wheelers). It retains the previous records and recognizes all 133 distinct spellings in `shared/ev-requested-models.json`, including aliases such as Ather Apex, Hyundai Creta Electric, BMW iX1 and Volkswagen ID.Buzz.

## What happens when a customer asks

- Lists and “more names” are answered locally without waiting for an LLM or online lookup. They respect requested counts, brand, wheel category, scooter/motorcycle subtype and an active budget. The browser passes bounded catalog context to either backend so continuation survives an API fallback and truncated conversation history. New chat clears it.
- Recommendations use dated catalog facts. Known prices above budget are excluded; unknown prices are quote candidates, never confirmed affordable choices. Larger battery capacity is not evidence of better reliability.
- Exact model/variant matching prefers a longer named variant (iQube ST) over its contained family name (iQube). Generic words like “one” cannot accidentally select LiveWire ONE.
- Questions needing missing or current details attempt the selected model's configured manufacturer URL and the optional vehicle API. Brand-only questions use the brand source. Fetches are bounded to two brands, with request deadlines, bounded response sizes, cache and request deduplication. Catalog fallback remains available after provider errors.
- Only checked-in manufacturer URLs are fetched. User-supplied URLs and redirects are not followed. Navigation, scripts, styles and footers are excluded from extracted text; a model lookup must find that model in the remaining page. Pages and catalog records remain untrusted evidence, not executable instructions.
- Mistral composes reasoned answers using the structured records, retrieved official excerpts and optional Chroma documents. Without an AI key, structured catalog/list/guidance replies remain available; arbitrary page interpretation is not claimed.

## Facts and coverage limits

A recognized name does not mean every specification has been verified. Many international and historical entries link to a manufacturer but intentionally have missing numeric fields. `knowledge_status=source-linked` means that current specs still need confirmation. `verified-reference` records include a verification date; the source may subsequently change. Existing historical records retain their original provenance.

Manufacturer-checked additions include the e Vitara, Hector Tomahawk EV, Carens Clavis EV, Vayve Eva, F77 Mach 2, BMW CE 04/02, Nevera and NQi GTS. Their source URLs and variant/cycle notes live with their data. The MG and Kia battery-rental offers are separate from battery-inclusive purchase prices. No unverified battery-inclusive price is invented from a lower BaaS chassis price.

The exact names Citroen eC3X, Kia Syros EV and Tata Sierra EV are retained as unverified names against the checked sources. This does not prove they can never launch. F99 is labelled as a racing platform, Yamaha E01 as a demonstration reference and several older variants as legacy references. They are not silently presented as currently available retail vehicles. The old Tork domain was excluded because it redirected to unrelated content; its historical model identity remains recognizable.

This catalog is not an exhaustive worldwide inventory, a dealer stock feed or a guaranteed current on-road quote. JavaScript-only, blocked or changed manufacturer pages may not be readable. Live retrieval timestamps do not establish publication dates. Confirm variant, region, price, availability, battery rental and charging conditions before purchasing.

## Local setup (Windows PowerShell)

From `D:\EV-AI-Business-Automation-Platform`, use the updated branch `fix/ev-search-rag-coverage`. These changes are in PR #4 until it is merged; pulling `main` alone does not install them. Preserve any local edits before switching/pulling.

```powershell
npm run setup:node
.\.venv\Scripts\Activate.ps1
npm run setup:rag
```

Set the existing private configuration; never commit keys:

- `rag-service/.env`: `MISTRAL_API_KEY` for generative RAG. `EV_KNOWLEDGE_API_URL` defaults to `http://127.0.0.1:5000/api/ev/context`. `EV_LIVE_CONTEXT_ENABLED` defaults to true.
- `backend/.env`: optional `EV_API_KEY` for API Ninjas; `EV_LIVE_WEB_ENABLED` defaults to true. Official-page retrieval does not need the optional vehicle API key. The Node fallback can use its existing `MISTRAL_API_KEY` setting.

Model recognition, reference facts and lists work immediately after restarting the services; they do not depend on embedding ingestion. To refresh semantic retrieval as well, stop the RAG service and run:

```powershell
npm run rag:ingest
npm run dev:all
```

Ingestion embeds one document per catalog record plus the existing TXT/MD/PDF documents. It requires a working embedding API key and provider quota. A complete new index is built in a unique folder before an atomic manifest makes it active. Failed ingestion leaves the last active index intact. The original `chroma_db` layout is still supported. Restart the RAG service after a successful rebuild. Old indexes remain available for recovery and are not automatically deleted.

## Verification prompts

1. `Give me 20 list of both two vehicles and four vehicles`
2. `give or suggesy more ev names`
3. `more names` (continue until the catalog is exhausted; no repeated IDs)
4. New chat: `best scooter under 1 lakh for range and battery`, then `more names`
5. `BMW CE 04 battery and charging`
6. `MG Hector Tomahawk EV price` (must disclose the per-km battery fee)
7. `Ultraviolette F99` (must disclose racing-platform status)
8. `Kia Carens Clavis EV latest range` (attempts live retrieval)

The automated suite covers these flows in Node and Python, HTTP chat/context APIs, frontend service fallback and clear-chat behavior, source links, blocked pages, and index-publication failure. Live Mistral completions and paid embedding generation require a separately configured local smoke test.
