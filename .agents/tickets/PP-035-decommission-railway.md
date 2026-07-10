# PP-035: Decommission Railway

**Status:** 🔄 To Do  
**Priority:** P1  
**Phase:** 3 — Modernization  
**Created:** 2026-07-10  
**Depends on:** PP-018; ideally PP-034 if Railway still serves users  
**Blocks:** —

---

## Description

Remove Railway as a runtime dependency: tear down services, remove env/project links, ensure monorepo docs no longer reference it as live hosting.

## Acceptance Criteria

- [ ] Confirm no production traffic still on Railway (or accept downtime if pre-launch)
- [ ] Railway project services stopped/deleted (user dashboard action)
- [ ] Env files and CI have no required Railway tokens for deploy
- [ ] DNS/webhooks not pointing at `*.up.railway.app`
- [ ] Note completion in TICKET_STATUS

## Log

- 2026-07-10: Ticket created
