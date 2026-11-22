# PP-100: Send a cancellation confirmation email

**Status:** 📋 Open  
**Priority:** P2  
**Phase:** Billing & email audit (2026-11-22)  
**Created:** 2026-11-22  
**Depends on:** PP-093, PP-096

---

## Problem

When a user cancels (cancel-at-period-end) or a subscription actually ends, the app updates Stripe and the database but sends no email. The customer has no written confirmation of when access ends or that it has ended.

## Fix Plan

- [ ] Send a “cancellation scheduled” email when cancel-at-period-end is set, including the access end date
- [ ] Send a “subscription ended” email when the subscription is deleted and the account is downgraded to Free (not when a duplicate extra subscription is canceled under PP-089 rules)
- [ ] Include a reactivate / pricing link
- [ ] Idempotent per subscription id + event kind

## Acceptance Criteria

- [ ] Period-end cancel sends the scheduled email once, with the correct end date
- [ ] Actual access end sends the ended email once, only for the linked subscription
- [ ] Canceling a non-linked duplicate does not email a downgrade
- [ ] Tests cover both emails and the duplicate-sub case
