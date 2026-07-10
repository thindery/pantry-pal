# PP-026: Express → FastAPI backend port

**Status:** 🔄 To Do  
**Priority:** P0  
**Phase:** 3 — Modernization  
**Playbook:** `fastapi_backend_patterns.md`  
**Created:** 2026-07-10  
**Depends on:** PP-016  
**Blocks:** PP-027, PP-028, PP-029

---

## Description

Port Express TypeScript API to FastAPI (Python 3.11) matching markdown-pdf / userkudos backend conventions. Preserve API contracts where possible so frontend migration is smooth.

## Acceptance Criteria

- [ ] FastAPI app structure under `backend/`
- [ ] Endpoints for: items, activities, sessions, barcode, receipts/scan, subscription, webhooks, admin, health
- [ ] Pydantic v2 models; production CORS; non-root Docker (`python:3.11-slim`)
- [ ] Clerk JWT verification (server-side)
- [ ] Postgres via `DATABASE_URL`
- [ ] Contract tests (pytest) for core routes
- [ ] Express tree removed or `backend-legacy/` temporary only with removal date
- [ ] `Dockerfile.backend` switched to Python multi-stage

## Technical Notes

- Large ticket: may split into PP-026a routes, PP-026b OCR, PP-026c admin if needed mid-implementation
- Receipt OCR (Tesseract) needs Python equivalent strategy
- Map existing Zod schemas → Pydantic

## Log

- 2026-07-10: Ticket created
