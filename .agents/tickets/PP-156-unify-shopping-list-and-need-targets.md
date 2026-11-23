# PP-156: Unify shopping-list products and default the need/target to 1

**Status:** ✅ Done
**Priority:** P1
**Phase:** User-reported bug
**Created:** 2026-11-22
**Updated:** 2026-11-22, 7:20 PM America/Chicago
**Depends on:** PP-088 (done — same-barcode / unbarcoded name+category merge), PP-116 (done — compact list + suggested-qty formula cap)
**Blocks:** PP-151 e2e shopping list may need its assertions updated after this ships
**Coder later:** agy or Hermes — tickets only in this pass; no implementation, installs, or deploys now
**Source:** Tylor, 2026-11-22, 6:31 PM America/Chicago — shopping tab on https://www.mypantryhub.com (phone screenshot). Follow-up at 6:31 PM: “need 5 is way too much. Global default target should be 1, with per-item override.”

---

## Problem

Tylor: the shopping list “makes no sense.” The same-looking products appear as separate rows, and every row says need 5 with the stepper at 5. “The data isn’t getting unified.” Example from the screenshot: “Pineapple slices” (Dole can) plus nearby “Pineapple Chunks In 100…”, “Original Diced Tomatoes”, “Roasted Red Bell Peppers”, “Tomato paste Have 2 · need 5”, “Whole kernel white corn Have 1 · need 5.”

This is **not** a data-loss bug (priority P1, not P0). It is a confusing live path: almost the whole pantry shows up as things to buy, with an inflated need.

### What PP-116 and PP-088 already did (do not redo)

- **PP-116** (`4cd698d`) is done and **already live** (prod `build-id.txt` is `db0ef3e`, which includes that commit). It compacted the rows/chrome and fixed the “Milk need 28” usage-formula bug (short history, ADJUST counted as use, last-array timestamp). It did **not** change the default need to 1, did not group same-looking products, and it **preserves** an existing shopping-list `suggestedQuantity` on Regenerate when it is under the cap (12). That preserve path is why tapping Regenerate does not clear the 5s.
- **PP-088** (`abb1ac4` / `7465a8e`) is done. Scan, manual add, and shopping-session add already go through `add_or_increment_item` (same barcode including UPC-A / leading-zero EAN-13, or unbarcoded same normalized name + category). Migration `017_merge_duplicate_pantry_items` ran on prod (schema_migrations `2026-11-22 02:42:42` UTC / 8:42 PM CT Nov 21). Unique indexes `idx_pantry_items_user_canon_barcode` and `idx_pantry_items_user_name_category_unbarcoded` are in place. Same-barcode duplicates are gone.

### Root cause of the remaining mess

**“Need 5” is not a hard-coded default and is not a stored par/target of 5.** There is no `target` / `par` column today.

“Need” is shopping-list `suggestedQuantity`, computed in `frontend/lib/shopping-list-utils.ts` (`calculateSuggestedQuantity`) and `frontend/contexts/pantry-provider.tsx` (`generateShoppingList`):

- Fallback when there is no usable REMOVE history (or history is shorter than 7 days): `max(threshold * 2, 1)`.
- In-stock low-stock rows then use `max(suggested - have, 1)`.
- Current **code** defaults (`frontend/lib/constants.ts` `DEFAULT_THRESHOLDS`, since `9c52961` on 2026-07-18) are **1 for every category**, which would yield need **1** for a have-1 item with no history — not 5.
- Thresholds are a **user/app setting** stored only in the browser: category defaults in `localStorage` key `pantry_threshold_config`, per-item overrides in `pantry_item_threshold_overrides`, edited in `ThresholdSettingsModal` (“Low stock thresholds”). The app **never migrates** a saved config when the code defaults change. The pre-July-18 defaults were `produce: 3`, `pantry/dairy/beverages/snacks/other: 2`, `frozen/meat: 1`.
- For **produce + have 1 + stale produce threshold 3**: fallback is 6, need is `max(6 - 1, 1) = 5`. That matches the screenshot exactly for the reported produce rows (Dole pineapple slices, chunks, original diced tomatoes, roasted red peppers, white corn; tomato paste is produce with have 2 — calculated would be 4, but `mergePreservedQuantity` keeps 5 if the row was first generated at have 1).
- The shopping list itself is **only** in `localStorage` key `pantry_shopping_list` (not in Postgres). `mergePreservedQuantity` keeps any stored need ≤ cap, including these 5s, even if thresholds are later reset. There is **no** `userEdited` / `quantityIsCustom` flag, so a stepper edit and a formula result are indistinguishable.

