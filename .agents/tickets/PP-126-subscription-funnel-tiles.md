# PP-126: Subscription funnel tiles on the admin dashboard

**Status:** 🔄 In review
**Priority:** P2
**Phase:** Marketing dashboard (2026-11-22)
**Created:** 2026-11-22
**Depends on:** Existing `users`, `user_subscriptions`, `admin_transactions` (PP-090–PP-094, PP-112)
**Blocks:** —
**Design:** `.agents/docs/marketing-dashboard.md`
**Related:** PP-125 (can render these tiles on the Marketing view or the overview)

---

## Problem

The admin overview’s “Total Users” KPI is `COUNT(DISTINCT user_id) FROM pantry_items`, not signups, and it has no trial / Pro conversion / churn tiles. Users and Stripe sidebar items are still placeholders. With paying customers, Tylor needs a first-party funnel: how many people signed up, how many converted to Pro/Family, and how many churned.

Do not invent Stripe or GA4 numbers. Use the app DB; Stripe Dashboard can stay a link (and PP-112 covers Stripe-vs-DB reconciliation if a count looks wrong).

## Behavior

For the selected period (7d / 30d / 90d) and all-time, compute and display at least:

- **Signups** — new rows in `users` (NextAuth). This is the signup count; do not silently replace the existing pantry-item KPI. If that KPI stays, relabel it so it is clearly “users with pantry items.”
- **Trials** — `user_subscriptions.subscription_status = 'trialing'`. If Pantry Hub has no trial, show zero honestly.
- **Pro / Family conversions** — first time a user becomes paid-active, or the first succeeded paid invoice in `admin_transactions` (exclude $0 / free invoices and refunds). Break out Pro vs Family if cheap.
- **Churn** — subscriptions that actually ended in the period, plus a separate count (or badge) of `cancel_at_period_end` still in term (PP-093). Do not treat cancel-at-period-end as already churned.

Source of truth is the app DB. A “Open Stripe Dashboard” link is fine; do not scrape Stripe in the request path unless a later ticket says to.

Place the tiles on the Marketing view (PP-125) and/or the overview. Admin-only API, same `require_admin` gate.

## Out of scope

- Email send tables (PP-123–PP-125).
- GA4 conversion events (PP-117). This ticket is DB/Stripe-entitlement counts, not page analytics.
- Changing billing or webhook grant logic.
- Deploy. Do not `git add -A`. Do not commit `2026-07-30`.

## Acceptance Criteria

- [x] Signups, trials, Pro/Family conversions, and churn (ended vs cancel-at-period-end) are visible for 7d / 30d / 90d and all-time
- [x] Counts come from `users` / `user_subscriptions` / `admin_transactions` and are unit-tested against fixture rows
- [x] The existing pantry-item “Total Users” KPI is not silently redefined (relabeled to "Users with pantry items")
- [x] No invented or placeholder numeric marketing copy

## Progress Notes (2026-11-25)

- Added `get_funnel_metrics(period)` to `backend/services/admin_service.py` computing signups (from `users.created_at`), trials (from `user_subscriptions.subscription_status = 'trialing'`), paid conversions (from distinct first succeeded `admin_transactions` row with amount > 0 broken out by Pro vs Family, excluding refunds, failed, and $0 invoices), churned (from `user_subscriptions.subscription_status IN ('canceled', 'ended')` using `updated_at`), and cancel scheduled (`cancel_at_period_end = TRUE` and active/trialing).
- Exposed `GET /api/admin/funnel?period=7d|30d|90d` on `backend/routers/admin.py` with `require_admin` dependency and period validation.
- Added `getFunnelMetrics` in `frontend/services/adminService.ts`.
- Created `frontend/components/admin/FunnelTiles.tsx` and exported from `frontend/components/admin/index.ts` with 6 KPICard tiles (Signups, Trials, Pro conversions, Family conversions, Churned, Cancel scheduled) and honest loading/error handling.
- Extended `frontend/components/admin/KPICard.tsx` with optional growth, secondary text, and badge support.
- Updated `frontend/app/admin/page.tsx` with the subscription funnel row and relabeled the existing pantry-item "Total Users" KPI to "Users with pantry items".
- Added unit and router contract tests in `tests/test_admin_funnel.py` and UI vitest tests in `frontend/tests/admin-funnel.test.tsx`.
