# PP-152: E2E — checkout to Pro (Stripe test mode + webhook → plan active)

**Status:** 📋 Backlog
**Priority:** P0
**Phase:** E2E regression suite (2026-11-22)
**Created:** 2026-11-22
**Updated:** 2026-11-22, 5:00 PM America/Chicago
**Depends on:** PP-147, PP-148
**Blocks:** PP-153 (cancel / portal should start from an active Pro test user)
**Coder later:** agy or Hermes — tickets only in this pass; no implementation, installs, or deploys now
**Source:** Tylor (via Remy), 2026-11-22 — Pantry Hub working with no regressions

---

## Goal

Prove the revenue path: a Free test user can start Checkout, pay with a **Stripe TEST** card, the webhook grants Pro, and the app then shows an active plan. This is P0 because it is an entitlement / billing path.

`.agents/docs/billing-and-email.md` is partly stale (it still describes pre-PP-090/PP-092/PP-096 behavior). Trust current code: `backend/services/stripe_service.py` (`create_checkout_session`, `process_webhook`), `backend/routers/subscription.py`, `backend/routers/webhooks.py` (`POST /api/webhooks/stripe`).

## User path

1. Sign in as a **Free** test user (PP-148). Confirm `/api/subscription/tier` (or the account / pricing UI) shows Free.
2. Open `/pricing` (`frontend/app/pricing/page.tsx`, `frontend/components/PricingPage.tsx`) and start Pro checkout (monthly is enough for the smoke test). The client calls `createCheckoutSession` in `frontend/services/subscription.ts` → `POST /api/subscription/checkout`, then redirects to the Stripe Checkout URL. Success/cancel return URLs are `/checkout/success` and `/checkout/cancel`.
3. Complete Stripe Checkout in **test mode only** (for example card `4242…`, any future expiry, any CVC). Keys must be `sk_test_` / `pk_test_` and the webhook secret a test `whsec_`, all from server/CI env — never from git, never live keys, never production customers.
4. Land on `/checkout/success` (`frontend/app/checkout/success/page.tsx` + `frontend/components/CheckoutResult.tsx`).
5. Ensure `checkout.session.completed` and/or `invoice.paid` reach `POST /api/webhooks/stripe` (`verify_webhook` + `process_webhook`). In local/CI this may use the Stripe CLI (`stripe listen --forward-to …`), Stripe test webhook endpoints, or a controlled trigger of the test-mode events. `_handle_checkout_completed` and `_handle_invoice_paid` apply entitlement; `invoice.paid` also sends the payment-confirmation email (asserted in PP-154, not here).
6. Reload account or call `GET /api/subscription` / `GET /api/subscription/tier` / `GET /api/subscription/status` and confirm the plan is **active Pro** (or trialing if a test promotion/trial is in use — assert the entitlement the test actually creates, and that it is not Free).
7. Starting checkout again must not create a second active subscription (PP-089: reuse an open session or send the user to the billing portal).

## Assertions

- [ ] Free test user can obtain a Stripe Checkout URL from `POST /api/subscription/checkout`
- [ ] Test-mode payment completes and the user sees `/checkout/success`
- [ ] After the webhook, the app DB / `/api/subscription/tier` shows an active (or trialing) Pro plan
- [ ] A second checkout attempt does not create a duplicate active subscription
- [ ] Only Stripe TEST keys from env/CI are used; nothing is written to git; production `sk_live_` is never used
- [ ] No real customer, live charge, or production webhook secret is involved

## Allowed paths

- `e2e/` (checkout specs, Stripe test helpers)
- `playwright.config.ts` or deploy/CI env documentation for `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET`, and test price IDs (names already in `.env.example`)
- `./deploy/deploy-docker.sh` only if this spec is included in the smoke suite (it should be: billing is P0)
- Minimal `data-testid` hooks on `PricingPage` / `CheckoutResult` if needed
- Do not change checkout, webhook, or entitlement business logic in this ticket

## Constraints

- Depends on the PP-147 harness. No extra runtime dependencies except optional Stripe CLI in the test environment (not a package.json dependency).
- No commits, pushes, secrets, or deploys by the coding agent unless a later ticket says so. Stage explicit paths only.
- Coder later is agy or Hermes.
