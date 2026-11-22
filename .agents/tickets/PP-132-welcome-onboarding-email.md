# PP-132: Welcome / onboarding email with first-scan tips

**Status:** 📋 Open
**Priority:** P1
**Phase:** Email design (2026-11-22)
**Created:** 2026-11-22
**Depends on:** PP-131
**Doc:** `.agents/docs/email-design-plan.md`

---

## Problem

The welcome email only says thanks and points at the homepage. It does not help a new user scan or add a first item. Idempotency `welcome:{user_id}` and the existing-user backfill must stay.

## Fix Plan

- [ ] Rewrite copy: short welcome, then 2–3 first steps (Quick Scan / barcode, add what’s in the cupboard, start a shopping list)
- [ ] Primary CTA to `/dashboard/`
- [ ] Mention receipt scan only as optional, and only within the live Free allowance (5 AI receipt scans/month)
- [ ] Do not re-send to users already recorded in `email_sends` for `welcome`
- [ ] Preview to `thindery@gmail.com` only; no invented social proof

## Acceptance Criteria

- [ ] Uses the PP-131 layout and `hello@` footer
- [ ] Plain-text fallback includes the same steps and URL
- [ ] Existing backfilled users still do not get a retroactive welcome
