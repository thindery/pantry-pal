# PP-162: "Remove from pantry" button in the Item Details sheet

**Status:** ✅ Done
**Updated:** 2026-11-23, 9:50 PM America/Chicago
**Priority:** P1
**Phase:** User-requested features
**Created:** 2026-11-23
**Depends on:** PP-159 (useConfirm), PP-160 (item groups)
**Blocks:** —
**Source:** Tylor, 2026-11-23 ~9:20 PM CT (relayed): wants a delete button in the Item Details sheet to permanently remove things he no longer buys from his personal pantry, while the product stays in the shared product DB/cache.

---

## Behavior

### Backend

- Reuse the existing `DELETE /api/items/{item_id}` (`backend/routers/items.py` → `pantry_service.delete_item`). It already filters `WHERE user_id = %s AND id = %s` and returns 404 for another user's item. Keep that.
- Change `pantry_service.delete_item(user_id, item_id)` so that in ONE transaction it:
  1. `SELECT group_id FROM pantry_items WHERE user_id = %s AND id = %s FOR UPDATE`; if no row → return False (router returns 404).
  2. `DELETE FROM pantry_items WHERE user_id = %s AND id = %s`.
  3. If the item had a `group_id`: `SELECT COUNT(*) FROM pantry_items WHERE user_id = %s AND group_id = %s`; if 0 → `DELETE FROM item_groups WHERE user_id = %s AND id = %s`. (Same rule as PP-160 `remove_item_from_group`: an empty group is deleted; a group left with 1+ members stays.)
  4. commit, return True.
- It must NEVER touch `product_cache` (or any shared product table). No other table changes. Existing `activities` rows for the item are removed by the existing `ON DELETE CASCADE` (unchanged behavior; do not alter schema).
- No migrations.

### Frontend

- `frontend/contexts/pantry-provider.tsx`: add `removeItemFromPantry(item: PantryItem): Promise<boolean>`:
  - `await confirm({ title: \`Remove ${item.name} from your pantry?\`, message: "This can't be undone. The product stays available to scan or add again later.", confirmLabel: "Remove", cancelLabel: "Cancel", danger: true })`; return false if cancelled.
  - call existing `deleteItem(item.id)` from `@/services/apiService`.
  - on success: remove the item from `inventory` state, drop shopping-list rows whose `pantryItemId === item.id` (manual or auto), delete `itemThresholdOverrides[item.id]` (via `setItemThresholdOverrides`), reload groups (`loadItemGroups`) and inventory, `success(\`Removed ${item.name} from your pantry\`)`, return true.
  - on error: `error("Couldn't remove the item. Try again.")`, return false.
  - expose it from the provider value.
- `frontend/components/dashboard/edit-item-modal.tsx` (the Item Details sheet with the "Item grouping / Group with…" card, Overview/Nutrition/Ingredients tabs, Save Changes/Cancel): add a destructive "Remove from pantry" button near the bottom, below/separate from Save Changes/Cancel — red text or red outline (`text-rose-600 border border-rose-300` style, consistent with the PP-159 danger button), 44px min tap target, `Trash2` icon from `lucide-react` (already a dependency). On click call `removeItemFromPantry(item)`; if it returns true, `onClose()`. Disable while in progress.
- **All hooks unconditional, before the `if (!isOpen) return null;` early return** (PP-160 shipped a hooks-order bug here). No native dialogs.

## Tests

Backend (`tests/test_items.py` or new `tests/test_item_remove.py`, using mocks like existing tests):
- DELETE without auth → 401; invalid UUID → 400.
- Another user's item → 404 (service returns False) and no delete issued for that id.
- Service-level with a mocked cursor: deletes only `pantry_items` with both `user_id` and `id` in the WHERE; no SQL statement references `product_cache`; when the item was the last member, `DELETE FROM item_groups` is issued with user scoping; when other members remain, no group delete; item without group → no group SQL.
Frontend (Vitest, optional but preferred): the button renders with danger styling and calls the handler (mock `usePantry`) — skip if the modal is too heavy to mount.

Run: `.venv/bin/python -m pytest tests -q`, `npm run typecheck -w @pantry-pal/frontend`, `npm run lint -w @pantry-pal/frontend` (0 errors), `npm run test:run -w @pantry-pal/frontend`, `npm run build -w @pantry-pal/frontend`.

## Allowed paths

- `backend/services/pantry_service.py` (only `delete_item`)
- `tests/test_items.py` and/or `tests/test_item_remove.py`
- `frontend/contexts/pantry-provider.tsx`
- `frontend/components/dashboard/edit-item-modal.tsx`
- optional `frontend/tests/edit-item-remove.test.tsx`
- this ticket file

## Hard bans

- NO git commits, `git add`, pushes, branch changes.
- NO dependency changes, no secrets/.env, no migrations, no deploy/Docker changes.
- Never delete or modify `product_cache` or other users' rows.

## Acceptance Criteria

- [x] Ticket + TICKET_STATUS row
- [x] Destructive "Remove from pantry" button in Item Details, in-app confirm
- [x] Only the current user's row deleted; product cache untouched; empty group deleted, non-empty group kept
- [x] Shopping-list rows and overrides for the item dropped; sheet closes; pantry refreshes; toast
- [x] Backend tests for ownership + product row surviving; all checks pass
- [x] Deployed, build-id verified

## Implementation notes (2026-11-23, 9:50 PM America/Chicago)

- Code by Hermes (kimi-k2.7-code), reviewed. Shipped in `67a20c9` (live). Reuses `DELETE /api/items/{id}`; `delete_item` now locks the row, deletes only the user's row, and deletes the group if it becomes empty. Never touches `product_cache`. Activities for the item are removed by the existing ON DELETE CASCADE (unchanged). 8 backend tests in `tests/test_item_remove.py`; backend 158 passed.
