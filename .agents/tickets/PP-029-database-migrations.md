# PP-029: database/migrations + migrate.py pattern

**Status:** 🔄 To Do  
**Priority:** P0  
**Phase:** 3 — Modernization  
**Playbook:** `database_migration_python.md`  
**Created:** 2026-07-10  
**Depends on:** PP-026  
**Blocks:** PP-034

---

## Description

Formalize SQL migrations under `database/migrations/` with sequential apply, checksums, and rollback companions per portfolio standard.

## Acceptance Criteria

- [ ] `database/migrations/00x_*.sql` (+ rollback files where practical)
- [ ] migrate CLI status/apply/rollback
- [ ] Applied on backend startup or deploy gate
- [ ] Documented for local Docker + OVH
- [ ] No silent schema drift

## Log

- 2026-07-10: Ticket created
