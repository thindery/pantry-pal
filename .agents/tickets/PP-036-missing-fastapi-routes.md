# PP-036: Port missing FastAPI routes (audit follow-up)

**Status:** ✅ Done  
**Priority:** P0  
**Phase:** 3 — Post-migration fixes  
**Created:** 2026-07-10  
**Source:** Migration audit Issues 1–3  
**Depends on:** PP-026  
**Blocks:** PP-034

---

## Description

FastAPI backend is missing routes the Next frontend still calls. Admin and scanning flows are broken.

## Acceptance Criteria

- [ ] `backend/routers/client_errors.py` — GET list, POST create, PATCH resolve (from `backend-legacy/src/routes/clientErrors.ts`)
- [ ] `backend/routers/scan.py` — POST `/api/scan-receipt`, POST `/api/visual-usage`, GET `/api/visual-usage/supported-items`
- [ ] Routers registered in `backend/app/main.py`
- [ ] `frontend/middleware.ts` — client-errors POST public if anonymous logging desired
- [ ] Contract tests for client-errors + scan routes
- [ ] `npm run test:backend` green

## Log

- 2026-07-10: Created from migration audit