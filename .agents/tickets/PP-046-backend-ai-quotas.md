# PP-046: Enforce AI and voice quotas on backend

**Status:** 📋 Open  
**Priority:** P1  
**Phase:** 3 — Security remediation  
**Playbook:** `agent_paige_security_audit.md`, `billing_and_database.md`  
**Finding:** SEC-105  
**Created:** 2026-07-11  
**Depends on:** PP-045  
**Blocks:** —

---

## Problem

Vision AI runs client-side via Gemini; `/api/visual-usage` accepts detections without checking or incrementing `ai_calls`. Free users bypass paid quotas.

## Fix Plan

- [ ] Call `subscription_service.can_scan_receipt()` / AI quota helpers before processing
- [ ] Increment usage counters on successful AI operations
- [ ] Return 403 with tier upgrade hint when quota exceeded
- [ ] Track voice session starts server-side

## Acceptance Criteria

- [ ] Free user exceeding AI quota gets 403 from `/api/visual-usage`
- [ ] Usage counters persist in DB and reflect in `/api/subscription/tier`
- [ ] Tests cover quota exceeded path

## Log

- 2026-07-11: Created from security audit 2026-07-11