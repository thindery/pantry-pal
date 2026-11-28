# PP-249: Family plan sells household features that are not built

**Status:** ✅ Live Nov 27, ~6:20 PM CT, build `35f9a8f`, [#177](https://github.com/thindery/pantry-pal/pull/177)
**Priority:** P1
**Ship mode:** needs Tylor yes
**Phase:** Race to $50 / Pricing honesty
**Created:** 2026-11-27, 5:35 PM America/Chicago
**Source:** Remy Grok relayed Tylor's race (Pantry Hub vs FlowRuns, first to $50 real revenue). Money-making work is pre-approved; customer emails, posts as Tylor, spend, and price/coupon changes still need Tylor's yes.
**Coding agent:** Grok Bot directly. Hermes, agy, and the Grok CLI are not used.
**Constraints:** $0 only. Never invent numbers, reviews or user counts. User-facing text says "AI", never a model name.

Baseline (2026-11-27, 5:14 PM CT, read-only prod DB + live Stripe via the server key): 1 paying subscriber (Pro monthly $4.99, full price), MRR $4.99, all-time net revenue $4.99 ($19.96 gross, $14.97 refunded duplicate checkouts), 0 trials, 3 user accounts total, $1 first-month coupon live with 0 redemptions, 0 yearly subscribers.

---

## Problem

/pricing sells Family ($7.99/mo, $59.99/yr) with household sharing, 5 members, an activity feed and admin controls. `sharedInventory` and `maxFamilyMembers` are not enforced anywhere; none of these features exist.

## Acceptance Criteria

- [ ] Tylor picks: hide Family from /pricing until built (recommended), or keep it and build household sharing first.
- [ ] Existing subscribers unaffected (0 Family subscribers today).
