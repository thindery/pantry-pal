# PP-067: Tighten Content-Security-Policy

**Status:** 📋 Open  
**Priority:** P2  
**Phase:** Security remediation (audit 2026-07-25)  
**Finding:** SEC-203  
**Created:** 2026-07-25  

---

## Problem

Production CSP allows `script-src 'self' 'unsafe-inline' 'unsafe-eval'`, weakening XSS mitigation.

## Fix Plan

- [ ] Audit Next 16 CSP requirements (nonces vs hashes)  
- [ ] Remove `unsafe-eval` if compatible with production build  
- [ ] Prefer nonces for inline scripts; keep Stripe `frame-src` / `connect-src` allowlists  
- [ ] Align nginx headers with Next config to avoid divergence

## Acceptance Criteria

- [ ] CSP without `unsafe-eval` (or documented exception)  
- [ ] App, Stripe checkout, and auth still function  
- [ ] Production header probe documents final policy
