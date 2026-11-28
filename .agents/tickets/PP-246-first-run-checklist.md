# PP-246: First-run checklist: first scan to value in under a minute

**Status:** ✅ Live Nov 27, ~6:20 PM CT, build `35f9a8f`, [#177](https://github.com/thindery/pantry-pal/pull/177)
**Priority:** P2
**Ship mode:** can ship now
**Phase:** Race to $50 / Onboarding
**Created:** 2026-11-27, 5:35 PM America/Chicago
**Source:** Remy Grok relayed Tylor's race (Pantry Hub vs FlowRuns, first to $50 real revenue). Money-making work is pre-approved; customer emails, posts as Tylor, spend, and price/coupon changes still need Tylor's yes.
**Coding agent:** Grok Bot directly. Hermes, agy, and the Grok CLI are not used.
**Constraints:** $0 only. Never invent numbers, reviews or user counts. User-facing text says "AI", never a model name.

Baseline (2026-11-27, 5:14 PM CT, read-only prod DB + live Stripe via the server key): 1 paying subscriber (Pro monthly $4.99, full price), MRR $4.99, all-time net revenue $4.99 ($19.96 gross, $14.97 refunded duplicate checkouts), 0 trials, 3 user accounts total, $1 first-month coupon live with 0 redemptions, 0 yearly subscribers.

---

## Problem

Both free accounts have 0 pantry items. New users land on an empty dashboard with no guided first step.

## Acceptance Criteria

- [ ] Users with 0 items see a 3-step checklist: scan or add a first item, set a low-stock level, open the shopping list.
- [ ] Each step deep-links to the existing screen; the checklist hides when done or dismissed.
- [ ] GA4 `onboarding_step` events. No email.
