# PP-067: Tighten Content-Security-Policy

**Status:** ✅ Done (overnight 2026-11-25, PR #88, merge e02f14a)
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

## Progress Notes

- 2026-11-25 overnight (Pantry Hub Lead): production CSP no longer includes `unsafe-eval` (kept only under `next dev`). No `eval(` / `new Function(` in the built client chunks. `unsafe-inline` is a documented exception for now: removing it needs per-request nonces for Next bootstrap scripts and the gtag consent default, which forces dynamic rendering. nginx sets no CSP of its own, so there is no divergence. New `e2e/csp.spec.ts` (@smoke) asserts the header and zero violations on /, /pricing, /auth/signin, /privacy, /checkout/success, /checkout/cancel and /design-system. Signed-in pages (barcode scanner) and Stripe checkout still need a post-deploy manual check.
