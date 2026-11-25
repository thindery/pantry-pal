# PP-186: Receipt scan AI with a selectable provider (Ollama default, Gemini fallback)

**Status:** 🔨 Built and tested locally on `feature/PP-186-ai-receipt-provider-fallback`. NOT deployed. Waits for Tylor's yes.
**Priority:** P2
**Phase:** Pro features / AI
**Created:** 2026-11-25, 3:40 PM America/Chicago
**Source:** Tylor (voice, 3:37 to 3:46 PM CT)
**Related:** PP-183 (Pro AI via Ollama, separate client and usage metering), PP-185 (no model names in customer-facing text)

---

## Goal

Receipt scanning can use AI, with **Ollama Cloud (`gemma4:cloud`) always the default** and **Gemini (`gemini-3.1-flash-lite`) as the fallback only**. Today the live app uses pytesseract only, and that stays the last resort.

## Behavior

Everything is behind `AI_RECEIPT_SCAN_ENABLED` (default off). Off means exactly today's behavior.

1. The selected provider runs first. The selection is stored server-side in `app_settings` (`ai_receipt_provider`); **no row, a bad value or a DB error = Ollama**.
2. Fallback to the other provider happens **only** when the first one:
   - errors (network, 5xx, bad or unparseable response),
   - times out (`AI_PROVIDER_TIMEOUT_SECONDS`, default 25), or
   - hits a cap/quota (HTTP 402/429, or 403/503 with quota-style text such as "weekly usage limit").
   A provider that answers validly, even with zero items, is final: the fallback is never called "just in case". Zero items then runs pytesseract (today's path), not Gemini.
3. A cap puts that provider on a cooldown (`AI_CAP_COOLDOWN_SECONDS`, default 600, per process) so a weekly cap isn't hammered.
4. If Gemini was **manually selected** and fails, Ollama is tried (reverse fallback only in that case).
5. Both fail = pytesseract, as today. The response `ocrEngine` says `ai` or `pytesseract` (no vendor names in API output).
6. Admin toggle: **Admin > Feature Flags > "Receipt scan AI provider"**, Ollama selected initially. `GET/PUT /api/admin/ai-provider` (admin only). It shows only whether keys are set, never values, and warns when the server flag is off.
7. Log lines carry provider, outcome, HTTP status and the fallback target only, e.g. `ai_receipt provider=ollama outcome=cap detail=http_429 fallback=gemini`. Never keys, response bodies or image data. The Gemini key goes in the `x-goog-api-key` header, never in the URL.
8. Limits: existing per-minute rate limit and monthly tier scan limit still apply; AI skipped for images over `AI_RECEIPT_MAX_IMAGE_BYTES` (6 MB); `num_predict`/`maxOutputTokens` 2048; thinking off.

## Design notes

- `backend/services/ai_providers/` (`base`, `ollama`, `gemini`, orchestrator in `__init__`), `backend/services/app_settings.py`, migration `031_app_settings` (+ rollback), wired in `backend/routers/receipts.py` (threadpool, since the calls block).
- Naming: PP-183 plans `llm_client.py`; this package is separate to avoid a clash. They can share the Ollama call later.
- Migration number 031 is the next free on origin/main. If PP-183 lands one first, renumber.
- **PP-185:** provider names appear only on the admin-only page, never on customer pages.
- `gemma4:cloud` is the alias the signed-in Ollama app on the Mini uses. The server has no daemon and calls `https://ollama.com` directly, so the code maps `gemma4:cloud` to the catalog name `gemma4:31b` (same model) unless `OLLAMA_RECEIPT_MODEL` says otherwise.
- Gemini model is pinned. `gemini-2.5-flash` and `-flash-lite` return 404 for this key, `-latest` aliases are not used, and `gemini-3.5-flash` without a thinking budget timed out at 60 s. `gemini-3.1-flash-lite` read the sample receipt in about 1.8 s, 6 of 6 items. One quick retry on a 503 "high demand"; never on a quota.

## Server env (OVH `/opt/pantry-pal/.env.prod`, never git)

| Var | Value |
|-----|-------|
| `AI_RECEIPT_SCAN_ENABLED` | `1` to turn on (default off) |
| `OLLAMA_HOST`, `OLLAMA_API_KEY` | per PP-183 these were already added on OVH on Nov 25; confirm, no new key needed |
| `OLLAMA_RECEIPT_MODEL` | optional, default `gemma4:cloud` |
| `GEMINI_API_KEY` | **new**, from Tylor's AI Studio key; server env only |
| `GEMINI_RECEIPT_MODEL` | optional, default `gemini-3.1-flash-lite` |

## Tests

- `tests/test_ai_receipt_providers.py` (mocked, 38): default is Ollama (no row, bad value, DB error); Ollama success never calls Gemini; Ollama error, timeout, cap, not configured and unexpected exception each go to Gemini; both fail returns to pytesseract; manual Gemini falls back to Ollama; cap cooldown; flag off and unset; oversize skip; log line has no key; Ollama/Gemini request shape, key in header only, model names; the real "weekly usage limit" 429 text; routes `/api/receipts/scan`; admin GET/PUT.
- `tests/test_app_settings_postgres.py` (real Postgres, `RUN_POSTGRES_TESTS=1`): default Ollama, persist, flip back, reject unknown.
- `tests/test_ai_receipt_live.py` (`RUN_AI_LIVE=1`, local only): real Gemini read of `tests/fixtures/receipt_sample.png` (synthetic), real Ollama Cloud call, real orchestrator.
- `frontend/tests/admin-ai-provider.test.tsx` (vitest) and `e2e/admin-ai-provider.spec.ts` (Playwright): Ollama shown first, switch saves and survives a reload, failure reverts.

## Deploying (after Tylor's yes only)

1. Merge the PR to main (CI green).
2. On OVH, add `GEMINI_API_KEY` (and confirm `OLLAMA_*`) to `.env.prod`; leave `AI_RECEIPT_SCAN_ENABLED` unset or `0` for the first deploy.
3. `pg_dump` backup, then `./deploy/deploy-docker.sh main` (runs migration 031, which only creates `app_settings`).
4. Smoke, then set `AI_RECEIPT_SCAN_ENABLED=1`, restart the backend, check Admin > Feature Flags shows Ollama, scan one receipt, read the `ai_receipt` log line.
5. Rollback: set the flag to 0 and restart. The table can stay; `031_app_settings.rollback.sql` drops it.
