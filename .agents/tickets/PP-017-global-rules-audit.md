# PP-017: Global rules compliance audit

**Status:** 🔄 To Do  
**Priority:** P0  
**Phase:** 2 — Playbook structure  
**Playbook:** `project-director/rules/global_rules.md`  
**Created:** 2026-07-10  
**Depends on:** PP-006  
**Blocks:** PP-032

---

## Description

Audit monorepo against global rules; file follow-up tickets for gaps that are not fixed inline.

## Acceptance Criteria

- [ ] Written audit note under `.agents/docs/global_rules_audit_YYYY-MM-DD.md`
- [ ] Checklist: TypeScript strictness, Zod boundaries, secrets, WAL/SQLite notes, auth header trust, webhook verification
- [ ] Each gap linked to existing PP ticket or new ticket ID
- [ ] No silent “known issues” without tracking

## Log

- 2026-07-10: Ticket created
