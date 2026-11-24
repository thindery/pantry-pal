# PP-163: Keep activity history when an item is removed, and log a "Removed from pantry" activity

**Status:** 🚧 In progress
**Priority:** P1 (data loss)
**Phase:** User-requested features
**Created:** 2026-11-23
**Depends on:** PP-162
**Blocks:** —
**Source:** Tylor, 2026-11-23 ~9:35 PM CT: "Keep history. Do a activity of deleted". Today `activities.item_id` is `REFERENCES pantry_items(id) ON DELETE CASCADE`, so PP-162 "Remove from pantry" erases the item's whole ledger history.

---

## Current prod schema (verified 2026-11-23)

- `activities(id, user_id, item_id TEXT NULL, item_name TEXT NOT NULL, type, amount, timestamp, source, metadata, created_at)`. `item_name` is already a snapshot (all 334 rows have it).
- Constraints: `activities_item_id_fkey FOREIGN KEY (item_id) REFERENCES pantry_items(id) ON DELETE CASCADE`; `activities_type_check CHECK (type IN ('ADD','REMOVE','ADJUST','SHOPPING_SESSION'))`; `activities_source_check` (MANUAL, RECEIPT_SCAN, VISUAL_USAGE, SHOPPING_SESSION, BARCODE_SCAN).

## Behavior

### Migration `database/migrations/024_activity_keep_history.sql`

Write it idempotent and safe (look up constraint names like `016_add_barcode_scan_activity_source.sql` does):
1. Drop the existing FK on `activities.item_id` and re-add `activities_item_id_fkey FOREIGN KEY (item_id) REFERENCES pantry_items(id) ON DELETE SET NULL`.
2. `ALTER TABLE activities ADD COLUMN IF NOT EXISTS item_barcode TEXT NULL;` then backfill: `UPDATE activities a SET item_barcode = p.barcode FROM pantry_items p WHERE a.item_id = p.id AND a.item_barcode IS NULL AND p.barcode IS NOT NULL;`
3. Replace the type check with `activities_type_check CHECK (type IN ('ADD','REMOVE','ADJUST','SHOPPING_SESSION','DELETE'))`.
4. Optional: `INSERT INTO activity_types (type, description) VALUES ('DELETE','Item removed from pantry') ON CONFLICT DO NOTHING` (only if that table exists; guard with `to_regclass`).

No other data changes.

Rollback `database/migrations/024_activity_keep_history.rollback.sql` (migrate.py skips `*.rollback.sql`): delete rows with `type = 'DELETE'` (they only exist after this migration; note it in a comment), restore the 4-value type check, drop `item_barcode`, and restore the FK as `ON DELETE CASCADE`. Activities whose `item_id` is NULL stay (FK allows NULL).

### Backend

- `backend/models/schemas.py`: `ActivityType` gets `DELETE = "DELETE"`; `Activity.itemId: Optional[str] = None`; add `itemBarcode: Optional[str] = None`.
- `backend/services/pantry_service.py`:
  - `_row_to_activity`: `"itemId": row.get("item_id")`, `"itemBarcode": row.get("item_barcode")`.
  - `delete_item(user_id, item_id)` (PP-162 version), in the SAME transaction, after the `SELECT ... FOR UPDATE` (select `name, barcode, quantity, group_id`) and BEFORE the `DELETE`:
    - `UPDATE activities SET item_barcode = %s WHERE user_id = %s AND item_id = %s AND item_barcode IS NULL` (snapshot barcode if the item had one);
    - `INSERT INTO activities (id, user_id, item_id, item_name, item_barcode, type, amount, timestamp, source, metadata) VALUES (uuid4, user_id, item_id, name, barcode, 'DELETE', quantity_at_removal, now_iso, 'MANUAL', '{"reason":"removed_from_pantry"}')`. Use the same timestamp format as other activity inserts (`_now()`).
    - then the existing DELETE + empty-group cleanup. The FK sets `item_id` to NULL on all that item's activities, including the new one.
  - Every SQL filters by `user_id`. Never touch `product_cache`.
- Audit every backend read of `activities` (`pantry_service`, `shopping_sessions_service`, `scan_service`, `routers/activities.py`, `routers/scan.py`, `routers/shopping_sessions.py`, admin/stats if any) for assumptions that `item_id` is non-null or joins to `pantry_items` with an INNER JOIN that would drop history; fix only what would break. Do not change behaviour otherwise.

### Frontend

