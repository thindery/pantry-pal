# PP-160: Item groups (different SKUs, same thing)

**Status:** ✅ Done
**Updated:** 2026-11-23, 7:30 PM America/Chicago
**Priority:** P1
**Phase:** User-requested features
**Created:** 2026-11-23
**Depends on:** PP-156 (shopping-list need/target), PP-159 (useConfirm + toasts)
**Blocks:** —
**Source:** Tylor, 2026-11-23 ~6:50 PM CT: "some items are different skus but the same thing... Is there a way to help combine this?" then "Need this like a feature in the site". Follow-up rule from Tylor: cream of mushroom and cream of chicken must NOT be treated as the same. Grouping is manual. Suggestions only for the same product/variant from a different brand or size. Never auto-group.

---

## Problem

Users own several barcodes (SKUs) that are the same thing for them (e.g. Campbell's Cream of Chicken 10.5oz and Great Value Cream of Chicken). Today each SKU is its own pantry row and its own shopping-list row, so counts and "need" are wrong.

## Behavior

### Data model (additive migration only; no existing data changes)

New migration `database/migrations/023_item_groups.sql`:

```sql
CREATE TABLE IF NOT EXISTS item_groups (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    target_quantity REAL NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_item_groups_user_id ON item_groups(user_id);
ALTER TABLE pantry_items
    ADD COLUMN IF NOT EXISTS group_id TEXT NULL REFERENCES item_groups(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_pantry_items_group_id ON pantry_items(group_id);
```

Rollback file `database/migrations/023_item_groups.rollback.sql` (migrate.py already skips `*.rollback.sql`): drop the index and column `group_id` from `pantry_items`, then drop `item_groups`. Must never touch any other column or row.

- Scoping is per `user_id`, same as `pantry_items`. An item belongs to at most one group (single nullable FK). Each item keeps its own barcode, photo, name, quantity, target.
- Deleting a group only unlinks members (`ON DELETE SET NULL`, plus an explicit `UPDATE pantry_items SET group_id = NULL WHERE group_id = %s AND user_id = %s` in the same transaction). It NEVER deletes pantry items or activities.
- Deleting a pantry item does not delete its group.

### Backend API (FastAPI, all routes require auth via `require_authenticated_user_id`)

- `_row_to_item` in `backend/services/pantry_service.py` adds `"groupId": row.get("group_id")`. Add `groupId: Optional[str] = None` to the `PantryItem` schema (it is `extra="forbid"`). Do NOT add `groupId` to `CreateItemRequest` / `UpdateItemRequest`; group membership changes only through the endpoints below.
- New service `backend/services/item_group_service.py` and router `backend/routers/item_groups.py` (prefix `/api/item-groups`), registered in `backend/app/main.py` next to `recipes.router`:
  - `GET /api/item-groups` → list the user's groups: `{id, name, targetQuantity, itemIds: [...], createdAt}`.
  - `POST /api/item-groups` body `{name (1-100 chars, stripped), itemIds: [1..50 ids], targetQuantity?: number|null (ge 0, le 999999)}` → creates group and links the items. Every itemId must be a valid UUID and belong to the user, else 404 (do not leak other users' items) and nothing is written. An item already in another group is moved (at most one group).
  - `PATCH /api/item-groups/{id}` body `{name?, targetQuantity?}` (targetQuantity may be explicitly null to clear) → rename / set target.
  - `DELETE /api/item-groups/{id}` → unlink members, delete group row. Returns `{deleted: true, id, unlinkedItemIds: [...]}`.
  - `POST /api/item-groups/{id}/items` body `{itemId}` → add (moves from other group).
  - `DELETE /api/item-groups/{id}/items/{itemId}` → unlink one item. If the group ends up with 0 members, delete the empty group row (items untouched).
  - Every SQL statement filters by `user_id` for both the group and the items. Group id of another user → 404. Use `uuid4` text ids like other services.
  - Pydantic request models with `extra="forbid"` in `backend/models/schemas.py`.
- Free feature: no tier/paywall checks, no change to `subscription_service`.

### Frontend

- Types (`frontend/types.ts`): `PantryItem.groupId?: string | null`; new `ItemGroup { id; name; targetQuantity?: number | null; itemIds: string[]; createdAt? }`.
- Service `frontend/services/itemGroupService.ts` mirroring `recipeService.ts` (`fetchApi`).
- `frontend/contexts/pantry-provider.tsx`: load groups alongside items; expose `itemGroups`, `createGroup`, `addItemToGroup`, `removeItemFromGroup`, `renameGroup`, `setGroupTarget`, `deleteGroup`; refresh items+groups after changes. Errors → existing `error(...)` toast. Use `useConfirm()` (PP-159) for delete group / ungroup confirms. NO native `alert/confirm/prompt` anywhere.
- **Shopping list** (`frontend/lib/shopping-list-utils.ts` `buildAutoShoppingListItems`): add an optional trailing `groups?: ItemGroup[]` param (keep existing positional params so current callers/tests are unchanged). Items whose `groupId` matches a known group are bucketed by `group:<id>` instead of by normalized name. For a group bucket: have = sum of member quantities; target = `group.targetQuantity` if set, else the same fallback as an ungrouped item (`getItemTarget(primaryMember, thresholdConfig, itemOverrides)`, default 1); need = `max(target - have, 0)`; no row if need ≤ 0; row `name` = group name, `pantryItemId` = first member, add `groupId` on the row (optional field on `ShoppingListItem`). Members never produce separate rows. Items with an unknown/missing group behave exactly like today. **Existing behavior for ungrouped items must be byte-for-byte identical** (all existing shopping-list tests must pass unchanged).
- **Pantry view** (`inventory-view.tsx` / `PantryListRow.tsx` or a new `GroupListRow.tsx`): grouped items render as one collapsible group row: group name, combined count ("have 3"), member count, expand chevron (44px tap target, `aria-expanded`) showing the member rows (existing row component) indented. Group row actions: Rename, Set target, Ungroup (confirm via `useConfirm`, copy: "Ungroup Soup? Items stay in your pantry."). Search/filter: if any member matches, show the group with matching members. Sorting: group sorts by its name / combined qty.
- **Item action** (in `edit-item-modal.tsx` or the item row menu, whichever is the existing per-item action surface): "Group with…" button opens an in-app modal (style like `ThresholdSettingsModal`): searchable list of existing groups and other ungrouped items. Picking an item → create group with both items and an editable name field prefilled with the suggested generic name (the `productMatchKey`-derived name below, title-cased, else the picked item's name). Picking a group → add to it. If the item is already grouped show "In group: X" with "Remove from group".
- **Suggestions (strict, manual-by-default)**: new pure helper `frontend/lib/item-group-match.ts` exporting `productMatchKey(name: string, brand?: string | null): string`:
  - lowercase, strip `®™`, apostrophes/possessives, punctuation → spaces, collapse whitespace;
  - remove the known brand (if `brand` given) and a small curated list of common brand/store-brand words when they lead the name (e.g. campbell's/campbells, great value, kirkland signature, kirkland, progresso, kroger, market pantry, good & gather, 365, whole foods, signature select, hy-vee, aldi, simply nature, member's mark, equate, heinz, kraft, hunt's, del monte, dole, swanson, pacific);
  - remove size/count tokens: numbers with units (oz, fl oz, ounce(s), lb(s), g, kg, ml, l, ct, count, pack, pk, can(s)) and standalone "x" multipliers like "4 x"; keep all other words (including "condensed", "soup"). Variant/flavor words (cream of chicken vs cream of mushroom, low sodium, reduced fat, etc.) MUST remain, so different flavors/variants never match.
  - Two products match only if their keys are non-empty and EXACTLY equal. No OFF-category matching, no fuzzy/similarity scoring.
  - `findGroupSuggestion(newItem, inventory, groups)`: returns the first existing other item (or its group, if that item is grouped) whose key equals the new item's key, excluding the item itself and items already in the same group; null otherwise.
- After a successful single add/scan that created or updated an item (manual add form, single barcode add/confirm; skip in batch/receipt imports and continuous Quick Scan if showing a prompt would interrupt the scan loop — then do nothing), if the item is ungrouped and `findGroupSuggestion` returns a match, show a one-tap in-app prompt via `useConfirm({ title: "Group with Cream of Chicken?", message: "Count them together on your pantry and shopping list.", confirmLabel: "Group", cancelLabel: "Not now" })`. Yes → create group / add to group. No → remember the dismissed pair in memory (or localStorage key `pantry-group-suggest-dismissed`) so it is not asked again. **Never auto-group.**

## Tests

Backend (`tests/test_item_groups.py`, mock-the-service style like `tests/test_recipes.py`, plus service-level tests with a mocked cursor if practical):
- all routes 401 without auth;
- create/list/rename/set target/delete/add/remove happy paths;
- invalid UUID → 400; other user's item/group → 404 and nothing written;
- delete group returns unlinked ids and never deletes items (assert SQL issued is `UPDATE ... SET group_id = NULL` + `DELETE FROM item_groups`, never `DELETE FROM pantry_items`);
- `_row_to_item` includes `groupId`;
- `tests/test_migrate_files.py` still passes (rollback file skipped).

Frontend (Vitest):
- `frontend/tests/shopping-list-groups.test.ts`: group of 2 soups qty 1+2 target 2 → no row; target 5 → one row need 2 named after group; members never produce own rows; group target null → default 1; ungrouped items unchanged; unknown groupId behaves as ungrouped.
- `frontend/tests/item-group-match.test.ts`: "Campbell's Cream of Chicken 10.5 oz" vs "Great Value Cream of Chicken" → equal keys; "Cream of Chicken" vs "Cream of Mushroom" → NOT equal; "Chicken Noodle Soup" vs "Cream of Chicken Soup" → not equal; "Low Sodium Chicken Broth" vs "Chicken Broth" → not equal; size-only difference equal; suggestion excludes self and same-group items.

Run before finishing:
- `rg -n 'window\.(confirm|alert|prompt)|\b(alert|prompt)\(' frontend --glob '!node_modules' --glob '!.next' --glob '!dist'` → zero new matches
- backend tests: `python -m pytest tests -q` (use the repo's existing venv/python as other tickets did)
- `npm run typecheck -w @pantry-pal/frontend`
- `npm run test:run -w @pantry-pal/frontend`
- `npm run build -w @pantry-pal/frontend`

## Allowed paths

- `database/migrations/023_item_groups.sql`, `database/migrations/023_item_groups.rollback.sql`
- `backend/services/item_group_service.py`, `backend/routers/item_groups.py`, `backend/app/main.py`, `backend/models/schemas.py`, `backend/services/pantry_service.py` (only `_row_to_item`)
- `tests/test_item_groups.py`
- `frontend/types.ts`, `frontend/services/itemGroupService.ts`, `frontend/contexts/pantry-provider.tsx`, `frontend/lib/shopping-list-utils.ts`, `frontend/lib/item-group-match.ts`
- `frontend/components/dashboard/**` (inventory view, rows, edit modal, a new group modal/row, add/scan views for the suggestion hook)
- `frontend/tests/shopping-list-groups.test.ts`, `frontend/tests/item-group-match.test.ts`
- this ticket file

## Out of scope / hard bans

- NO git commits, pushes, branch changes, or `git add`.
- NO dependency changes (no npm/pip installs, no package.json / lockfile / requirements edits).
- NO secrets, `.env` edits, Docker/deploy changes.
- No changes to existing migrations, existing rows, billing/subscription/entitlement code, or the PP-156 merge script.
- No auto-grouping, no category-based suggestions.
- No native browser dialogs.

## Acceptance Criteria

- [x] Ticket + TICKET_STATUS row
- [x] Migration 023 additive + rollback file; prod migration applied
- [x] Group CRUD API scoped by user; delete only unlinks
- [x] Pantry view shows group row with combined count, expandable to members
- [x] "Group with…" action on an item; rename / set target / ungroup / remove-from-group
- [x] Shopping list: group target, need = target − sum(member qty), no separate member rows; ungrouped unchanged
- [x] Strict name-key suggestion with one-tap in-app prompt; cream of chicken ≠ cream of mushroom; never auto-group
- [x] Backend + vitest tests added; typecheck, vitest, build, backend tests pass
- [x] Deployed, build-id verified, smoke via API

## Implementation notes (2026-11-23, 7:30 PM America/Chicago)

- Shipped in `49c84ab` + `e739760` (review fix: edit-modal hooks were called after an early return; moved above it). Live `build-id.txt` = `e739760`.
- Migration `023_item_groups` applied on prod; 0 groups, 0 linked items after deploy (no existing data changed). Backup before deploy: `/opt/pantry-pal/backups/pp160-pre-20261123-1924.sql` (219,609 bytes).
- Suggestions use exact `productMatchKey` equality only (brand + size stripped, flavor/variant words kept). No category matching. Prompt only on non-silent single adds/scans (Quick Scan loop is silent, so no prompt there). Dismissals saved in localStorage `pantry-group-suggest-dismissed`.
- Tests: backend 150 passed / 3 skipped (16 new in `tests/test_item_groups.py`); vitest 158 (15 new); typecheck, lint (0 errors), production build pass.
- Smoke: `/api/item-groups` returns 401 unauthenticated on the live backend (route registered); homepage 200; backend logs clean. No authenticated UI smoke was run.
