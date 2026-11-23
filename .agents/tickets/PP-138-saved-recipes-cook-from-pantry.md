# PP-138: Saved recipes and cook-from-pantry

**Status:** ✅ Done
**Priority:** P1
**Phase:** Revenue options (research 2026-11-22; v1 build 2026-11-22)
**Created:** 2026-11-22
**Updated:** 2026-11-22, 10:15 PM America/Chicago
**Depends on:** PP-156 (shopping-list grouping + need = max(target − have, 0))
**Blocks:** PP-139 (public recipes can reuse the recipe model; public/SEO work is out of scope here)
**Doc:** `.agents/docs/revenue-options.md`
**Source:** Tylor, 2026-11-22 (saved recipes; cook-from-pantry). Follow-up 9:44 PM America/Chicago: save recipes from other sites, begin an internal recipe library, do not load other sites inside the app (ads). Steering: imported recipes stay private and non-indexable; fetch only on explicit user action; always show the source link; do not download or re-host source images.

---

## Problem

Pantry Hub tracks what is in the pantry and on the shopping list, but it cannot save a recipe, compare ingredients to inventory, or add only the missing items to the list. That is the hook Tylor wants, and it is the cleanest Pro upsell that does not depend on traffic, ads, or a partner approval.

---

## Privacy and import rules (v1, non-negotiable)

- Saved and imported recipes are **private to the signed-in user**. Never public, never shared, never in the sitemap, robots, or public JSON-LD. Recipe pages are `noindex, nofollow` and require auth (`/dashboard/recipes/…`).
- URL import runs **only on an explicit user action** (they paste a link and confirm Import). No prefetch, no background crawl, no fetch-on-paste.
- Always keep `source_url` when the recipe was imported, and always show a **View original** link to that source.
- **Do not download or re-host source images.** Prefer just the View original link. If `image_url` is stored at all, store the remote URL only and never fetch, proxy, or copy the bytes. v1 should not display third-party recipe images.
- Do not iframe or otherwise load other recipe websites inside the app.
- No affiliate links, no ads, no new paid services.

---

## Build plan (v1)

### Data model

New `recipes` table (migration `database/migrations/021_saved_recipes.sql`, same numbered-SQL style as `020_…`, applied by `database/migrate.py`):

