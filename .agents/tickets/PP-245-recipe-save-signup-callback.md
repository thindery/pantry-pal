# PP-245: Signed-out "Save this recipe" on public recipe pages, back to the recipe after sign-in

**Status:** 📋 Open
**Priority:** P2
**Ship mode:** can ship now
**Phase:** Race to $50 / SEO to signup
**Created:** 2026-11-27, 5:35 PM America/Chicago
**Source:** Remy Grok relayed Tylor's race (Pantry Hub vs FlowRuns, first to $50 real revenue). Money-making work is pre-approved; customer emails, posts as Tylor, spend, and price/coupon changes still need Tylor's yes.
**Coding agent:** Grok Bot directly. Hermes, agy, and the Grok CLI are not used.
**Constraints:** $0 only. Never invent numbers, reviews or user counts. User-facing text says "AI", never a model name.

Baseline (2026-11-27, 5:14 PM CT, read-only prod DB + live Stripe via the server key): 1 paying subscriber (Pro monthly $4.99, full price), MRR $4.99, all-time net revenue $4.99 ($19.96 gross, $14.97 refunded duplicate checkouts), 0 trials, 3 user accounts total, $1 first-month coupon live with 0 redemptions, 0 yearly subscribers.

---

## Problem

Recipe pages (96, the main SEO surface) ask visitors to create an account but drop them on the dashboard afterward, losing the recipe they wanted.

## Acceptance Criteria

- [ ] Signed-out visitors see Save to my recipes; it goes to sign-in with `callbackUrl` back to the recipe and saves it after login (free cap of 10 still applies).
- [ ] GA4 `recipe_save_signup` event. No change for signed-in users.
