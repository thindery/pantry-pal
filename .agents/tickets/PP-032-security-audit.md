# PP-032: Pre-OVH security audit

**Status:** 🔄 To Do  
**Priority:** P0  
**Phase:** 3 — Modernization  
**Playbook:** `agent_paige_security_audit.md`, global SEC rules  
**Created:** 2026-07-10  
**Depends on:** PP-017, PP-022, PP-028  
**Blocks:** PP-034

---

## Description

Security audit before production cutover: auth, webhooks, headers, secrets, SSRF, admin gating, Docker non-root.

## Acceptance Criteria

- [ ] Audit report in `.agents/docs/security_audit_YYYY-MM-DD.md`
- [ ] SEC-001 (identity headers) verified
- [ ] Stripe/Clerk webhook signatures verified
- [ ] Security headers baseline (CSP notes for Clerk/Stripe)
- [ ] No secrets in images or git
- [ ] Critical findings fixed or tracked with P0 tickets

## Log

- 2026-07-10: Ticket created
