# PP-125: Admin Marketing section for email visibility

**Status:** ✅ Done (overnight 2026-11-25, PR #87, merge 33fce85)
**Priority:** P2
**Phase:** Marketing dashboard (2026-11-22)
**Created:** 2026-11-22
**Depends on:** PP-123; delivery/bounce/complaint rates are complete only after PP-124
**Blocks:** —
**Design:** `.agents/docs/marketing-dashboard.md`
**Reference:** User Kudos admin **Emails** tab; Agent Paige **Recent Emails Sent**

---

## Problem

Tylor wants the same kind of visibility another project already has: a dashboard section that shows emails sent and related health. Pantry Hub’s admin sidebar has Dashboard, Errors, Users, Products, Stripe, and Feature Flags, but no Marketing / Emails view. Users / Products / Stripe are still “coming in Phase 2” placeholders. After PP-096–PP-100, transactional mail can go out with no in-app way to see volume, failures, or complaint rate.

## Behavior

- Add a **Marketing** view to the existing admin shell (`AdminDashboard` + `Sidebar`). Gate it with the same admin auth as the rest of `/admin` (see PP-128).
- Period control can match the overview (7d / 30d / 90d).
- Show, from the app DB only (no Resend read API):
  - Sends by template and by day (exclude welcome backfill rows).
  - Delivery, bounce, and complaint rates once PP-124 is live; if the webhook is not shipped yet, show honest empty/pending state, not invented percentages.
  - Recent failures (template, recipient, error, time).
  - Opt-outs / suppressions (from PP-124’s table, or an empty state).
  - A recent-send table with the gold-standard columns: time, recipient, template, subject, status, and `resend_id`.
- A small config chip: Resend configured?, From address, webhook secret present?. Never display API keys or secrets.
- Optional: “send test” of an existing transactional template to the signed-in admin’s email. No drip campaign engine and no new marketing blasts in this ticket.
- Backend: admin-only JSON under `/api/admin/…` using `require_admin`. Do not put recipient lists on any public route.
- Funnel tiles are PP-126 (can live on this same view). Analytics outbound links are PP-127.

## Out of scope

- Implementing GA4 / GSC / Bing / Cloudflare (PP-117–PP-122).
- A Resend full-access key (PP-129).
- Building out the Users / Products / Stripe placeholder pages except as needed to add this nav item.
- Deploy. Do not `git add -A`. Do not commit `2026-07-30`.

## Acceptance Criteria

- [ ] Signed-in admins can open a Marketing section from the admin sidebar; non-admins cannot
- [ ] Sends-by-template, sends-by-day, recent failures, opt-outs, and a recent-send table are backed by `email_sends` / `email_events` (or honest empty states)
- [ ] Rates use webhook-backed statuses when present and do not invent numbers
- [ ] No API keys or webhook secrets appear in the UI or client bundle

## Progress Notes

- 2026-11-25 overnight: `GET /api/admin/email-metrics` (require_admin) + Marketing view in the admin sidebar with funnel tiles, sends by template/day (backfill excluded), status counts, rates only when webhook rows exist (else "Pending webhook"), recent failures, suppressions, recent sends (masked recipients, resend_id), and a config chip (booleans + From address, no secrets). Optional send-test skipped on purpose (no email sending).
