# PP-135: Cancellation and win-back email design

**Status:** ✅ Done
**Priority:** P2
**Phase:** Email design (2026-11-22)
**Created:** 2026-11-22
**Completed:** 2026-11-25
**Depends on:** PP-131, PP-100
**Doc:** `.agents/docs/email-design-plan.md`

---

## Problem

`cancellation_scheduled` and `subscription_ended` are plain status notices. They should stay honest about access dates and offer a clear keep/resubscribe path, without guilt copy.

## Fix Plan

- [x] Scheduled: access through {period end}; CTA “Keep my plan” (reactivate / account)
- [x] Ended: now on Free, and only list Free limits that are on the pricing page; CTA “Resubscribe” → `/pricing/`
- [x] Still skip mail when a non-linked duplicate sub is canceled (PP-089 / PP-100)
- [x] Preview to `thindery@gmail.com` only; no invented social proof

## Acceptance Criteria

- [x] Both templates use the PP-131 shell and `hello@`
- [x] Idempotency keys unchanged (`cancel.scheduled:` / `cancel.ended:`)

## Progress Notes

- Updated `send_cancellation_scheduled` in `backend/services/email_service.py` to use branded shell `_wrap`, honest copy with formatted period end (fallback to "until the end of your current billing period"), and primary CTA "Keep my plan" pointing to `{app_url}/dashboard/account/`.
- Updated `send_subscription_ended` in `backend/services/email_service.py` to use branded shell `_wrap`, state "You're now on the Free plan", list only the 6 Free limits from `PricingPage.tsx` (`FREE_FEATURES`), and primary CTA "Resubscribe" pointing to `{app_url}/pricing/`.
- Kept idempotency key prefixes unchanged (`cancel.scheduled:` and `cancel.ended:`).
- Added comprehensive unit tests in `tests/test_email_service.py` covering branded shell rendering, CTA labels/URLs, formatted period end, fallback when unknown, pricing page limits on Free, and idempotency key consistency.
- Generated HTML previews in `/tmp/pp135-previews/` for reviewer inspection without sending email.
