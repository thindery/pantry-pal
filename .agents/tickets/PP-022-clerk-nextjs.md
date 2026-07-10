# PP-022: Clerk Next.js + middleware JWT pattern

**Status:** 🔄 To Do  
**Priority:** P0  
**Phase:** 3 — Modernization  
**Playbook:** `clerk_authentication.md`, `clerk_middleware_pattern.md`  
**Created:** 2026-07-10  
**Depends on:** PP-020  
**Blocks:** PP-032

---

## Description

Replace `@clerk/clerk-react` SPA integration with `@clerk/nextjs`. Implement SEC-001 middleware pattern: never trust client identity headers; forward verified JWT to backend.

## Acceptance Criteria

- [ ] `@clerk/nextjs` installed (version per stack baseline)
- [ ] `middleware.ts` protects app routes; public marketing/sign-in
- [ ] Edge-safe middleware (see edge_runtime_safety playbook)
- [ ] Sign-in / sign-up routes
- [ ] Backend receives Authorization bearer JWT (not x-user-id from client)
- [ ] Document Clerk dashboard settings for local + future prod domains

## Log

- 2026-07-10: Ticket created
