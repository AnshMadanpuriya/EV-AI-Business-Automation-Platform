# Conversational EV guidance

The old fallback matched any battery/charging keyword to the same sentence. It also missed `hy` and ordinary buying questions. Both Node and Python now use shared English/Hinglish guidance rules, recognize purchase steps, and build category-scoped model comparisons from the existing catalog. Greetings and explicit category changes reset the earlier topic; recommendation follow-ups can inherit the previous user category.

`shared/ev-advice.json` contains general guidance and language patterns. `backend/services/evAdvice.js` and `rag-service/ev_advice.py` handle bounded comparisons. Price references retain source/date labels. Unknown capacities are not filled in, and larger capacity is not presented as proof of battery reliability. The catalog is not exhaustive or guaranteed current. Price/battery queries explain missing comparable prices rather than fabricate a cheapest winner.

With a working MISTRAL_API_KEY, recommendations without a known budget can use the model for conversational reasoning. Budget shortlists and general FAQs use fast structured answers without waiting for external AI or scraping. Python avoids an unnecessary vector embedding call when structured advice context is already available. Without a working AI provider, the relevant structured fallback still works. No new LLM training or exhaustive live-market verification is claimed. Exact prices, warranties and availability require model/variant-specific current sources.

After pulling `fix/ev-search-rag-coverage`, restart both backend and Python RAG using `npm run dev:all`. A browser-only refresh cannot reload the server code. Keep private MISTRAL_API_KEY in the service environment; do not commit it. Test these turns in one conversation:

1. Fast charging ke baare mein batao
2. Which evehicle has best battery among all two wheelers vehicle?
3. hy
4. how i purchase ev
5. which is best car ev in temrs of price and battery

Expected: a Hinglish charging explanation, two-wheeler comparison, greeting, buying checklist and car comparison, respectively. Both Node and Python have regression tests for this sequence, category isolation and missing battery data. General charging guidance references https://afdc.energy.gov/fuels/electricity-stations .

## Budget and short follow-ups

Both chat paths reconstruct the active request from up to ten supplied user turns. `100000`, `₹1,00,000`, `100k`, `1 lakh` and `1 lac` are rupee budgets; battery sizes and range numbers are not budgets. `scooters`, `my budget is 80k` and `suffest by your own` continue the recommendation. A new greeting, unrelated topic or change from scooters to cars clears stale constraints. No permanent per-user memory or new model training is involved; the browser supplies a bounded recent history.

Regression sequence:

1. `so which ev two vehicle is best in range near 100000 in terms of best battery and charging`
2. `scooters`
3. `suffest by your own`

All three responses keep the scooter category and ₹1 lakh budget, name a priced candidate and display battery, advertised range and charging information. Unknown-price alternatives are explicitly labelled as needing a quote. A supplied budget is not requested again. A model with a known reference price above the budget is excluded from the shortlist. This filters advertised reference prices, not verified current on-road quotes or live stock.

Added manufacturer references checked on 2026-09-09:

- [TVS homepage](https://www.tvsmotor.com/) advertises Orbiter starting at ₹99,250 alongside 3.1 kWh and 158 km IDC range. This starting figure does not establish the user's exact variant/city price. The [Orbiter page](https://www.tvsmotor.com/electric-scooters/tvs-orbiter) distinguishes V1/V2 specifications, lists the 3.1 kWh version's 0–80% charging as 4 h 10 min with the included 650 W charger or 2 h 38 min with the optional 950 W charger, and illustrates a higher location-dependent price. The answer explicitly warns that on-road cost can exceed ₹1 lakh.
- [Chetak C3001](https://www.chetak.com/series-30/chetak-c3001) supplies 3.0 kWh, claimed 127 km range and 0–80% charging in 2 h 55 min. No price was captured; it must not be called a verified budget match.

These reference snapshots will age. Update the structured records from manufacturer sources as prices/variants change. Charging windows, chargers, test cycles and variant differences must remain visible. The limited catalog cannot establish an overall market winner or battery reliability ranking.

## Dashboard after authentication

Get Started → login/signup now defaults to `/dashboard`. Public customers see their own account information and actions to explore vehicles, request test drives or open the EMI calculator. Business plans are optional navigation. Explicit `/login?next=/subscribe/...` intent still returns to the selected checkout.

The existing owner/agent/viewer CRM dashboard remains role-restricted. Public users never mount its components, including when visiting nested `/dashboard/leads` URLs, and backend staff endpoints still reject their tokens. Opening a customer dashboard does not grant a paid subscription or staff privileges.
