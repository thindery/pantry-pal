# PP-248: Free-limit and upgrade lifecycle emails (templates only, disabled)

**Status:** 📋 Open — needs Tylor yes
**Priority:** P2
**Ship mode:** needs Tylor yes
**Phase:** Race to $50 / Lifecycle email
**Created:** 2026-11-27, 5:35 PM America/Chicago
**Source:** Remy Grok relayed Tylor's race (Pantry Hub vs FlowRuns, first to $50 real revenue). Money-making work is pre-approved; customer emails, posts as Tylor, spend, and price/coupon changes still need Tylor's yes.
**Coding agent:** Grok Bot directly. Hermes, agy, and the Grok CLI are not used.
**Constraints:** $0 only. Never invent numbers, reviews or user counts. User-facing text says "AI", never a model name.

Baseline (2026-11-27, 5:14 PM CT, read-only prod DB + live Stripe via the server key): 1 paying subscriber (Pro monthly $4.99, full price), MRR $4.99, all-time net revenue $4.99 ($19.96 gross, $14.97 refunded duplicate checkouts), 0 trials, 3 user accounts total, $1 first-month coupon live with 0 redemptions, 0 yearly subscribers.

---

## Problem

No email reaches a free user who nears or hits a limit. There are no trials (0 trialing), so a trial-ending email does not apply.

## Acceptance Criteria

- [ ] Draft two templates behind an off flag: "You're at 45 of 50 items" and "You hit the free limit" with the real price line and the $1 offer when live.
- [ ] Nothing is sent until Tylor approves the copy and the flag.
