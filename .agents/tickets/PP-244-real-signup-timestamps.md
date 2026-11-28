# PP-244: Real signup timestamps and login events so 7/30-day signups are measurable

**Status:** ✅ Live Nov 27, ~6:20 PM CT, build `35f9a8f`, [#177](https://github.com/thindery/pantry-pal/pull/177)
**Priority:** P1
**Ship mode:** can ship now
**Phase:** Race to $50 / Analytics
**Created:** 2026-11-27, 5:35 PM America/Chicago
**Source:** Remy Grok relayed Tylor's race (Pantry Hub vs FlowRuns, first to $50 real revenue). Money-making work is pre-approved; customer emails, posts as Tylor, spend, and price/coupon changes still need Tylor's yes.
**Coding agent:** Grok Bot directly. Hermes, agy, and the Grok CLI are not used.
**Constraints:** $0 only. Never invent numbers, reviews or user counts. User-facing text says "AI", never a model name.

Baseline (2026-11-27, 5:14 PM CT, read-only prod DB + live Stripe via the server key): 1 paying subscriber (Pro monthly $4.99, full price), MRR $4.99, all-time net revenue $4.99 ($19.96 gross, $14.97 refunded duplicate checkouts), 0 trials, 3 user accounts total, $1 first-month coupon live with 0 redemptions, 0 yearly subscribers.

---

## Problem

`users.created_at` was backfilled to one timestamp for all 3 accounts on 2026-11-25 and `login_events` has 1 row ever, so signups in the last 7/30 days cannot be measured from prod.

## Acceptance Criteria

- [ ] Record the first successful sign-in time per user (or Auth.js account creation) going forward.
- [ ] Confirm `login_events` is written on every sign-in.
- [ ] Admin funnel shows signups 7d/30d from the real field. No backfill with guessed dates.
