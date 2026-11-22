# PP-134: Payment-failed email design

**Status:** ✅ Done
**Priority:** P1
**Phase:** Email design (2026-11-22)
**Created:** 2026-11-22
**Completed:** 2026-11-22
**Depends on:** PP-131, PP-099
**Doc:** `.agents/docs/email-design-plan.md`

---

## Problem

The payment-failed email is a plain paragraph and a text link. It should feel calm, specific, and easy to act on, using the shared layout.

## Fix Plan

- [x] Keep an “action needed” subject, the amount, and a single “Update payment method” CTA to the account/billing portal
- [x] Do not put raw Stripe decline codes in the body
- [x] Use accent/danger color sparingly
- [x] Preview to `thindery@gmail.com` only

## Acceptance Criteria

- [x] PP-131 shell, `hello@` footer, plain-text fallback
- [x] Idempotency remains `invoice.failed:{invoice_id}`
