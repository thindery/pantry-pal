# PP-190: Combine similar pantry items (reuse the PP-189 normalizer)

**Status:** ✅ Live (79012f3, [#143](https://github.com/thindery/pantry-pal/pull/143))
**Priority:** P2
**Phase:** Pantry / item groups
**Created:** 2026-11-26, 11:44 AM America/Chicago
**Source:** Tylor (phone screenshots of the live site, Pro account; same report as PP-189)
**Related:** PP-160 (item groups), PP-161 (group-picker suggestions), PP-189 (ingredient/pantry normalizer, live at `bd8cf4f`)
**Depends on:** PP-189 (reuse its normalizer; do not fork a second one)
**Coding agent:** Coding may be done with agy (`~/.local/bin/agy -p --model gemini-3.8-flash-medium`, run in `/Users/thindery/projects/pantry-pal` on the Mac Mini) or with Grok Bot directly. Hermes and the Grok CLI are banned for this work.

**Screenshots:** Tylor's phone screenshots of the live pantry search on his Pro account, from the same report as PP-189. The search results included: Butter (2 units), Butter cake, Butter Golden Cake Mix, Buttermilk Pancake & Waffle Mix, Buttery Golden Selects Mashed Potatoes, Peanut Butter Spread, Heavy Whipping Cream (1 unit, Dairy), Cream Cheese, Cream of chicken, Cream of Chicken condensed soup, Bake house pie crust, and Pie Crust. Those rows are the example pairs for this ticket.

---

## Problem

PP-160 already lets users manually group different SKUs of the same thing, and PP-161 puts suggested matches at the top of the "Group with…" picker. Suggestions today use `productMatchKey` / token tiers in `frontend/lib/item-group-match.ts`, and they are conservative: same product from a different brand or size is fine; different flavors must not be grouped.

The pantry search from Tylor's screenshots shows why the suggester needs the same robust normalizer as PP-189. Some of those rows are good combine candidates (for example "Cream of chicken" with "Cream of Chicken condensed soup", or "Pie Crust" with "Bake house pie crust"). Others only share a substring and must not be offered as the same item: "Butter" must not combine with Peanut Butter Spread, Butter cake, Butter Golden Cake Mix, Buttermilk mix, or Buttery mashed potatoes; "Heavy Whipping Cream" must not combine with Cream Cheese or Cream of chicken.

This ticket is **design/build later**. Do not implement it in the same PR that files the ticket.

## Behavior

- Reuse PP-189's matcher in `frontend/lib/recipe-coverage.ts` (`tokenizeForMatch`, `normalizeIngredientForMatch`, and the closest-match / identity-changing token rules). Do not invent a third normalizer. If the group picker needs a shared helper, extract it from PP-189 rather than copying it.
- Suggest combining only close matches (existing PP-161 Suggested section, or an equivalent "Combine similar" prompt in the pantry). Keep grouping **manual**. Never auto-group (PP-160 rule).
- Prefer the closest match. Word-boundary / token matching, singular/plural, and descriptor stripping should match PP-189.
- False positives from the screenshots must not be suggested as combines:
  - Butter ↛ Peanut Butter Spread, Butter cake, Butter Golden Cake Mix, Buttermilk Pancake & Waffle Mix, Buttery Golden Selects Mashed Potatoes
  - Heavy Whipping Cream ↛ Cream Cheese, Cream of chicken, Cream of Chicken condensed soup
- Reasonable true positives from the same list may be suggested (user still confirms):
  - Cream of chicken ↔ Cream of Chicken condensed soup
  - Pie Crust ↔ Bake house pie crust
- Cream of chicken vs Cream of mushroom stays rejected (already a PP-160/PP-161 rule).
- Existing item-group APIs and the shopping-list have/need rollup stay as they are; this is about better suggestions, not a new data model unless a gap is found and explained first.

## Acceptance Criteria

- [ ] Unit tests use exactly the screenshot example pairs above (true positives and the false positives).
- [ ] Suggestions call the PP-189 normalizer (shared helper), not a one-off copy.
- [ ] Grouping remains user-confirmed; nothing is auto-merged.
- [ ] Touched tests, typecheck, lint, and frontend build pass when this is built.

## Allowed paths (when built; not this docs PR)

- `frontend/lib/recipe-coverage.ts` (only if extracting a shared helper)
- `frontend/lib/item-group-match.ts`
- `frontend/components/dashboard/GroupWithModal.tsx` (and pantry search/list UI only if a combine affordance is added there)
- `frontend/tests/` for the example pairs
- This ticket file and its `.agents/TICKET_STATUS.md` row

## Rules for the coding agent

- Coding may be done with agy (`~/.local/bin/agy -p --model gemini-3.8-flash-medium`, run in `/Users/thindery/projects/pantry-pal` on the Mac Mini) or with Grok Bot directly. Hermes and the Grok CLI are banned for this work.
- Ticket only in the filing PR: no product-code changes, no deploy.
- No dependency changes unless truly needed. If one is, stop and explain why.
- No secrets. Commit with explicit paths only; never `git add -A`.
- Don't touch the stray `2026-07-30` file, `.agents/email-previews/`, or GROWTH-010.


---

## Shipped (2026-11-26, 1:20 PM CT)

Per Tylor's request, built as **display grouping, on by default**, not manual suggestions:

- `frontend/lib/combine-similar.ts` clusters near-duplicate ungrouped items using the PP-189 tokenizer and `scoreTokenMatch`, plus a conservative leading-brand rule ("Bake house pie crust" = "Pie Crust"; flavors like "graham cracker" are never treated as a brand). Same unit required. Shortest name is the representative; matches never chain.
- Pantry shows one row with the combined quantity and an expandable list of the real rows; +/- and scanning still act on a specific item. Underlying rows are never merged or deleted.
- Shopping list rolls similar items up into one row; recipe matching already sums closest-matching rows.
- Opt-out: Account toggle and a "Combine similar" chip on the pantry. Stored per browser (localStorage) in this release; a server-side per-account sync is a follow-up.
- Smoke check against the live data shape (read-only names): Pie Crust + Bake house pie crust, the three Cream of chicken rows, cream of mushroom pair and the two cream-style corn rows group; butter, peanut butter, butter cake, cream cheese and heavy cream stay separate.
- Tests: `frontend/tests/combine-similar.test.ts`.
