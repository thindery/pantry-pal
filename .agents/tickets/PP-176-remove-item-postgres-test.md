# PP-176: Postgres guard for "remove from pantry keeps history"

**Status:** ✅ Done (overnight 2026-11-25)
**Priority:** P1 (data loss guard)
**Phase:** Regression tests
**Created:** 2026-11-25, 3:05 AM America/Chicago (overnight sweep)
**Source:** Pantry Hub Lead. PP-162 / PP-163 were only tested with a mocked database.

---

## Goal

Prove against real Postgres that removing an item from a personal pantry:

- deletes only that user's `pantry_items` row (another user cannot remove it; their copy and history stay linked);
- keeps every earlier `activities` row, unlinked (`item_id` NULL by the 024 FK) but with name and `item_barcode` kept;
- logs one `DELETE` activity with the quantity on hand and `removed_from_pantry`;
- leaves the shared `product_cache` row in place;
- drops an item group only when its last member is removed.

## Done

`tests/test_item_remove_postgres.py` (3 tests), added to `npm run test:postgres` (CI `postgres-integration`). Test-only.
