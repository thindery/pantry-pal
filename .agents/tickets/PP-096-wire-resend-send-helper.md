# PP-096: Wire a Resend send helper and env keys

**Status:** 📋 Open  
**Priority:** P1  
**Phase:** Billing & email audit (2026-11-22)  
**Created:** 2026-11-22  
**Depends on:** PP-095 for production deliverability; emails PP-097–PP-100 depend on this

---

## Problem

`requirements.txt` pins `resend==2.6.0`, and Cloudflare DNS was prepared for Resend, but the app never imports Resend. There is no send helper, and `.env.example` / `.env.prod.example` have no Resend key names. Privacy policy says the product sends transactional emails; nothing is sent today.

## Fix Plan

- [ ] Add `RESEND_API_KEY` and a From-address variable (for example `RESEND_FROM_EMAIL`) to `.env.example` and `.env.prod.example` with placeholders only
- [ ] Add those names to the OVH production env (values stay off git)
- [ ] Implement a small backend helper that sends via Resend, fails loudly when the key is missing in production, and no-ops or raises clearly in tests
- [ ] Use a verified From address on `mypantryhub.com` (for example `noreply@mypantryhub.com`); keep `info@mypantryhub.com` as the public contact
- [ ] Log message ids / errors without logging API keys or full bodies that contain secrets

## Acceptance Criteria

- [ ] Env templates document the key names (no real values)
- [ ] A unit/integration test can send (or mock-send) one message through the helper
- [ ] Production does not ship a send path that silently swallows a missing key
