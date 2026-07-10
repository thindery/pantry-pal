# PP-039: Migration 013 + ticket status sync (audit follow-up)

**Status:** ✅ Done
**Priority:** P1  
**Phase:** 3 — Post-migration fixes  
**Created:** 2026-07-10  
**Source:** Migration audit Issues 18, 24  
**Depends on:** PP-029  
**Blocks:** —

---

## Description

Port missing SQL migration and sync ticket files with TICKET_STATUS reality.

## Acceptance Criteria

- [x] Port `backend-legacy/src/db/migrations/013_add_needs_sync_columns.sql` to `database/migrations/` (Postgres-compatible)
- [x] Barcode cache sync columns work with FastAPI barcode service
- [x] Reopen or annotate PP-026/PP-021 in ticket files where criteria incomplete
- [x] TICKET_STATUS reflects PP-036–039 follow-ups

## Log

- 2026-07-10: Created from migration audit
- 2026-07-10: Ported migration 013; updated barcode_service + TICKET_STATUS