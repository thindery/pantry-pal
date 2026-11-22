# PP-132: Welcome / onboarding email with first-scan tips

**Status:** ✅ Done
**Priority:** P1
**Phase:** Email design (2026-11-22)
**Created:** 2026-11-22
**Completed:** 2026-11-22
**Depends on:** PP-131
**Doc:** `.agents/docs/email-design-plan.md`

---

## Problem

The welcome email only says thanks and points at the homepage. It does not help a new user scan or add a first item. Idempotency `welcome:{user_id}` and the existing-user backfill must stay.

## Fix Plan

- [x] Rewrite copy: short welcome, then 2–3 first steps (Quick Scan / barcode, add what’s in the cupboard, start a shopping list)
- [x] Primary CTA to `/dashboard/`
- [x] Mention receipt scan only as optional, and only within the live Free allowance (5 AI receipt scans/month)
- [x] Do not re-send to users already recorded in `email_sends` for `welcome`
- [x] Preview to `thindery@gmail.com` only; no invented social proof

## Acceptance Criteria

- [x] Uses the PP-131 layout and `hello@` footer
- [x] Plain-text fallback includes the same steps and URL
- [x] Existing backfilled users still do not get a retroactive welcome
