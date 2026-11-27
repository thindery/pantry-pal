# PP-242: In-app paywall at the free limits (50 items, 5 receipt scans/month)

**Status:** Shipping in this PR
**Priority:** P1
**Ship mode:** can ship now
**Phase:** Race to $50 / Conversion
**Created:** 2026-11-27, 5:35 PM America/Chicago
**Source:** Remy Grok relayed Tylor's race (Pantry Hub vs FlowRuns, first to $50 real revenue). Money-making work is pre-approved; customer emails, posts as Tylor, spend, and price/coupon changes still need Tylor's yes.
**Coding agent:** Grok Bot directly. Hermes, agy, and the Grok CLI are not used.
**Constraints:** $0 only. Never invent numbers, reviews or user counts. User-facing text says "AI", never a model name.

Baseline (2026-11-27, 5:14 PM CT, read-only prod DB + live Stripe via the server key): 1 paying subscriber (Pro monthly $4.99, full price), MRR $4.99, all-time net revenue $4.99 ($19.96 gross, $14.97 refunded duplicate checkouts), 0 trials, 3 user accounts total, $1 first-month coupon live with 0 redemptions, 0 yearly subscribers.

---

## Problem

Free users who hit 50 items or 5 receipt scans got nothing: the limit checks set React state that no component rendered, so the add silently did nothing (barcode saves showed a raw error). Every plan-limit hit is the strongest upgrade moment and it was lost.

## Acceptance Criteria

- [ ] Item add (manual and barcode) at the 50-item cap opens a clear upgrade prompt instead of a no-op or raw error; backend `TIER_LIMIT_EXCEEDED` opens the same prompt.
- [ ] Receipt scan at 0 remaining opens the receipt prompt.
- [ ] Paywalls only fire once the plan is known, so a paying user is never blocked while the plan loads.
- [ ] Pantry shows a free-plan meter from 45/50 items, and an at-limit message at 50.
- [ ] GA4 events (consent-gated): `paywall_view`, `paywall_dismiss`, `upgrade_click` with `source` and `feature`.
