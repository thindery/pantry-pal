# PP-192: Compact recipes page — tabs for the AI generator, denser recipe cards

**Status:** ✅ Done (live 2026-11-26, build c053497, PR #132)
**Priority:** P2
**Phase:** Recipes UX
**Created:** 2026-11-26, 11:14 AM America/Chicago
**Source:** Tylor (in-app, from his phone on the live recipes page): "be nice to not have generator taking up so much space. Maybe tabs or a accordion. Need easier way to see more recipes in less space. They are huge cards with very little info."
**Related:** PP-183 (AI recipe builder, must-use typeahead, Suggest again), PP-185 (user-facing text says "AI" only, never a model name), PP-189 (recipe pantry matching — in flight; do not touch matching logic)

---

## Problem

On `/dashboard/recipes/` (mobile), the AI recipe generator sits above the saved-recipe list and eats most of the first screen. The saved recipes themselves are large cards with little information, so only a couple fit on a phone.

## Behavior

1. **Move the generator off the main view.** Tabs at the top: **My recipes** (default) and **Suggest with AI**. The existing generator stays intact, including the inline must-use typeahead and **Suggest again**. Keep the builder mounted while hidden so in-progress suggestions are not lost when the user switches tabs.
2. **Compact recipe cards.** Default to a dense list/row: small thumbnail (or a placeholder if there is no image), title, and one meta line with servings if known, `<have>/<total> ingredients in pantry`, and the source hostname when the recipe has a source URL. Time is shown only if a value exists (saved recipes have no time field today). Aim for about 6–8 recipes per phone screen. A simple list/grid toggle is fine; list is the default. No new full-screen pop-ups.
3. **Mobile first.** No horizontal overflow at 360–390px widths. Truncate long titles and meta. `min-w-0 max-w-full` on the page and rows.
4. **Search/filter.** There is no recipe search or filter on this page today (only the Add Recipe import/manual modal). Do not add one in this ticket. Leave the Add Recipe modal as it is.
5. **Coordinate with PP-189.** Another agent is changing recipe ingredient matching (and maybe the recipe detail page). Do not edit `frontend/lib/recipe-coverage.ts`, matching tests, or recipe detail matching UI. Continue to display coverage from `calculateRecipeCoverage`. If a `stapleCount` field is present, include it in the "have" number; otherwise use `haveCount` only.

## Acceptance Criteria

- [ ] Default view is **My recipes**; the AI generator is not visible and does not take vertical space until the user opens **Suggest with AI**.
- [ ] Opening **Suggest with AI** shows the existing builder; must-use typeahead and **Suggest again** still work.
- [ ] Saved recipes render as compact rows (list default) with title, pantry have/total, servings if known, and source or a placeholder thumb; about 6–8 fit on a 390px-wide phone screen.
- [ ] Optional list/grid toggle works; choice can be remembered locally.
- [ ] No horizontal overflow at 360–390px. No new full-screen pop-ups.
- [ ] User-facing copy says "AI" only — no model or vendor names.
- [ ] Frontend unit tests, typecheck, lint, and build pass. Playwright covers the compact list at 390px and the existing AI builder smoke tests (updated to open the AI tab first).

## Coding

Coding may be done with **agy** (`~/.local/bin/agy -p --model gemini-3.8-flash-medium "<ticket>"` in `/Users/thindery/projects/pantry-pal` on the Mac Mini) or **Grok Bot**. Hermes and the Grok CLI (`grok -p`) are banned for this work.

## Allowed paths

`frontend/components/dashboard/views/recipes-view.tsx`, `frontend/tests/recipes-view.test.tsx`, `frontend/tests/ai-recipe-builder.test.tsx` (only if the page-level change requires it), `e2e/ai-recipe-builder.spec.ts`, this ticket, and its `TICKET_STATUS.md` row.

Do not edit `frontend/lib/recipe-coverage.ts` or recipe matching logic. No dependency changes. No secrets in git. Commit with explicit paths only: never `git add -A`, and never commit the 2026-07-30 file, `.agents/email-previews/`, or GROWTH-010.
