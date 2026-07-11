# PP-040: Brand consolidation — Pantry Hub (DBA)

**Status:** ✅ Done  
**Priority:** P1  
**Phase:** 3 — Post-migration  
**Created:** 2026-07-11  
**Depends on:** —  
**Blocks:** —

---

## Description

Audit and unify customer-facing branding to **Pantry Hub** (Peak Collective LLC dba Pantry Hub), matching shipinaday / userkudos legal pattern. Contact email: **info@mypantryhub.com**.

Internal repo/package names (`pantry-pal`, `@pantry-pal/*`) unchanged.

## Audit findings (pre-fix)

| Location | Was | Should be |
|----------|-----|-----------|
| Landing header/footer | PantryPal | Pantry Hub |
| Dashboard navbar | PantryPal | Pantry Hub |
| Pricing / checkout / upgrade copy | PantryPal | Pantry Hub |
| `app/layout.tsx` metadata | PantryPal | Pantry Hub |
| Footer copyright | PantryPal | Peak Collective LLC dba Pantry Hub |
| Support contact | placeholder `#` | info@mypantryhub.com |
| FastAPI `APP_NAME` / health | PantryPal API | Pantry Hub API |
| Sign-in page | Pantry Hub ✓ | — |

## Acceptance Criteria

- [x] `frontend/lib/site-content.ts` — LEGAL_NAME, DBA_NAME, BRAND_NAME, CONTACT_EMAIL
- [x] All user-facing frontend strings use constants
- [x] Footer shows `Peak Collective LLC dba Pantry Hub` + info@ mailto
- [x] Backend API display name updated
- [x] Ticket logged in TICKET_STATUS.md

## Log

- 2026-07-11: Ticket created; brand constants + UI sweep applied