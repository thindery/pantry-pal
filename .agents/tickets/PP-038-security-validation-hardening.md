# PP-038: Security and validation hardening (audit follow-up)

**Status:** 🔄 To Do  
**Priority:** P1  
**Phase:** 3 — Post-migration fixes  
**Created:** 2026-07-10  
**Source:** Migration audit Issues 12, 14, 16, 19  
**Depends on:** PP-032  
**Blocks:** —

---

## Description

Close gaps between security audit claims and implementation.

## Acceptance Criteria

- [ ] Receipt scan request max size (10MB) enforced server-side in Pydantic or router
- [ ] `ENABLE_API_DOCS=0` when `ENVIRONMENT=production` (or fix audit doc)
- [ ] `ALLOW_TEST_AUTH` hard-disabled when `ENVIRONMENT=production`
- [ ] Remove or implement `/api/webhooks/clerk` in middleware public routes
- [ ] Update `.agents/docs/security_audit_2026-07-10.md` to match code

## Log

- 2026-07-10: Created from migration audit