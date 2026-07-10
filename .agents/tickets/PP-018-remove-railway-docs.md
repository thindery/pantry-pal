# PP-018: Remove/replace Railway-centric deploy docs

**Status:** 🔄 To Do  
**Priority:** P1  
**Phase:** 2 — Playbook structure  
**Created:** 2026-07-10  
**Depends on:** PP-013  
**Blocks:** PP-035

---

## Description

Replace Railway as the documented production path. Point to Docker/OVH scaffold and local Docker compose. Historical Railway notes may move to `docs/legacy/`.

## Acceptance Criteria

- [ ] Root DEPLOY.md (or DEPLOYMENT.md) describes Docker/OVH path
- [ ] Railway URLs/templates not presented as current production
- [ ] `.env.production.template` no longer requires Railway hostnames
- [ ] README deployment section updated
- [ ] Legacy Railway content archived if still useful for reference

## Log

- 2026-07-10: Ticket created
