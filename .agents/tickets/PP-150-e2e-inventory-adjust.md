# PP-150: E2E — inventory quantity +/-

**Status:** ✅ Done (overnight 2026-11-25, PR #92, merge 8c857f4)
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

Prove a signed-in user can raise and lower pantry quantities from the inventory UI, that the new count persists, and that quantity cannot go below zero.

## User path

1. Sign in (PP-148 storageState). The pantry inventory lives on `/dashboard/` (`frontend/app/dashboard/page.tsx` renders `InventoryView` in `frontend/components/dashboard/views/inventory-view.tsx`). `/dashboard/inventory` only redirects to `/dashboard/`. Rows are `frontend/components/dashboard/inventory-item-row.tsx`.
2. Seed (via UI add or test-env API `POST /api/items`) one item with a known quantity, e.g. 3, unit that steps by 1 (not lbs/kg/grams/oz/cups — those use 0.5 or 0.25 in `InventoryItemRow`).
3. Click the row’s **+** control (`title="Increase quantity"`). `onAdjustQuantity` comes from `usePantry().handleAdjustQuantity` and persists with `updateItem` → `PUT /api/items/{item_id}` (`frontend/services/apiService.ts`, `backend/routers/items.py`).
4. Click the row’s **−** control (`title="Decrease quantity"`).
5. Reload `/dashboard/` (or revisit after a full navigation) and confirm the quantity is the persisted value.
6. Decrease until the item reaches 0. The minus button should be disabled; the row should show the out-of-stock treatment. Plus should still work from 0.

## Assertions

- [ ] Seeded item is visible on `/dashboard/`
- [ ] + increases the displayed quantity by the unit step and the value survives reload
- [ ] − decreases the displayed quantity by the unit step and the value survives reload
- [ ] Quantity never goes below 0; minus is disabled at 0
- [ ] No real customer inventory is used or mutated

## Allowed paths

- `e2e/` (inventory specs and seed helpers)
- Minimal `data-testid` hooks on `inventory-item-row` / `inventory-view` if titles and text locators are too brittle
- Test-env seed via `POST /api/items` is fine; do not add new item APIs

## Constraints

- Depends on the PP-147 harness. No extra runtime dependencies.
- No commits, pushes, secrets, or deploys by the coding agent unless a later ticket says so. Stage explicit paths only.
- Coder later is agy or Hermes.

## Progress Notes

- 2026-11-25 overnight (Pantry Hub Lead): `e2e/inventory-quantity.spec.ts` covers +, -, persistence across reload, minus disabled at 0 with the out-of-stock border, and + from 0. Signed in with a minted Auth.js JWT for a fake user (`e2e/support/auth.ts`, throwaway harness-only AUTH_SECRET derived at runtime) instead of Google OAuth, so it does not wait on PP-148. API is a stateful in-memory stand-in (`e2e/support/mock-api.ts`); quantity changes persist via `POST /api/activities`, which is what the app calls. Real backend behavior stays covered by pytest.