- `frontend/types.ts`: `Activity.itemId` becomes `string | null` (or optional); add `itemBarcode?: string | null`. `ActivityType` already includes `'DELETE'`.
- Every place that shows or computes from activities must handle `itemId == null` and `type === 'DELETE'`: at least `frontend/components/ActivityLedger.tsx`, `frontend/components/dashboard/views/ledger-view.tsx`, `frontend/components/dashboard/views/dashboard-home.tsx`, `frontend/components/DashboardComponents.tsx`, `frontend/components/ShoppingSessionView.tsx`, `frontend/src/ActivityDashboard.tsx` / `src/components/*` (if still rendered), `frontend/lib/shopping-list-utils.ts` (`calculateSuggestedQuantity` filters by itemId — null must simply not match), `frontend/contexts/pantry-provider.tsx`, `frontend/lib/normalize-list.ts`, any analytics.
  - A `DELETE` activity renders as "Removed from pantry" with the item name (and qty at removal, e.g. "had 2"), using a neutral/rose icon (e.g. `Trash2` from lucide-react). It must not render as +/− stock movement or count toward add/remove totals or usage stats.
  - Any lookup like `inventory.find(i => i.id === activity.itemId)` must tolerate no match (fall back to `activity.itemName`); never crash, never link to a missing item page.
- No native dialogs; hooks unconditional.

## Tests

Backend `tests/test_activity_history.py` (mocked cursor/service style like `tests/test_item_remove.py`):
- `delete_item` issues, in order: SELECT ... FOR UPDATE, UPDATE activities barcode snapshot (when barcode), INSERT activities with type 'DELETE', item name and the quantity at removal, then DELETE FROM pantry_items; all scoped by `user_id`; no `DELETE FROM activities`; no `product_cache`.
- Another user's item → returns False, no INSERT/DELETE issued.
- `_row_to_activity` handles `item_id = None` and returns `itemBarcode`.
- `GET /api/activities` (mocked service) returns a DELETE activity with `itemId: null` without validation errors.
- Migration file text: FK uses `ON DELETE SET NULL`; type check includes 'DELETE'; rollback file exists and is skipped by migrate (extend `tests/test_migrate_files.py` only if trivial).
- Update `tests/test_item_remove.py` expectations if the SQL sequence changed (keep its ownership/product-cache assertions).
Frontend Vitest `frontend/tests/activity-removed-item.test.ts(x)`: ledger/list helper or component renders a DELETE activity with null itemId as "Removed from pantry" + name without crashing; `calculateSuggestedQuantity` ignores null-itemId rows.

Checks: `.venv/bin/python -m pytest tests -q`; `npm run typecheck -w @pantry-pal/frontend`; `npm run lint -w @pantry-pal/frontend` (0 errors); `npm run test:run -w @pantry-pal/frontend`. Do not run the production build (the reviewer will).

## Allowed paths

- `database/migrations/024_activity_keep_history.sql`, `database/migrations/024_activity_keep_history.rollback.sql`
- `backend/models/schemas.py`, `backend/services/pantry_service.py`, and only-if-needed fixes in `backend/services/shopping_sessions_service.py`, `backend/services/scan_service.py`, `backend/routers/activities.py`, `backend/routers/scan.py`, `backend/routers/shopping_sessions.py`
- `tests/test_activity_history.py`, `tests/test_item_remove.py`, `tests/test_migrate_files.py`
- `frontend/types.ts`, `frontend/components/ActivityLedger.tsx`, `frontend/components/DashboardComponents.tsx`, `frontend/components/ShoppingSessionView.tsx`, `frontend/components/dashboard/**`, `frontend/src/**`, `frontend/lib/shopping-list-utils.ts`, `frontend/lib/normalize-list.ts`, `frontend/contexts/pantry-provider.tsx`, `frontend/tests/activity-removed-item.test.ts(x)`
- this ticket file

## Hard bans

- NO git commit / add / push / branch changes. NO dependency changes or installs. NO secrets / .env. NO deploy or Docker changes. NO edits to existing migration files. Never delete activities in forward code.

## Acceptance Criteria

- [ ] Ticket + TICKET_STATUS row
- [ ] Migration 024 (FK SET NULL, item_barcode snapshot + backfill, DELETE type) + rollback; applied on prod after a backup
- [ ] Removing an item keeps its history and writes a DELETE "Removed from pantry" activity (name, qty) atomically
- [ ] UI shows "Removed from pantry" with the name; no crash on null itemId; not counted as stock movement
- [ ] Backend/shopping/usage logic tolerates null item links
- [ ] Tests; all checks pass; deployed; build-id verified
