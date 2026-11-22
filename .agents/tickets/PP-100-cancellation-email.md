# PP-100: Send a cancellation confirmation email

**Status:** ✅ Done  
**Priority:** P2  
**Phase:** Billing & email audit (2026-11-22)  
**Created:** 2026-11-22
**Completed:** 2026-11-22  
**Depends on:** PP-093, PP-096

---

## Problem

When a user cancels (cancel-at-period-end) or a subscription actually ends, the app updates Stripe and the database but sends no email. The customer has no written confirmation of when access ends or that it has ended.

## Fix Plan

- [x] Send a “cancellation scheduled” email when cancel-at-period-end is set, including the access end date
- [x] Send a “subscription ended” email when the subscription is deleted and the account is downgraded to Free (not when a duplicate extra subscription is canceled under PP-089 rules)
- [x] Include a reactivate / pricing link
- [x] Idempotent per subscription id + event kind

## Acceptance Criteria

- [x] Period-end cancel sends the scheduled email once, with the correct end date
- [x] Actual access end sends the ended email once, only for the linked subscription
- [x] Canceling a non-linked duplicate does not email a downgrade
- [x] Tests cover both emails and the duplicate-sub case
