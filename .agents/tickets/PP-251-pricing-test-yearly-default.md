# PP-251: Pricing test: default the toggle to Yearly, or a first-year annual offer

**Status:** 📋 Open — needs Tylor yes
**Priority:** P3
**Ship mode:** needs Tylor yes
**Phase:** Race to $50 / Pricing test
**Created:** 2026-11-27, 5:35 PM America/Chicago
**Source:** Remy Grok relayed Tylor's race (Pantry Hub vs FlowRuns, first to $50 real revenue). Money-making work is pre-approved; customer emails, posts as Tylor, spend, and price/coupon changes still need Tylor's yes.
**Coding agent:** Grok Bot directly. Hermes, agy, and the Grok CLI are not used.
**Constraints:** $0 only. Never invent numbers, reviews or user counts. User-facing text says "AI", never a model name.

Baseline (2026-11-27, 5:14 PM CT, read-only prod DB + live Stripe via the server key): 1 paying subscriber (Pro monthly $4.99, full price), MRR $4.99, all-time net revenue $4.99 ($19.96 gross, $14.97 refunded duplicate checkouts), 0 trials, 3 user accounts total, $1 first-month coupon live with 0 redemptions, 0 yearly subscribers.

---

## Problem

Yearly has 0 subscribers. Defaulting /pricing to Yearly is copy-only; a first-year annual discount needs a new coupon.

## Acceptance Criteria

- [ ] Tylor approves which test. Any coupon or price change is drafted for approval; no duplicate prices or coupons.
