# PP-045: Proxy Gemini API server-side

**Status:** ❌ Cancelled (superseded by PP-058)
**Priority:** P0  
**Phase:** 3 — Security remediation  
**Playbook:** `agent_paige_security_audit.md`, `ssrf_protection.md`  
**Finding:** SEC-101  
**Created:** 2026-07-11  
**Depends on:** PP-044  
**Blocks:** PP-046

---

## Problem

`NEXT_PUBLIC_GEMINI_API_KEY` is baked into the client bundle (`geminiService.ts`, `voice-assistant.tsx`, `frontend/Dockerfile`). Any user can extract the key and run unlimited Gemini Live / vision calls.

## Fix Plan

- [ ] Add server-side route(s): `/api/ai/scan-receipt`, `/api/ai/visual-usage`, `/api/ai/voice-token` (or equivalent)
- [ ] Use `GEMINI_API_KEY` (server-only env); remove all `NEXT_PUBLIC_GEMINI_*`
- [ ] Require authenticated session on AI routes
- [ ] Enforce per-user rate limits before calling Gemini
- [ ] Rotate key after deploy; document in `.env.prod.example`

## Acceptance Criteria

- [ ] `rg NEXT_PUBLIC_GEMINI frontend/` returns no matches in source (dist excluded)
- [ ] Unauthenticated AI route returns 401
- [ ] Voice assistant and scan-usage views call server proxy only
- [ ] Docker build no longer accepts `NEXT_PUBLIC_GEMINI_API_KEY` build arg

## Log

- 2026-07-11: Created from security audit 2026-07-11