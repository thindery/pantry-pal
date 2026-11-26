# PP-189: Robust recipe-to-pantry ingredient matching

**Status:** 📋 Open
**Priority:** P1
**Phase:** Recipes / cook-from-pantry
**Created:** 2026-11-26, 11:03 AM America/Chicago
**Source:** Tylor (phone screenshots of the live site, Pro account)
**Related:** PP-138 (saved recipes, cook-from-pantry coverage), PP-183 (AI recipe builder uses the same matcher)
**Coding agent:** Coding may be done with agy (`~/.local/bin/agy -p --model gemini-3.8-flash-medium`, run in `/Users/thindery/projects/pantry-pal` on the Mac Mini) or with Grok Bot directly. Hermes and the Grok CLI are banned for this work.

---

## Problem

On a saved-recipe detail page (Recipes tab, the **Ingredients · 9 total** card in `recipe-detail-view.tsx`), every ingredient showed a yellow **Missing** badge, including ones Tylor clearly has.

The recipe lines were:

- 2 large leeks (about 3 pounds total before trimming, see Recipe Notes)
- 1-2 tablespoons very soft unsalted butter
- kosher salt and ground black pepper, to season
- 1-2 tablespoons neutral oil of choice
- ½ cup dry, unoaked white wine such as Pinot Grigio
- ¾ cup heavy cream
- 1 teaspoon Dijon mustard
- 1 tablespoon fresh thyme leaves
- optional: ¼ cup finely grated parmesan

His pantry search showed: Butter (2 units), Butter cake, Butter Golden Cake Mix, Buttermilk Pancake & Waffle Mix, Buttery Golden Selects Mashed Potatoes, Peanut Butter Spread, Heavy Whipping Cream (1 unit, Dairy), Cream Cheese, Cream of chicken, Cream of Chicken condensed soup, Bake house pie crust, Pie Crust.

At least **butter** and **heavy cream** should have matched.

This is the **saved/imported recipe detail view**, not the AI suggestion cards. The long parentheticals and "see Recipe Notes" / "such as Pinot Grigio" wording are typical of an imported recipe. Once saved, AI recipes use the same page and the same matcher (`calculateRecipeCoverage` in `frontend/lib/recipe-coverage.ts`). Matching is exact normalized-name only, so "very soft unsalted butter" never equals "Butter", and "heavy cream" never equals "Heavy Whipping Cream".

Saved recipes store `{raw, name}` only. Coverage is already computed at read time from the current pantry; there is no stored match status to stale. Keep it that way.

## Behavior

- Normalize quantities, units, and descriptors (very soft, unsalted, finely grated, optional:, "to season", parentheticals, "such as …").
- Treat singular/plural as the same word.
- Token / subset match with word boundaries: "heavy cream" matches "Heavy Whipping Cream"; "butter" matches "Butter".
- Avoid obvious false positives: Peanut Butter Spread, Butter cake, and Buttermilk mix must not satisfy "butter"; Cream Cheese or Cream of chicken must not satisfy "heavy cream". Prefer the closest match.
- Salt, pepper, and oil can be labelled **Pantry staple**. Keep it simple.
- Recompute coverage at read time (already true; do not start storing a match status).
- User-facing text says "AI" only, never a model name.

## Acceptance Criteria

- [ ] Unit tests cover exactly the example pairs from Tylor's pantry and recipe lines.
- [ ] Butter matches pantry "Butter", not peanut butter / butter cake / buttermilk / buttery potatoes.
- [ ] Heavy cream matches "Heavy Whipping Cream", not cream cheese or cream of chicken.
- [ ] Salt, pepper, and oil show as "Pantry staple" and are not counted as missing.
- [ ] Coverage is computed at read time.
- [ ] Touched tests, typecheck, lint, and frontend build pass.

## Allowed paths

- `frontend/lib/recipe-coverage.ts`
- `frontend/types.ts` (coverage status only, if a staple status is added)
- `frontend/components/dashboard/views/recipe-detail-view.tsx` (badge + coverage copy)
- `frontend/components/dashboard/AiRecipeBuilder.tsx` (same matcher; don't show staples as missing/unsure)
- `frontend/components/dashboard/views/recipes-view.tsx` (coverage count includes staples)
- `frontend/tests/recipe-coverage.test.ts` (and only other tests that break because of the new status)
- This ticket file and its `.agents/TICKET_STATUS.md` row

## Rules for the coding agent

- Coding may be done with agy (`~/.local/bin/agy -p --model gemini-3.8-flash-medium`, run in `/Users/thindery/projects/pantry-pal` on the Mac Mini) or with Grok Bot directly. Hermes and the Grok CLI are banned for this work.
- No dependency changes unless truly needed. If one is, stop and explain why.
- No secrets. Commit with explicit paths only; never `git add -A`.
- Don't touch the stray `2026-07-30` file, `.agents/email-previews/`, or GROWTH-010.
- PP-188 is reserved for recipe sharing (uncommitted in the `pantry-pal-pp188` worktree).
