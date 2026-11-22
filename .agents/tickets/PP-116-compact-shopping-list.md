# PP-116: Tighten the Shopping list the way the Pantry list was tightened

**Status:** ✅ Done
**Priority:** P1
**Phase:** User-reported enhancement
**Created:** 2026-11-22
**Depends on:** PP-085 compact pantry list (commit `1bdcf2f`)

---

## Problem

Tylor (phone screenshot, 390px wide, 139 items): the Shopping list is bulky. Each row is about 170px tall. The name ("Grated Cheese Blend") wraps to 3 lines in a narrow column. Under it is a 4-line subtext, "Need 3 · have 1 · your alert: warn at or below 2". Each row also has a checkbox, big − / qty / + buttons, a check icon, and a trash icon. The header has large Regenerate / Share / + Add item buttons. He wants it cleaned up like the pantry list (PP-085).

Also look at why Milk says need 28 with have 2. If the need-quantity logic is clearly buggy, note it, or fix it if trivial.

## Behavior

- Rows about 52–60px, with a 36–40px product thumbnail (same `imageUrl` as the pantry list: inventory items already come back with `imageUrl` from the `product_cache` LEFT JOIN — pull it from the matching pantry item, no new backend join unless something is actually missing). Checkbox on the left. Name with up to 2 lines (`line-clamp-2`) that fills the remaining width. No 3-line wrap, no 1-line ellipsis.
- One short muted subline like `Have 1 · need 3`. Drop the alert / "warn at or below" text. Manual items can stay "Added manually". Out of stock can stay "Out of stock" or `Have 0 · need N`.
- A small compact − / qty / + stepper (same ~32px / `w-8 h-8` size as the pantry +/−).
- Move delete off the always-visible row: a small overflow (⋯) menu is preferred (Remove, and Mark bought). Optional swipe-to-delete is fine if it stays simple; do not spend a long time on gesture code.
- The standalone check / "Mark bought" icon is redundant with the row checkbox for *checking* the line, but `markItemAsBought` is *not* the same as `toggleItemChecked` — the former adds the suggested qty to pantry inventory and removes the row. Do not delete that behavior. Put "Mark bought" in the overflow menu (or a clear equivalent), not as a second always-visible check icon.
- Slimmer header: smaller title, tighter padding, Settings icon like the pantry header, and Regenerate / Share / + Add item as smaller buttons on one row (follow `inventory-view.tsx` compact chrome).
- Optional sort or grouping by category to match the pantry list. Persist the choice in `localStorage` (`pantry-shopping-list-sort`). Category grouping should use small section headers like the pantry list. Default can stay category-grouped, since generate already sorts by category.
- At a 390×844 viewport, many more than today's ~4–5 bulky rows should be visible below the tightened chrome (target roughly 8+ typical rows).

## Milk / suggested-quantity bug (fix if trivial)

`calculateSuggestedQuantity` in `frontend/contexts/pantry-provider.tsx` is clearly wrong and can produce "Need 28":

```ts
const daysOfHistory = Math.max(
  1,
  (Date.now() - new Date(itemActivities[itemActivities.length - 1].timestamp).getTime()) / (1000 * 60 * 60 * 24)
);
const dailyUsage = totalUsed / daysOfHistory;
const suggested = Math.ceil(dailyUsage * 14 / avgUsage) * Math.ceil(avgUsage);
```

Problems:

1. `itemActivities[length - 1]` is whatever order `safeActivities` is in. If that entry is recent, `daysOfHistory` clamps to 1, so a couple of uses explode: 2 events of amount 1 → `ceil(14 * 2) * 1 = 28`. That matches Milk.
2. The formula should be a 2-week supply: `Math.ceil(dailyUsage * 14)`, with a fallback of `max(threshold * 2, 1)` when there is no usage history. Cap the result at a sane maximum (e.g. 12, or `max(12, threshold * 4)`).
3. Use the *oldest* activity timestamp for the history window, not blindly the last array element.
4. `ADJUST` amounts are stored as `Math.abs(...)`, so increases are counted as "used". Prefer `REMOVE` only, or only decreases, when summing usage.
5. `generateShoppingList` preserves an existing item's `suggestedQuantity` on merge (so user +/− survives auto-refresh). After the formula fix, still clamp obviously wild preserved values (e.g. if existing suggested > the new cap, replace with the newly calculated value) so Milk does not stay at 28 until the user deletes the row. Do not wipe a reasonable user-edited quantity.

Extract the suggest function into a small util (e.g. `frontend/lib/shopping-list-utils.ts` or a sibling file) and add unit tests, including the Milk 2-event / recent-timestamp case that must not return 28.

## Out of scope / do not touch

- Backend billing, webhooks, email, Stripe.
- Landing page, Pricing, SchemaMarkup, UpgradePrompt, or other marketing copy.
- Pantry list UI except reusing its patterns (`PantryListRow`, `inventory-view` header/sort, `categoryIcon`).
- Do not `git add -A`. Do not commit the stray `2026-07-30` file. Do not commit or deploy — the reviewer will.

## Allowed paths

- `frontend/components/dashboard/views/shopping-list-view.tsx`
- New shopping-list row component under `frontend/components/dashboard/` (mirror `PantryListRow.tsx`)
- `frontend/lib/shopping-list-utils.ts` and/or a small new util for suggest/sort
- `frontend/tests/shopping-list-*.test.ts(x)` and a compact row test like `frontend/tests/pantry-list-row.test.tsx`
- `frontend/contexts/pantry-provider.tsx` — only the suggested-quantity helper and the generate/merge clamp described above; do not rewrite the provider
- `frontend/types.ts` — only if a shopping-list sort type or optional `imageUrl` on `ShoppingListItem` is needed
- This ticket file (mark done when finished) and a TICKET_STATUS row if you can add one without clobbering other in-progress edits

## Acceptance Criteria

- [x] Ticket + status row for PP-116
- [x] Compact readable rows (~52–60px) with thumbnail, checkbox, 2-line names, short `Have N · need M` subline, compact stepper
- [x] Delete / Mark bought not crowding the row; no redundant always-visible second check icon
- [x] Slimmer header with smaller buttons on one row
- [x] Optional category grouping / sort, persisted
- [x] Suggested-quantity bug fixed and unit-tested (Milk 2-event case is not 28); wild existing values get clamped
- [x] Frontend unit tests for the new row + suggest util pass; no long test suites
- [ ] Reviewer commits only allowed files, deploys, and verifies live `build-id.txt`
