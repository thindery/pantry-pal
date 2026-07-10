# PP-021: Port Vite SPA routes/views into App Router

**Status:** ✅ Done (core port) — incomplete criteria in follow-ups  
**Priority:** P0  
**Phase:** 3 — Modernization  
**Created:** 2026-07-10  
**Depends on:** PP-020, PP-023 (can start modularize first)  
**Blocks:** PP-022  
**Follow-up:** PP-036 (backend routes for admin/scan flows), PP-039 (ticket/migration audit sync)

---

## Description

Migrate product UI from the Vite SPA into Next App Router pages and client components. Preserve feature parity: landing, dashboard, inventory, ledger, scanning, pricing, admin.

## Acceptance Criteria

- [ ] Routes for: landing, signed-in app views, pricing, admin, checkout result
- [ ] Components moved under `frontend/` with clear Server vs Client boundaries
- [ ] API client talks to backend base URL via env
- [ ] No reliance on Vite-only APIs (`import.meta.env` → Next env)
- [ ] Core user flows smoke-tested manually
- [ ] Vitest/RTL tests updated or rehomed for Next where practical

## Technical Notes

- Pair with PP-023: prefer porting already-split modules over dragging 3k-line App.tsx
- Clerk pages in PP-022

## Log

- 2026-07-10: Ticket created
