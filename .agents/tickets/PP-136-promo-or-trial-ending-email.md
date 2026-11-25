# PP-136: Promo or trial-ending reminder (only if relevant)

**Status:** ✅ Done (2026-11-25, Tylor approved in chat 1:54 PM CT)
**Priority:** P2
**Phase:** Email design (2026-11-22)
**Created:** 2026-11-22
**Depends on:** PP-131
**Doc:** `.agents/docs/email-design-plan.md`

---

## Problem

The design plan includes a “trial ending” email, but the product does not currently use a Stripe trial. A $0 promo invoice leaves the subscription `active`. Building this mail before we can detect a real end date would be misleading.

## Fix Plan

- [x] Implement only if we have `trialing` or a reliable “first paid renewal after a $0 promo is in N days” signal — `invoice.upcoming` plus the subscription's latest invoice being discounted (PP-166 $1 month, 100%-off promos) or status `trialing`
- [x] Short reminder ~3 days before (Stripe's upcoming-renewal setting), with the renewal amount and a manage-billing link
- [x] PP-131 shell (`email_service.send_renewal_reminder`, template `renewal_reminder`). Real sends only for events that meet the conditions above; no preview send was made
- [x] Signal exists now (PP-166 live), so no dated note needed

## Acceptance Criteria

- [x] No “trial ending” mail ships to users who are simply `active` (test `test_plain_active_renewal_gets_nothing`)
- [x] Copy does not invent a trial if the period is a promotion code (copy says "promotional price ends"; a test asserts no "trial")

## Shipped (2026-11-25)

- Handler `_handle_invoice_upcoming` in `backend/services/stripe_service.py`; idempotent by webhook event id and by email key `renewal.reminder:<sub>:<renewal date>`.
- Subject: "Your Pro plan renews at $4.99/month on <date>". Body: "Your promotional price ends soon. On <date>, your Pro plan renews at $4.99/month on the card you have on file. You don't need to do anything to keep your plan. To change or cancel before then, manage your billing." Button: Manage billing.
- `invoice.upcoming` added to live webhook endpoint `we_1Twvx9RHCLA4QETrTSnoc38P`.
- Tests: `tests/test_renewal_reminder.py` (10).
