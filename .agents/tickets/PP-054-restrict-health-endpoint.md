# PP-054: Restrict public /health exposure

**Status:** 📋 Open  
**Priority:** P2  
**Phase:** 3 — Security remediation  
**Playbook:** `agent_paige_security_audit.md`, `ovh_deployment.md`  
**Finding:** SEC-110  
**Created:** 2026-07-11  
**Depends on:** PP-014  
**Blocks:** —

---

## Problem

nginx exposes `/health` directly to FastAPI without auth. Returns 200 with environment, uptime, and DB health details.

## Fix Plan

- [ ] Option A: Remove public nginx `location /health`; use internal Docker healthcheck only
- [ ] Option B: Require `X-Health-Token` shared secret header
- [ ] Return minimal `{ "status": "ok" }` for any public probe

## Acceptance Criteria

- [ ] `curl https://www.mypantryhub.com/health` returns 404 or minimal payload without internals
- [ ] Docker healthchecks still pass via internal network
- [ ] Deploy monitoring updated if needed

## Log

- 2026-07-11: Created from security audit 2026-07-11