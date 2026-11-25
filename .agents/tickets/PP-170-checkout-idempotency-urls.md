# PP-170: Checkout idempotency key includes the redirect URLs

**Status:** 🔄 In review
**Priority:** P2 (billing robustness)
**Phase:** Production follow-up
**Created:** 2026-11-25
**Depends on:** PP-089, PP-167
**Source:** Pantry Hub Lead overnight follow-up

---

## Problem

`create_checkout_session` used `pantryhub-checkout-{user}-{tier}-{interval}` as the Stripe idempotency key. Stripe rejects a reused key with different parameters, so a second checkout within 24 h from another origin (apex vs www) or another return path failed with an idempotency error (500 to the user).

## Behavior

`checkout_idempotency_key()` appends the first 16 hex chars of `sha256(success_url + "\n" + cancel_url)`. Identical retries still dedupe; changed URLs get a new key. URLs never appear in clear text in the key. PP-089 guards (portal redirect when active, open-session reuse) are unchanged.

## Acceptance Criteria

- [x] Same request → same key; changed success/cancel URL or interval → different key
- [x] Key does not contain the URLs and stays under Stripe's 255-char limit
- [x] `create_checkout_session` passes the URL-aware key
