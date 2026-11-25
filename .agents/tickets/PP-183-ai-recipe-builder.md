# PP-183: AI recipe builder (Pro), recipes from my pantry with metered weekly tokens

**Status:** ✅ Live 4:34 PM CT Nov 25, build `c5cbe9a` ([#122](https://github.com/thindery/pantry-pal/pull/122)). Migration 032 applied. On for Pro (`AI_FEATURES_ENABLED=1`, user cap 40,000/week, global 200,000/week, 10/hour). At deploy, Ollama Cloud answered HTTP 429 (usage limit), so ideas currently come from the Gemini fallback, which is metered against the same caps.
**Priority:** P1
**Phase:** Pro features / AI
**Created:** 2026-11-25, 3:20 PM America/Chicago. Rescoped to "AI recipe builder" 3:54 PM CT (Remy for Tylor).
**Source:** Tylor (voice, mirror Agent Paige's metered Ollama), then Remy Grok relaying Tylor.
**Related:** PP-138 (saved recipes, cook-from-pantry matching), PP-158 (paste fallback), PP-186 (provider layer, live in #119), PP-185 (no model names in user-facing text)

---

## Goal

Pro users get an **AI recipe builder** on `/dashboard/recipes/`:

1. Suggest 3 recipes from the user's **in-stock** pantry, use-soon items first.
2. Adjust: servings (1 to 12), diet (vegetarian, vegan, pescatarian, gluten-free, dairy-free, low-carb, high-protein), max time (15/30/45/60 min), up to 5 **must-use** pantry items, and a short note.
3. **Save** an idea into the existing PP-138 recipe model (`POST /api/recipes`, same `{raw, name}` ingredients, free-tier save limit still applies).
4. **Add missing ingredients** to the shopping list (existing `buildMissingRecipeShoppingItems` + cook-from-pantry coverage, dedupes against the list).

"Use soon": the pantry has **no expiry dates** today, so the ranking is must-use items, then perishable categories (produce, dairy, meat, seafood, bakery, deli), then the items that have sat longest (oldest last update). Real expiry dates would need a new item field (separate ticket if wanted).

## Providers (PP-186 layer)

- Ollama Cloud `gemma4:cloud` (sent as `gemma4:31b` for direct cloud calls) first, always.
- Gemini `gemini-3.1-flash-lite` **only** when Ollama errors, times out, returns bad JSON, isn't configured, or hits a cap/quota. A valid answer is final.
- `backend/services/llm_client.py` builds on `backend/services/ai_providers/` (provider ids, failure kinds, cap detection, host/key config, model defaults) and adds the text/JSON chat call plus token counts. Keys are server env only (`OLLAMA_API_KEY`, `GEMINI_API_KEY`), never `NEXT_PUBLIC_`/`VITE_`, never logged; the Gemini key goes in a header.

## Hard guardrails (fail closed)

1. **Kill switch** `AI_FEATURES_ENABLED` (default off): off = the UI hides and the endpoint returns 404 with no call.
2. **Two weekly caps checked BEFORE every provider attempt**, with a reserve estimate (prompt chars/4 + max output 2500):
   - per user, rolling 7 days: `AI_USER_WEEKLY_TOKENS` (Pro default 50,000; Free 0 = Pro-only);
   - global, fixed weekly window aligned to the provider reset (`AI_WEEK_RESET_DOW` 0=Mon, `AI_WEEK_RESET_HOUR_UTC`): `AI_GLOBAL_WEEKLY_TOKENS` (default 300,000).
   The check and a `reserved` `llm_usage` row are written under a Postgres advisory lock, so concurrent requests can't both slip under. After the call the row gets the real `prompt_eval_count`/`eval_count` (chars/4 fallback); failed calls record whatever tokens they returned.
3. **The Gemini fallback counts against both caps** (it reserves again) and is skipped when capped.
4. **Fail closed**: cap hit, usage read/DB error, paused, nothing configured = no call, no retry, friendly message ("AI recipe ideas are taking a break until Monday. Your pantry, lists and saved recipes still work as usual."). Quota errors are never retried; the capped provider gets a cooldown (`AI_CAP_COOLDOWN_SECONDS`).
5. **Auto-trip**: when global usage reaches `AI_AUTO_TRIP_RATIO` (0.9) of the global cap, an `ai_guard_state` row pauses AI until the next weekly window. Admin can clear it: `POST /api/ai/admin/resume`. `GET /api/ai/admin/usage` shows this window's usage by provider.
6. **Rate limits**: `AI_USER_HOURLY_REQUESTS` (10) per user per hour; 1 request in flight per user.
7. **24h cache** (`AI_CACHE_TTL_HOURS`): same user + pantry snapshot + options returns the saved answer with no tokens.
8. Prompts carry item names, quantities and units only. No user ids, emails or other PII.

## Endpoints

- `GET /api/ai/recipes/status` → `{enabled}` or `{enabled, eligible, usage{usedTokens, limitTokens, resetsAt}, pausedUntil}`
- `POST /api/ai/recipes/suggest` `{servings, diet, maxMinutes, mustUse[], note}` → `{recipes[{title, minutes, servings, ingredients[{raw,name}], instructions[], usesSoon[]}], cached, usage}`; 402 Free, 429 weekly/hourly limit, 409 in flight, 503 paused/unavailable, 404 flag off.
- `GET /api/ai/admin/usage`, `POST /api/ai/admin/resume` (admin only).

## Migration

`032_ai_usage.sql` (+ rollback): `llm_usage`, `ai_guard_state`, `ai_response_cache`. 031 is PP-186's `app_settings`.

## Wording (PP-185)

User-facing text says "AI" only. Tests assert no model/vendor names in messages or the rendered builder.

## Tests

- `tests/test_ai_recipe_builder.py` (31, provider HTTP mocked): Ollama-only happy path and PP-138 shape; request shape and model alias; **zero provider calls** for: flag off, Free, over user cap, estimate would cross user cap, over global cap, usage read failure, DB down, paused, hourly limit, in flight, cache hit, nothing configured, empty pantry, invalid input; Ollama quota → Gemini once, never retried, cooldown on next request; fallback skipped when capped (1 call); bad JSON / timeout fall back; both fail = friendly 503; auto-trip at 90% and not below; wording; pure budget and window math.
- `tests/test_ai_guard_postgres.py` (real Postgres): reservation then real tokens, cap with estimate, one hourly request per attempt group, pause + auto-trip, cache round trip.
- `frontend/tests/ai-recipe-builder.test.tsx` (vitest): hidden when off, Pro upsell for Free, adjustments sent, save + add missing, friendly block message, dedupe, no model names.
- `e2e/ai-recipe-builder.spec.ts` (Playwright, `@smoke`): suggest → adjust → save → add missing (shows on the shopping list), hidden when off.

## Server env (OVH `/opt/pantry-pal/.env.prod`, names only)

`AI_FEATURES_ENABLED`, `AI_USER_WEEKLY_TOKENS`, `AI_GLOBAL_WEEKLY_TOKENS`, `AI_USER_HOURLY_REQUESTS`, optional `AI_WEEK_RESET_DOW`, `AI_WEEK_RESET_HOUR_UTC`, `AI_AUTO_TRIP_RATIO`, `AI_CACHE_TTL_HOURS`, `OLLAMA_TEXT_MODEL`, `GEMINI_TEXT_MODEL`. Keys already there: `OLLAMA_API_KEY`, `OLLAMA_HOST`, `GEMINI_API_KEY`.

## Decisions for Tylor

- Pro-only (current) vs a small free trial (e.g. 2 suggestions) for Free users.
- Cap values: 50k tokens/user/week (about 10 to 15 suggestions) and 300k global/week; set the global below the Ollama Cloud weekly credit once its size is known, and confirm the reset day.

## Allowed paths

`backend/services/llm_client.py`, `backend/services/ai_guard.py`, `backend/services/ai_recipe_builder.py`, `backend/routers/ai.py`, `backend/app/main.py` (router registration), `database/migrations/032_ai_usage*.sql`, `tests/test_ai_recipe_builder.py`, `tests/test_ai_guard_postgres.py`, `package.json` (`test:postgres` list only), `frontend/components/dashboard/AiRecipeBuilder.tsx`, `frontend/components/dashboard/views/recipes-view.tsx`, `frontend/services/ai.ts`, `frontend/tests/ai-recipe-builder.test.tsx`, `e2e/ai-recipe-builder.spec.ts`, `.env.example`, `.env.prod.example` (names only), this ticket and its `TICKET_STATUS.md` row.

No dependency changes. No secrets in git. Never add a code path that calls a provider without `ai_guard.reserve()` passing first.