- `id` TEXT PRIMARY KEY
- `user_id` TEXT NOT NULL (index; every query is user-scoped)
- `title` TEXT NOT NULL
- `source_url` TEXT NULL
- `image_url` TEXT NULL  — optional; see privacy rules above. Do not fetch this URL on the server.
- `servings` TEXT NULL (or numeric if naturally numeric; TEXT is fine to preserve “4–6”)
- `ingredients` JSONB NOT NULL — list of `{ "raw": string, "name": string }` (raw line plus parsed ingredient name)
- `instructions` JSONB NOT NULL — list of step strings (empty list allowed)
- `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP

No public/published flag in v1. These rows are private by default.

### URL import

- Backend `POST /api/recipes/import` `{ "url": "..." }` fetches and parses **schema.org Recipe JSON-LD** only (`<script type="application/ld+json">`). Handle a single object, an array, and `@graph`. Recognize `Recipe` with or without the schema.org prefix.
- Store title, ingredient raw lines (parse a conservative name by stripping a leading quantity + unit), instruction steps, optional servings, and `source_url`. Do not store ads, HTML, or page chrome.
- **SSRF (must be solid):** http/https only; reject userinfo, credentials, and non-http schemes; DNS-resolve the host and block private, loopback, link-local, metadata, and similarly reserved IPs (IPv4 and IPv6, including IPv4-mapped); timeout (~8s); size cap (~1MB, stream and abort); do not follow redirects blindly — re-validate scheme + resolved IPs on every hop; cap redirects (e.g. 3). Use existing `httpx` (already in requirements). No new dependencies.
- If the page has no Recipe JSON-LD, return a clear error (e.g. `RECIPE_NOT_FOUND`) so the UI can tell the user to enter the recipe by hand. Never save a partial scrape of non-recipe HTML.
- Import counts toward the saved-recipe cap the same as a manual save.

### API (all auth-required, user-scoped)

Reuse `require_authenticated_user_id` and `success_response` / `error_response`.

- `GET /api/recipes` — list the current user's recipes
- `GET /api/recipes/{id}` — detail
- `POST /api/recipes` — manual save
- `POST /api/recipes/import` — URL import (explicit action only)
- `DELETE /api/recipes/{id}`

Reuse the existing Stripe entitlement check (`get_or_create_user_subscription` / `TIER_LIMITS`). Add a single constant `FREE_MAX_SAVED_RECIPES = 10` and set `maxSavedRecipes` to that for `free`, `-1` (unlimited) for `pro` and `family`. Enforce on the server on create and import (not on delete/list/get). Honest 403 / `TIER_LIMIT_EXCEEDED` with a clear upgrade prompt — no fake scarcity.

### Frontend

- Nav entry (desktop + mobile): Recipes, under `/dashboard/recipes/` (trailing slash). Lucide icon already available (e.g. `ChefHat` or `BookOpen`).
- List, detail, add (manual form + URL import field), delete.
- Detail shows pantry coverage and **Add missing to shopping list**, plus **View original** whenever `source_url` is set.
- Follow existing patterns: thin `frontend/app/dashboard/recipes/page.tsx` + view under `frontend/components/dashboard/views/`; API via `fetchApi` in `frontend/services/` (new `recipeService.ts` or additions to `apiService.ts`); `noindex` metadata on recipe routes.

### Pantry coverage

Pure function (frontend is enough in v1; inventory is already in `PantryProvider`):

- Match on **exact normalized name** only, same spirit as PP-156 `normalizeItemName` (lowercase, trim, collapse whitespace). After stripping a leading quantity + unit from the ingredient `name`/`raw`, compare to pantry item names. If several pantry rows share that exact name, sum `have`.
- Statuses: `have` (exact match), `missing` (no exact match), `unsure` (parsed name empty / unusable). **No substring, fuzzy, or “contains” matching.** An unmatched ingredient must not be silently marked `have`.
- “Add missing to shopping list” adds only `missing` lines, as manual shopping-list items, using PP-156 grouping: skip if a row with the same normalized name is already on the list; also dedupe within the incoming batch. Default need/quantity 1, category `other` unless already known. Do not `alert()` in a loop — reuse/extend a pure helper next to `frontend/lib/shopping-list-utils.ts` rather than calling `addManualShoppingItem` once per line.

### Tests

- Cap: 11th save as Free is 403; Pro/unlimited is allowed. Constant is the single source of truth.
- URL parse: fixture HTML (single Recipe, `@graph`, array). **No live network in tests.**
- SSRF: reject private/loopback/link-local, file://, and redirects to a private host (mock DNS/transport; no real sockets to internal IPs).
- Add-missing does not duplicate a name already on the list.
- An unmatched ingredient is not silently matched (e.g. “black pepper” must not match pantry “bell pepper”).
- Auth required on recipe endpoints.

### Out of scope (v1)

- Public/internal searchable recipe database (later; first-party recipes only if we publish — PP-139).
- Embedding other websites, ads, affiliates.
- New npm/pip packages.
- Re-hosting or proxying images.
- Background import or bookmarklet.

---

## Behavior

- A signed-in user can save a recipe by hand or by pasting a recipe URL and confirming Import.
- The app matches ingredients to pantry items conservatively and shows have / missing / unsure.
- The user can add missing ingredients to the shopping list in one action, without duplicating lines already on the list.
- Free accounts are capped at 10 saved recipes; Pro / Family are unlimited. The matcher is not paywalled. The cap is enforced on the server, with a clear, honest upgrade prompt.
- Saved recipes are private to the account. Public, SEO-facing recipes are PP-139, not this ticket.

## Acceptance Criteria

- [x] Short build plan in this ticket: data model, matcher, Free cap, shopping-list add, SSRF, privacy/import rules
- [x] User can save a recipe by hand and by URL import, see pantry coverage, and add missing ingredients to the shopping list in one action
- [x] Free cap (10) is enforced on the server, with a clear, honest upgrade prompt (no fake scarcity)
- [x] Imported recipes stay private and non-indexable; import fetches only on explicit user action; View original is always shown when a source URL exists; source images are not downloaded or re-hosted
- [x] Tests cover the cap, URL parse (fixtures, no live network), SSRF blocks, add-missing without dupes, and a missed ingredient match (no silent wrong match)
- [x] No affiliate, ad, or third-party account is created from this ticket; no new paid services; no new dependencies unless truly required and justified


---

## Shipped

Live on https://www.mypantryhub.com as of 2026-11-22, 10:15 PM America/Chicago.

- Feature commit: `e78c28a` — saved recipes, URL import, pantry coverage, add-missing
- Follow-up: `edf52c0` — stop applying `*.rollback.sql` as forward migrations (first deploy had run the rollback file as a no-op drop *before* create; the `recipes` table was intact). The stale `schema_migrations` row for `021_saved_recipes.rollback` was removed on prod after this fix.
- Live build: `edf52c0` (`/build-id.txt`). Migration `021_saved_recipes` applied. Containers healthy.
