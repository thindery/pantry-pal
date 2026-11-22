# PP-126: Subscription funnel tiles on the admin dashboard

**Status:** 📋 Open
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

- [ ] Signups, trials, Pro/Family conversions, and churn (ended vs cancel-at-period-end) are visible for 7d / 30d / 90d and all-time
- [ ] Counts come from `users` / `user_subscriptions` / `admin_transactions` and are unit-tested against fixture rows
- [ ] The existing pantry-item “Total Users” KPI is not silently redefined
- [ ] No invented or placeholder numeric marketing copy
