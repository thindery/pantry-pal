# PP-091: Persist and de-duplicate Stripe webhook events

**Status:** ✅ Done  
**Priority:** P1  
**Phase:** Billing & email audit (2026-11-22)  
**Created:** 2026-11-22
**Completed:** 2026-11-22  
**Depends on:** PP-028, migration 007

---

## Problem

`database/migrations/007_create_stripe_webhook_events.sql` already defines `stripe_webhook_events` (`stripe_event_id` unique, `processed` flag, payload). No current backend code reads or writes that table.

Stripe retries events when the endpoint returns 400 (as it did in PP-078 and PP-089). Without idempotency on `event.id`, retries can record duplicate admin transactions or re-apply side effects.

## Fix Plan

- [x] Insert the Stripe `event.id` before handling (or in the same transaction as the side effects)
- [x] If `stripe_event_id` already exists and was processed, return 200 and skip work
- [x] Mark `processed` only after the handler succeeds; leave a failed insert retryable
- [x] Store `event_type` and `user_id` when known; do not return payload details to Stripe

## Acceptance Criteria

- [x] Delivering the same Stripe `event.id` twice applies entitlement / transaction side effects once
- [x] Pytest covers the duplicate-event path
- [x] The existing `stripe_webhook_events` table is used (no second audit table)
