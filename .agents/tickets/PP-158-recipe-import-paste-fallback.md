# PP-158: Paste fallback when a recipe site blocks URL import

**Status:** ✅ Done
**Priority:** P1
**Phase:** User-reported bugs (follow-up to PP-138)
**Created:** 2026-11-23
**Updated:** 2026-11-23, 11:59 AM America/Chicago
**Depends on:** PP-138
**Blocks:** —
**Source:** Tylor, 2026-11-23, 11:35 AM America/Chicago. Import of https://www.allrecipes.com/recipe/7869/neiman-marcus-cake-ii/ failed. Confirmed: Allrecipes / Dotdash Meredith (also SimplyRecipes, etc.) returns 403 to the OVH datacenter IP even with a browser User-Agent, so `POST /api/recipes/import` returns 400. Server-side fetch cannot fix this at $0.

---

## Problem

URL import works when a site returns Recipe JSON-LD to our server. Several large publishers (Allrecipes and other Dotdash Meredith sites) block requests from the OVH datacenter, so the import fails before any recipe data can be read. Today `fetch_url_html` treats a non-200 as `SSRFError`, and the API maps that to a generic `INVALID_URL` 400. The user sees an unhelpful error and has to retype the recipe from scratch, with no way to paste the page text they already have open. Tracking query params (`utm_*`, `fbclid`, etc.) are also stored on `source_url` when an import does succeed.

Do **not** try proxies, residential IPs, paid scraping services, User-Agent rotation farms, or browser automation. Stay at $0.

---

## Behavior

Tylor follow-up (2026-11-23, late morning America/Chicago): **never tell users an import failed or was blocked.** If the fetch is blocked or the page has no Recipe JSON-LD, still **save the recipe as link-only**. The reason stays in backend logs only. No error toasts and no “site blocked” wording in the UI.

### Link-only import

When `POST /api/recipes/import` has a valid public http(s) URL but cannot read recipe details (upstream 401/403/429, a bot-challenge page, no Recipe JSON-LD, oversized page, or a fetch failure after the URL passed SSRF checks):

- Still save a private recipe that counts toward the Free cap like any other save.
- Store the source URL with tracking params stripped (`utm_*`, `fbclid`, `gclid`, etc.).
- Title comes from `og:title` / `twitter:title` / `<title>` when we have HTML and it is not a challenge page; otherwise from the URL slug (e.g. `/recipe/7869/neiman-marcus-cake-ii/` → “Neiman Marcus Cake II”). Drop numeric path segments and trailing ids.
- Ingredients and instructions are empty.
- Set `is_complete` / `isComplete` to `false`. Complete imports and manual saves are `true`.
- Return 201 with the saved recipe. Do not return `SITE_BLOCKED` or `RECIPE_NOT_FOUND` to the client.
- Invalid URLs (SSRF / non-http) and the Free cap still return their existing error codes.

Migration `022_recipe_is_complete.sql` adds `is_complete BOOLEAN NOT NULL DEFAULT TRUE`. Do not add a `*.rollback.sql` file (`migrate.py` skips those; a rollback glob already caused a production scare in PP-138).

### Add details (paste parser)

In the list and on the detail page, show a subtle **Details not imported** badge, a working **View original** link, and an **Add details** action. Add details opens an editor with a **Paste recipe** textarea. Parse pasted text (and pasted HTML / JSON-LD) via `POST /api/recipes/parse` (auth required, does not save, does not count toward the cap) and fill the editable title, ingredients, and steps. Saving uses `PATCH /api/recipes/{id}` and marks the recipe complete when details are present.

Parser behavior is unchanged from the earlier paste-fallback plan: try the existing JSON-LD parser first, then heuristic section headings (Ingredients / Directions / Instructions / Steps / Method / Preparation), quantity-leading and bulleted ingredient lines, numbered steps, optional servings.

Coverage and “Add missing to shopping list” must handle zero ingredients gracefully (no fake 0/0 coverage, no add-missing prompt).

### Tracking params

Strip tracking query params from source URLs before fetching and before storing, including on parse and manual save.

---

## Tests

No live network in tests. Extend `tests/test_recipes.py` and fixtures under `tests/fixtures/recipes/` as needed:

- Pasted-text parser on a realistic Allrecipes-style fixture; pasted JSON-LD / HTML goes through the existing parser first.
- URL param stripping, including Tylor’s Allrecipes URL with `utm_*` + `fbclid`.
- Blocked fetch (mocked 401/403/429 and a tight challenge-page body) and no-JSON-LD pages **save a link-only recipe** (`isComplete` false, slug or og:title, stripped source URL). The import endpoint must not return `SITE_BLOCKED` or `RECIPE_NOT_FOUND`.
- Title-from-slug and og:title helpers.
- `POST /api/recipes/parse` requires auth and does not create a recipe or increment the cap.
- `PATCH /api/recipes/{id}` requires auth and can complete a link-only recipe.
- Coverage / add-missing with zero ingredients.
- SSRF / invalid-scheme cases still return `INVALID_URL` and do not save.
- Free cap still applies to link-only imports.

---

## Out of scope

- Proxies, paid scrapers, browser automation, or changing IPs to get around Allrecipes.
- New npm/pip packages.
- Public/shared recipes (PP-139).
- Re-hosting images.

---

## Acceptance Criteria

- [x] A blocked fetch or a page with no Recipe JSON-LD still saves a link-only recipe (stripped source URL, slug or og:title, `isComplete` false) and returns 201. No `SITE_BLOCKED` / `RECIPE_NOT_FOUND` to the client; reasons go to server logs only
- [x] The UI never tells the user the import failed or was blocked. List and detail show a subtle “Details not imported” badge, View original, and Add details
- [x] Add details opens an editor with a paste box; the parser fills ingredients and steps; saving via PATCH marks the recipe complete
- [x] Tracking params are stripped from source URLs before fetch and before store
- [x] Coverage and add-missing handle zero ingredients gracefully
- [x] Link-only recipes count toward the Free cap
- [x] Tests cover the paste parser, JSON-LD-in-paste, URL stripping, slug/og titles, link-only save on blocked/no-JSON-LD, parse and PATCH auth, and empty coverage, with no live network
- [x] No new dependencies, no proxies or paid services, no rollback-glob migration file

---

## Shipped

Live on https://www.mypantryhub.com as of 2026-11-23, 11:59 AM America/Chicago.

- Feature commit: `f7c43f4` — link-only save when a recipe URL cannot be fully imported; paste parser; Add details; tracking-param stripping; `is_complete` migration 022
- Live build: `f7c43f4` (`/build-id.txt`). Migration `022_recipe_is_complete` applied. Containers healthy.
