# PP-243: Pricing clarity: annual savings in real numbers, $1 offer on the Pro card, honest plan lists

**Status:** ✅ Live Nov 27, ~5:50 PM CT, build `002891b`, [#175](https://github.com/thindery/pantry-pal/pull/175). Also sped up the recipe browse test that timed out on CI at 96 recipes (test-only).
**Priority:** P1
**Ship mode:** can ship now
**Phase:** Race to $50 / Conversion / pricing copy
**Created:** 2026-11-27, 5:35 PM America/Chicago
**Source:** Remy Grok relayed Tylor's race (Pantry Hub vs FlowRuns, first to $50 real revenue). Money-making work is pre-approved; customer emails, posts as Tylor, spend, and price/coupon changes still need Tylor's yes.
**Coding agent:** Grok Bot directly. Hermes, agy, and the Grok CLI are not used.
**Constraints:** $0 only. Never invent numbers, reviews or user counts. User-facing text says "AI", never a model name.

Baseline (2026-11-27, 5:14 PM CT, read-only prod DB + live Stripe via the server key): 1 paying subscriber (Pro monthly $4.99, full price), MRR $4.99, all-time net revenue $4.99 ($19.96 gross, $14.97 refunded duplicate checkouts), 0 trials, 3 user accounts total, $1 first-month coupon live with 0 redemptions, 0 yearly subscribers.

---

## Problem

Annual plans exist (Pro $39.99/yr, Family $59.99/yr) but had 0 subscribers and the savings only showed after toggling. The page and paywall promised a 30-day money-back guarantee the Terms do not offer, and Pro listed features that do not exist (push notifications, CSV export, advanced analytics, priority support, cloud sync as a Pro-only perk).

## Acceptance Criteria

- [x] Yearly cards show the per-month cost and the computed saving (Pro $3.33/mo, save 33% = $19.89/yr; Family save 37% = $35.89/yr). Numbers come from one cents table in `frontend/lib/pricing.ts`, never hardcoded strings.
- [x] Monthly cards show the yearly alternative; the Pro monthly card shows the live $1 first month only when `/api/public/offer` says it is on.
- [x] Pro and Free lists name only enforced, shipped benefits (items, AI receipt scans, AI recipe builder, saved recipes).
- [x] The 30-day guarantee claim is removed from /pricing and the paywall (it contradicts Terms); see PP-250.
- [x] No Stripe price, product or coupon change. Checkout path covered by a unit test (no real charge).
