# PP-187: Shopping list product info popup, and a clearer "Have X · need Y" line

**Status:** ✅ Done (live 2026-11-25, 5:26 PM CT, build `a356ed4`, [PR #128](https://github.com/thindery/pantry-pal/pull/128), merge `a356ed4`)
**Priority:** P2
**Phase:** Shopping list UX
**Created:** 2026-11-25, 3:10 PM America/Chicago
**Source:** Tylor (voice request)

---

## Problem

1. On the shopping list, tapping a product's name or picture does nothing. Tylor wants it to open a product info popup for that item. Only the check-off box should toggle checked.
2. Each row's grey subtitle reads **"Have 0 · need 2"**. Tylor didn't understand why it says he "needs" something. It's built in `getShoppingItemReason()` (`frontend/lib/shopping-list-utils.ts`). "need" is really the **suggested quantity to buy**, which comes from `calculateSuggestedQuantity()`: recent usage, falling back to 2× the item's low-stock alert level, capped at max(12, 4× alert). It repeats the stepper number and gives no reason, so it reads like a demand. Manual items say "Added manually".

## Requirements

### A. Product info popup
- In `ShoppingListRow` (`frontend/components/dashboard/ShoppingListRow.tsx`), make the thumbnail (`ItemThumb`) and name area one button (keyboard accessible, with an aria-label like "View details for <name>") that opens a product info modal. The checkbox, the +/− stepper and the ⋯ menu keep their current behavior and must not open it.
- Modal contents (read-only): image, name, brand, UPC, category, unit, quantity in stock, low-stock alert level, last updated, and nutrition/ingredients tabs when we have them (reuse the data and tab layout from `EditItemModal` where practical). Also include "Why it's on your list" in plain words (see B), and an "Edit in pantry" button that opens the existing `EditItemModal` for the linked pantry item.
- Manual items with no linked pantry item show the name, quantity and "Added manually" only.
- Render the modal outside the dashboard's `relative z-0` wrapper or via a portal, so it isn't hidden under the navbar (same bug as PP-180).
- Esc, backdrop click and the X all close it.

### B. Clearer reason line
- Replace "Have X · need Y" with wording that explains itself, e.g. **"You have 0 · alert at 1"** in the row. In the popup: "Added because you have 0 and your alert is 1. Suggested: buy 2, based on how fast you use it." (or "...2× your alert level" when there's no usage history).
- Keep it short enough for one line on mobile. Update `getShoppingItemReason` and its tests.

## Tests
- `frontend/tests/`: clicking the name or picture opens the modal; clicking the checkbox, stepper or menu does not; the manual-item variant; the new reason text for usage-based, fallback and manual cases.
- Frontend tests, `tsc` and `next build` all pass.

## Allowed paths
- `frontend/components/dashboard/ShoppingListRow.tsx`
- `frontend/components/dashboard/GroupListRow.tsx` (only if grouped rows need the same tap target)
- `frontend/components/dashboard/ShoppingItemInfoModal.tsx` (new)
- `frontend/components/dashboard/views/shopping-list-view.tsx`
- `frontend/lib/shopping-list-utils.ts`
- `frontend/components/dashboard/dashboard-modals.tsx` (only if needed to open `EditItemModal`)
- `frontend/tests/` (new or updated tests)
- This ticket file and its `.agents/TICKET_STATUS.md` row

## Rules for the coding agent
- No dependency changes unless truly needed. If one is, stop and explain why.
- **No commits, no pushes, no secrets.** Leave changes in the working tree for review.
- No backend changes unless a needed field is missing from the API. If one is, stop and explain.
- Don't touch the stray `2026-07-30` file or `.agents/email-previews/`.
- PP-181 is reserved for the "P" product name bug (in progress in another worktree).

## Resolution (2026-11-25)

- `ShoppingListRow`: thumbnail + name is one button (`View details for <name>`) that opens the new `ShoppingItemInfoModal`; checkbox, stepper and ⋯ menu unchanged.
- `ShoppingItemInfoModal`: read-only details, nutrition/ingredients tabs when present, "Why it's on your list", "Edit in pantry" opens `EditItemModal`. Manual items show name, quantity and "Added manually". Portaled to `document.body` at `z-[10000]`; Esc, backdrop and X close it.
- Row text is now "You have X · alert at Y"; popup says "Added because you have X and your alert is Y. Suggested: buy N, based on how fast you use it." (or "..., 2× your alert level." with under 7 days of usage, same rule as `calculateSuggestedQuantity`).
- Grouped rows (`GroupListRow`) were not changed.
- Checks: vitest 48 files / 278 tests, `tsc`, eslint (0 errors), `next build`, CI green, pre-deploy Playwright smoke 31 passed. Smoke after deploy: `/`, `/pricing/`, `/auth/signin/` 200; `/dashboard/` 307 to sign-in.