**Duplicates / no unification:**

- Prod inventory for Tylor (`thindery@gmail.com`, user `6094dbc9-9bb3-4b1b-abdd-f3dd513e598f`), read-only on 2026-11-22: **156 rows**, **155 distinct barcodes**, **1 unbarcoded** row, total qty 218. No remaining same-barcode duplicates. 110 rows have qty 1, 5 are at 0. At threshold 1, **115** rows would appear on the shopping list; at the stale produce/other defaults, about 140–150 would. That is why the list feels like “everything.”
- `generateShoppingList` emits **one shopping-list row per inventory row** that is low-stock or out of stock. It does not group by barcode or normalized name. Category grouping then splits the same name into different sections when categories disagree.
- Exact-name duplicate groups still on his account (different barcodes and/or a barcoded + unbarcoded pair; categories often disagree because Open Food Facts / scan assigned them differently):

  | Name | Rows | Qty sum | What’s different |
  |---|---|---|---|
  | Pineapple slices | 2 | 2 | Dole `038900001391` / produce vs Always Save `070038315759` / other |
  | Chicken broth | 2 | 2 | Great Value `078742020624` vs Chef's Cupboard `4099100004472`, both pantry |
  | German Chocolate Cake Mix | 2 | 2 | `3076648301783` / other vs Best Choice `070038301783` / snacks |
  | Milk | 2 | 3 | Unbarcoded qty 1 from 2026-07-11 plus Bakers Corner `4099100151299` qty 2 |

- There are **not** five “Pineapple slices” inventory rows. There are two exact “Pineapple slices” plus a third pineapple product, “Pineapple Chunks In 100% Pineapple Juice” (Dole `038900004699`, produce, have 1). Nearby canned tomatoes / corn / peppers are similarly named but distinct products (do **not** merge “Pineapple slices” with “Pineapple Chunks”, or “Diced tomatoes” with “Petite Diced Tomatoes”). If the screenshot still shows five identical Dole “Pineapple slices” rows, that cannot be explained from Postgres (the list is client-only); check for a client render / stale-`localStorage` bug after grouping is in place.
- PP-088 gap: a **barcoded** item and an **unbarcoded** item with the same normalized name (Milk) are not merged, and `find_existing_item` / the frontend match does not attach a new barcoded scan to the old unbarcoded row.

---

## Behavior

Tylor’s rule: **global default target is 1, with a per-item override.** Need is how many to buy to reach the target, not a made-up usage estimate and not `threshold * 2`.

