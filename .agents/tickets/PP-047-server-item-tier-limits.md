# PP-047: Server-side item tier limits

**Status:** 📋 Open  
**Priority:** P1  
**Phase:** 3 — Security remediation  
**Playbook:** `agent_paige_security_audit.md`, `billing_and_database.md`  
**Finding:** SEC-104  
**Created:** 2026-07-11  
**Depends on:** PP-028  
**Blocks:** —

---

## Problem

Free-tier 50-item cap is enforced only in `pantry-provider.tsx`. `POST /api/items` and barcode create paths do not call `subscription_service.can_add_items()`.

## Fix Plan

- [ ] Add `can_add_items` check in `backend/routers/items.py` create handler
- [ ] Add same check in `backend/routers/barcode.py` when saving new items
- [ ] Return 403 `TIER_LIMIT_EXCEEDED` with remaining count
- [ ] Keep client-side check as UX hint only

## Acceptance Criteria

- [ ] Authenticated free user at 50 items cannot `POST /api/items` (403)
- [ ] Pro/family users unaffected
- [ ] pytest covers tier limit rejection

## Log

- 2026-07-11: Created from security audit 2026-07-11