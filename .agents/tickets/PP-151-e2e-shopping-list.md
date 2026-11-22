# PP-151: E2E — shopping list

**Status:** 📋 Backlog
**Priority:** P1
**Phase:** E2E regression suite (2026-11-22)
**Created:** 2026-11-22
**Updated:** 2026-11-22, 5:00 PM America/Chicago
**Depends on:** PP-147, PP-148
**Blocks:** —
**Coder later:** agy or Hermes — tickets only in this pass; no implementation, installs, or deploys now
**Source:** Tylor (via Remy), 2026-11-22 — Pantry Hub working with no regressions

---

## Goal

Prove the shopping list page still generates from pantry thresholds, and that a user can add, adjust, check, buy, and remove items. This is the list at `/dashboard/shopping-list`, not the in-store shopping session.

## User path

1. Sign in (PP-148 storageState) and open `/dashboard/shopping-list` (`frontend/app/dashboard/shopping-list/page.tsx` → `ShoppingListView` in `frontend/components/dashboard/views/shopping-list-view.tsx`, rows `frontend/components/dashboard/ShoppingListRow.tsx`, helpers `frontend/lib/shopping-list-utils.ts`). The list is driven by `usePantry()` (`generateShoppingList`, `addManualShoppingItem`, `updateShoppingItemQuantity`, `toggleItemChecked`, `markItemAsBought`, `removeShoppingItem`, `shareShoppingList`, `clearShoppingList` in `frontend/contexts/pantry-provider.tsx`).
2. Seed pantry items so at least one is at or below its low-stock threshold, then click generate / regenerate.
3. Confirm the generated list renders in `data-testid="shopping-list"` (category headers use `data-testid="category-header-{category}"`).
4. Add a manual item, change its need quantity with the row +/- controls, toggle the checkbox, and remove an item.
5. Mark an item as bought and confirm pantry quantity is updated (or the list reflects the bought state per current behavior).
6. Optional but useful: share and clear do not crash; sort preference persists under `localStorage` key `pantry-shopping-list-sort`.

Do not confuse this with `/dashboard/shopping-session` (`ShoppingSessionView`, `/api/shopping-sessions`). That path is out of scope unless a generate-from-session action is the only way to add a needed row.

## Assertions

- [ ] `/dashboard/shopping-list` loads for a signed-in test user
- [ ] Generate produces a visible list from a low-stock pantry fixture
- [ ] Manual add, quantity change, check/uncheck, and remove update the list
- [ ] Mark as bought follows current product behavior (list + pantry)
- [ ] No real customer list or pantry is used

## Allowed paths

- `e2e/` (shopping-list specs and seed helpers)
- Minimal `data-testid` hooks on `ShoppingListView` / `ShoppingListRow` if needed
- Do not restyle the compact list (that was PP-116) as part of this test ticket

## Constraints

- Depends on the PP-147 harness. No extra runtime dependencies.
- No commits, pushes, secrets, or deploys by the coding agent unless a later ticket says so. Stage explicit paths only.
- Coder later is agy or Hermes.
