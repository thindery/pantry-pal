# PP-153: E2E — cancel subscription and billing portal

**Status:** 🟡 Partly done (backend integration shipped overnight 2026-11-25; real Stripe test-mode browser run blocked on test keys)
**Priority:** P0
**Phase:** E2E regression suite (2026-11-22)
**Created:** 2026-11-22
**Updated:** 2026-11-22, 5:00 PM America/Chicago
**Depends on:** PP-147, PP-148, PP-152 (active Pro test user in Stripe test mode)
**Blocks:** —
**Coder later:** agy or Hermes — tickets only in this pass; no implementation, installs, or deploys now
**Source:** Tylor (via Remy), 2026-11-22 — Pantry Hub working with no regressions

---

## Goal

Prove a Pro test user can schedule cancellation (and still keep Pro until period end), reopen the Stripe billing portal, and reactivate if they cancel the cancel. This is P0 because it is a billing / entitlement path.

## User path

1. Start from a Pro test user created by PP-152 (Stripe **test mode** only).
2. Open `/dashboard/account` (`frontend/app/dashboard/account/page.tsx` → `AccountView` in `frontend/components/dashboard/views/account-view.tsx`).
3. **Cancel in-app:** use the cancel action, which calls `cancelSubscription` → `POST /api/subscription/cancel` (`frontend/services/subscription.ts`, `backend/routers/subscription.py`). The backend sets `cancel_at_period_end=True` on the Stripe subscription and calls `email_service.send_cancellation_scheduled` (email delivery is PP-154).
4. Confirm the UI and `GET /api/subscription` show `cancelAtPeriodEnd: true`, and that the tier remains Pro / active until the period actually ends (do not wait out a real period in CI; do not force-delete the subscription unless a separate, clearly isolated case uses a Stripe test-clock or a short test period).
5. **Reactivate:** use the resume action → `POST /api/subscription/reactivate`, and confirm `cancelAtPeriodEnd` is false and the plan is still Pro.
6. **Billing portal:** use the manage-billing action → `POST /api/subscription/portal` (`create_portal_session` in `backend/services/stripe_service.py`) and confirm Stripe Customer Portal opens in test mode (return URL `/dashboard/account/`). A smoke assertion that the portal URL is a Stripe test portal and loads is enough; do not cancel or mutate other customers there.
7. Optional deeper case (not required for the first smoke): a `customer.subscription.deleted` test-mode webhook downgrades to Free only when no other active/trialing sub exists (`_handle_subscription_deleted`).

## Assertions

- [ ] Pro test user sees billing / cancel controls on `/dashboard/account`
- [ ] In-app cancel sets `cancelAtPeriodEnd` and does **not** immediately drop the user to Free
- [ ] Reactivate clears `cancelAtPeriodEnd` and leaves the user Pro
- [ ] Portal endpoint returns a Stripe test-mode portal URL that loads
- [ ] Only Stripe TEST keys from env/CI; no live portal, no real customer, no secrets in git

## Allowed paths

- `e2e/` (account / portal / cancel specs)
- Minimal `data-testid` hooks on `account-view` if needed
- Include this spec in the PP-147 deploy smoke suite (billing is P0)
- Do not change cancel or portal business logic in this ticket

## Constraints

- Depends on the PP-147 harness and a test-mode Pro fixture from PP-152. No extra runtime dependencies.
- No commits, pushes, secrets, or deploys by the coding agent unless a later ticket says so. Stage explicit paths only.
- Coder later is agy or Hermes.

## Overnight 2026-11-25: backend part shipped

`tests/test_billing_cancel_postgres.py` covers cancel at period end (stays Pro), `customer.subscription.updated`, reactivate, billing portal (would have caught PP-174), off-site return URL rejected, cancel without a sub rejected, `customer.subscription.deleted` → Free, and deleted-but-another-active-sub stays Pro. Runs in CI `postgres-integration`.

Still open: the browser + real Stripe test-mode portal run, blocked on Stripe test keys and PP-148.