1. **Target model.** Introduce a clear target (par) of how many the user wants to have on hand. Default **1** globally. Per-item target is editable (reuse or replace the existing per-item low-stock override UX; do not leave two competing “need” concepts). Prefer storing the per-item target on the pantry item in the DB (`target_quantity` nullable, null = use the default 1) so it survives devices; category-wide settings may remain as an optional way to set a default for a category, but those category defaults must also start at 1, and they must no longer feed a `* 2` suggested-qty formula. `need = max(target - have, 0)`. An item with have ≥ target does **not** appear on the shopping list. Out of stock with target 1 shows need 1. Drop the usage-based `calculateSuggestedQuantity` fallback of `threshold * 2` as the displayed need (usage-based suggestions, if kept at all, must stay opt-in or clearly secondary — not the default Tylor is staring at).
2. **Existing “need 5” values.** It is **not** reliably distinguishable which 5s the user typed: there is no edit flag, and Regenerate preserves formula output and stepper edits the same way. Given that the visible rows are systematically 5, treat auto-generated shopping-list quantities as formula output and **recompute** them from the new target (default 1) on first load after the change. Keep quantities only on **manual** shopping-list items (the user typed those). Also migrate stale `pantry_threshold_config` values that still exactly equal the pre-July-18 code defaults (`produce: 3`, `pantry/dairy/beverages/snacks/other: 2`) back to 1; **do not** change a category value the user set to something else (e.g. produce 4 or 5). Leave explicit `pantry_item_threshold_overrides` alone unless you are replacing that mechanism with the new per-item target (map them to targets, don’t drop them). Going forward, a stepper / target change must set an explicit per-item target (or a `userEdited` flag) so later regenerations do not clobber it.
3. **Shopping list grouping.** Group auto-generated rows by normalized name (case/trim; ignore category mismatches). One row: combined have, need = max(target - combined have, 0), optional muted subline for different brands. “Pineapple slices” (Dole + Always Save) becomes one line with have 2. Do not group merely similar names (“Pineapple slices” ≠ “Pineapple Chunks In 100% Pineapple Juice”).
4. **Scan / add path.** Keep PP-088 same-barcode increment. Close the gap: if there is no barcode match, attach to an existing item with the same normalized name, including an unbarcoded row when the new add has a barcode (Milk). Prefer bumping quantity rather than inserting a new row. Same normalized name + different barcode: increment / attach rather than creating a second row only when the ticket’s inventory-merge rules below say those rows should be one product; do not silently combine obviously different products.
5. **One-time inventory merge (P0 data-loss care, even though this ticket is P1).** Dry-run first and print the groups (name, brands, barcodes, quantities, ids) without writing. Take a backup before any write (same care as PP-088: Mini dump of `pantry_items` + `activities`, or equivalent). Then merge, summing quantities onto the kept row, repointing activities, never deleting quantity. Safe to auto-merge after dry-run review: **same normalized name, one barcoded + one unbarcoded** (Milk). Same normalized name + **different barcodes** (Dole vs Always Save pineapple, two chicken broths, two cake mixes): include them in the dry-run; default to merging when the normalized name is an exact match, because Tylor wants unification, but **do not merge** names that are only similar, and stop for a reviewer if a group looks like distinct products that should stay separate. Never lose a row’s quantity. Same-barcode dups should already be gone; do not weaken the unique indexes.

Subline copy should stay short, like today’s `Have N · need M`, but M must be the true buy quantity (`target - have`), not a stale 5.

## Out of scope / do not touch

- Backend billing, webhooks, email, Stripe.
- Marketing / landing copy.
- PP-116 compact chrome/row styling except as needed for a grouped subline.
- Do not install Flashwright or add dependency churn. Official Playwright stays for e2e (PP-147); only update tests if this ticket’s behavior changes PP-151 assertions, and only in allowed paths.
- Do not `git add -A`. Do not commit the stray `2026-07-30` file. Do not commit or deploy or print secrets — the reviewer will commit/deploy.
- Do not write to prod until a dry-run + backup have been reviewed.

## Allowed paths

- `frontend/lib/shopping-list-utils.ts` and unit tests (`frontend/tests/shopping-list-utils.test.ts` or a sibling)
- `frontend/contexts/pantry-provider.tsx` — generate/merge, scan/add match, target/need helpers; do not rewrite the provider
- `frontend/components/dashboard/ShoppingListRow.tsx`, `frontend/components/dashboard/views/shopping-list-view.tsx`
- `frontend/components/dashboard/ThresholdSettingsModal.tsx` and the per-item override UI (rename/clarify to “target” if that’s the model)
- `frontend/lib/constants.ts`, `frontend/lib/threshold-utils.ts`, `frontend/types.ts` — only as needed for default target 1 and per-item target
- `backend/services/pantry_service.py`, `backend/routers/items.py`, `backend/routers/barcode.py`, `backend/services/shopping_sessions_service.py` — find/increment/merge only
- `backend/models/schemas.py` — only if a `targetQuantity` field is added
- New migration under `database/migrations/` for nullable `target_quantity` and/or the one-time name-level merge (dry-run script or a clearly gated migration; backup first)
- Tests: `tests/test_pantry_dedupe.py`, `tests/test_items.py`, `tests/test_barcode.py`, and frontend unit tests for grouping + need = target - have, including the produce/have-1/old-threshold-3 → 5 case, which must become need 0 when target is 1 and have is 1 (item leaves the list)
- This ticket file (mark done when finished) and a TICKET_STATUS row if you can add one without clobbering other in-progress edits

