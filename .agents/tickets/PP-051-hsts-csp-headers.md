# PP-051: Add HSTS and Content-Security-Policy

**Status:** 📋 Open  
**Priority:** P2  
**Phase:** 3 — Security remediation  
**Playbook:** `agent_paige_security_audit.md`, `nextjs_config_and_conventions.md`  
**Finding:** SEC-107  
**Created:** 2026-07-11  
**Depends on:** PP-014  
**Blocks:** —

---

## Problem

Production returns X-Frame-Options, nosniff, and Referrer-Policy only. HSTS and CSP are missing at both nginx and Next.js layers.

## Fix Plan

- [ ] Add `Strict-Transport-Security` in nginx (Cloudflare handles TLS; align max-age with CF)
- [ ] Add CSP allowing self, Google OAuth, Stripe, necessary inline (nonce or hash strategy)
- [ ] Add `Permissions-Policy` restricting camera/mic to dashboard routes
- [ ] Document CSP exceptions for Gemini/Stripe if proxied server-side (PP-045)

## Acceptance Criteria

- [ ] `curl -sI https://www.mypantryhub.com` shows HSTS and CSP
- [ ] Sign-in, dashboard, checkout flows work without CSP violations
- [ ] Audit doc Section 4 probe updated

## Log

- 2026-07-11: Created from security audit 2026-07-11