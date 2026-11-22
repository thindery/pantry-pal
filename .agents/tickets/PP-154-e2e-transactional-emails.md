# PP-154: E2E — transactional emails triggered

**Status:** 📋 Backlog
**Priority:** P1
**Phase:** E2E regression suite (2026-11-22)
**Created:** 2026-11-22
**Updated:** 2026-11-22, 5:00 PM America/Chicago
**Depends on:** PP-147, PP-148; payment and cancel cases also need PP-152 / PP-153
**Blocks:** —
**Coder later:** agy or Hermes — tickets only in this pass; no implementation, installs, or deploys now
**Source:** Tylor (via Remy), 2026-11-22 — Pantry Hub working with no regressions

---

## Goal

Prove the app actually triggers its transactional Resend emails on the real user paths, and that those sends can be asserted through a **Resend test or mock** — never by emailing real customers. Payment and cancel mails support the P0 billing paths but this ticket is P1 (entitlement itself is covered by PP-152 / PP-153).

`.agents/docs/billing-and-email.md` is partly stale (it still says those mails were unwired). Current helpers live in `backend/services/email_service.py` (`send_welcome`, `send_payment_confirmation`, `send_payment_failed`, `send_cancellation_scheduled`, `send_subscription_ended`). From address in production is `Pantry Hub <hello@mypantryhub.com>` (`RESEND_FROM_EMAIL`). Sends are recorded in `email_sends` with idempotency keys.

## User path / triggers

| Event | Trigger in product | Helper / key |
|-------|--------------------|--------------|
| Welcome | First dashboard session after Google sign-in posts `POST /api/emails/welcome` (`dashboard-client-layout.tsx` → `backend/routers/emails.py`) | `send_welcome` / `welcome:{user_id}` |
| Payment confirmation | Stripe `invoice.paid` in `stripe_service._handle_invoice_paid` | `send_payment_confirmation` / `invoice.paid:{invoice_id}` |
| Payment failed | Stripe `invoice.payment_failed` in `_handle_invoice_failed` | `send_payment_failed` / `invoice.failed:{invoice_id}` |
| Cancellation scheduled | In-app `POST /api/subscription/cancel` and/or `customer.subscription.updated` when cancel-at-period-end is set | `send_cancellation_scheduled` / `cancel.scheduled:{subscription_id}` |
| Subscription ended | `customer.subscription.deleted` in `_handle_subscription_deleted` | `send_subscription_ended` / `cancel.ended:{subscription_id}` |

Drive welcome via the sign-in path (a new test user). Drive payment and cancel via Stripe **test mode** events or the in-app cancel used in PP-152 / PP-153. A payment-failed case can use a Stripe test failure or a signed test webhook fixture — not a live decline on a real cardholder.

## Assertions

- [ ] Each of the five templates above is attempted exactly once per idempotency key (a retry is skipped as `already_sent`)
- [ ] Assertion is against a **mock or test sink**, for example:
  - mock the Resend HTTP API and capture the payload (to, from, subject, template), or
  - use a Resend test/sandbox configuration that cannot reach real customers, and/or
  - read the `email_sends` row (`template`, `idempotency_key`, `resend_id`)
- [ ] From address and recipient are the test user / configured `RESEND_FROM_EMAIL`, never a production customer
- [ ] Missing `RESEND_API_KEY` in a deliberately unconfigured run skips with `not_configured` rather than throwing
- [ ] No message is sent to a real customer address; no production Resend key is required in CI if a mock is used

## Allowed paths

- `e2e/` (email specs and Resend mock / test-sink helpers)
- A test-only seam in `backend/services/email_service.py` **only if** a mock cannot be done at the HTTP layer — keep it minimal and off in production
- Do not change email copy (PP-131–PP-137) or DNS (PP-095) in this ticket

## Constraints

- Depends on the PP-147 harness. No extra runtime dependencies and no paid email-testing SaaS.
- No commits, pushes, secrets, or deploys by the coding agent unless a later ticket says so. Stage explicit paths only.
- Coder later is agy or Hermes.
