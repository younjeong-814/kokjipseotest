# Food Safety transport diagnosis — 2026-10-26

Shared conversation reviewed. Production recipes/OCR/recognize functions left unchanged in this turn.

Separate `food-safety-transport-check` deployed with default gateway JWT verification enabled. Only returns key presence/length/format, protocol status, API status code, and row count; no keys, URLs, raw bodies, or auth headers.

Observed in Supabase:
- invalid test key over HTTP: 200 / JSON / INFO-100.
- invalid test key over HTTPS: 200 / JSON / INFO-100.
- configured key length: 292; hex20 false; no outer whitespace.
- configured key HTTPS 1 row: 406 / text/html.
- configured key HTTPS 1000 rows: 406 / text/html.
- local working key length: 20; hex20 true. Actual value not printed.

Conclusion: HTTPS-only failure or request page size is not supported by these results. The Supabase secret contains a value that differs in length/format from the local working credential. Replace FOOD_SAFETY_API_KEY with only the actual credential (without variable assignment, quotes, or URL) in the dashboard, then rerun diagnostic and recipe UI. Correction and final success remain pending user secret entry. Existing remote secret was not revealed or changed.

Proof: food-key-format-diagnosis.png.

## Secret correction verification

FOOD_SAFETY_API_KEY updated by user. Re-ran dashboard diagnostic: length 20, hex20 true, configured HTTPS 1-row and 1000-row requests both HTTP 200 / INFO-000 with row counts 1 and 1000. Actual local frontend through Supabase search for onion displayed 519 results. Opened 된장국 detail with image, ingredients, steps, displayed time/difficulty. The latter may be estimated by existing enrichment logic; UI display alone is not proof of successful MAFRA enrichment. FOOD_API_KEY registration was observed by name only; its provider success remains separately unverified. Previous 406 resolved by correcting stored secret, without switching to HTTP or changing production search code this turn. Proof: recipe-search-success.png, recipe-detail-success.png.
