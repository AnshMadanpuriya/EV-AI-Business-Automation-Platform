# Conversational EV guidance

The old fallback matched any battery/charging keyword to the same sentence. It also missed `hy` and ordinary buying questions. Both Node and Python now use shared English/Hinglish guidance rules, recognize purchase steps, and build category-scoped model comparisons from the existing catalog. Greetings and explicit category changes reset the earlier topic; recommendation follow-ups can inherit the previous user category.

`shared/ev-advice.json` contains general guidance and language patterns. `backend/services/evAdvice.js` and `rag-service/ev_advice.py` handle bounded comparisons. Price references retain source/date labels. Unknown capacities are not filled in, and larger capacity is not presented as proof of battery reliability. The catalog is not exhaustive or guaranteed current. Price/battery queries explain missing comparable prices rather than fabricate a cheapest winner.

With a working MISTRAL_API_KEY, recommendation context is sent to the model for conversational reasoning; general FAQs stay fast. Python avoids an unnecessary vector embedding call when structured advice context is already available. Without a working AI provider, the relevant structured fallback still works. No new LLM training or exhaustive live-market verification is claimed. Exact prices, warranties and availability require model/variant-specific current sources.

After pulling `fix/ev-search-rag-coverage`, restart both backend and Python RAG using `npm run dev:all`. A browser-only refresh cannot reload the server code. Keep private MISTRAL_API_KEY in the service environment; do not commit it. Test these turns in one conversation:

1. Fast charging ke baare mein batao
2. Which evehicle has best battery among all two wheelers vehicle?
3. hy
4. how i purchase ev
5. which is best car ev in temrs of price and battery

Expected: a Hinglish charging explanation, two-wheeler comparison, greeting, buying checklist and car comparison, respectively. Both Node and Python have regression tests for this sequence, category isolation and missing battery data. General charging guidance references https://afdc.energy.gov/fuels/electricity-stations .