## Acceptance Criteria

- [x] Ticket + status row for PP-156
- [x] Default target is 1; per-item target is editable and survives reload
- [x] Shopping-list need is `max(target - have, 0)`; items with have ≥ target are not listed; no row shows a made-up 5 from `threshold * 2` or a preserved stale value
- [x] Stale pre-July-18 category defaults still sitting in `localStorage` are reset to 1; user-changed category values and explicit per-item overrides are kept (or mapped to the new target)
- [x] Auto-generated shopping-list 5s are recomputed; it is documented that formula vs stepper-5 was not distinguishable, so auto rows are reset and only manual rows keep a typed qty
- [x] Shopping list groups exact normalized names (Dole + Always Save “Pineapple slices” is one row, have 2); “Pineapple Chunks” stays separate
- [x] Scan/add increments an existing same-barcode row, and also attaches to a same-normalized-name unbarcoded row (Milk gap closed)
- [x] One-time merge: dry-run + backup first; quantities summed; no data lost; report of groups merged vs left alone
- [x] Unit tests cover need/target, stale-5 reset, grouping, and the Milk attach case; no long suites; no dependency churn
- [x] Reviewer commits only allowed files, deploys, and verifies live `build-id.txt` and Tylor’s shopping tab

## Implementation notes (2026-11-22, 6:55 PM America/Chicago)

- Shipped in `25edb57` (live `build-id.txt` = `25edb57`; migration `020_add_pantry_item_target_quantity` applied on prod). Default target 1; optional per-item `target_quantity`; need = `max(target - have, 0)`; auto rows recomputed and grouped by exact normalized name; one-time localStorage reset of only exact pre-July-18 category defaults; barcoded scans attach to an unbarcoded same-name row.
- Because the default target is now 1, an item with have 1 is no longer listed; only out-of-stock (have 0) items appear unless a higher target is set. The pantry low-stock badge still uses `have <= threshold` (unchanged).
- Merge script is dry-run by default. Tylor approved merging all four groups; the apply ran 2026-11-22 at 7:19 PM CT for his account only. See merge notes below.

## Merge completed (2026-11-22, 7:20 PM America/Chicago)

Tylor approved at 7:18 PM CT: merge all four groups on his account only (`milk`, `pineapple slices`, `chicken broth`, `german chocolate cake mix`).

- Backup (data-only `pantry_items` + `activities`): `/opt/pantry-pal/backups/pp156-premerge-20261122-1919.sql` on OVH, and `/Users/thindery/backups/pantry-pal/pp156-premerge-20261122-1919.sql` on the Mini (108,943 bytes). Verified non-empty and containing his 156 item rows and 252 activity rows.
- Dry-run re-run on his user only matched those exact 4 groups (8 → 4): milk qty 3, the others qty 2. Then applied with `--apply --backup-confirmed --include-review` scoped to his email.
- After: his inventory 156 → 152 rows; total qty unchanged at 218; kept rows are Milk 3 (barcode attached), Pineapple slices 2 (Dole), Chicken Broth 2, German Chocolate Cake Mix 2. 252 activities, 0 orphans, 0 pointers left on deleted ids, 0 remaining exact-name duplicate groups. Backend logs clean; homepage 200; live build still `25edb57`.
