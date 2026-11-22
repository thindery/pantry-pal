# PP-094: Handle Stripe refund webhooks

**Status:** ✅ Done  
**Priority:** P2  
**Phase:** Billing & email audit (2026-11-22)  
**Created:** 2026-11-22
**Completed:** 2026-11-22  
**Depends on:** PP-089, PP-091

---

## Problem

The 2026-11-21 duplicate-charge incident (PP-089) required manual refunds. Webhook handlers cover checkout completion, invoice paid/failed, and subscription updated/deleted. There is no handler for `charge.refunded` or invoice refund events, so admin transactions and entitlement can stay wrong after a refund.

## Fix Plan

- [x] Handle the current Stripe refund event(s) used by this account (likely `charge.refunded`; confirm against the API version in use)
- [x] Record a refunded admin transaction (or update the existing invoice transaction) with the refunded amount
- [x] If the refund is for the subscription that grants access and no other active/trialing subscription remains, downgrade according to the same rules as deletion
- [x] Do not undo PP-089’s “keep the earliest subscription” rule when a refund is only for a duplicate that is already canceled

## Acceptance Criteria

- [x] A refund event updates admin transactions
- [x] A full refund of the only entitlement-granting subscription downgrades the user
- [x] Refund of a non-linked duplicate does not strip Pro
- [x] Pytest covers those cases
