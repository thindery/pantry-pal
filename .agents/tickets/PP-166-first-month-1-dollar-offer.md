# PP-166: $1 first-month offer test on Pro monthly

**Status:** ✅ Merged dark (PR #62, Nov 25 12:39 AM CT); off until `STRIPE_PRO_FIRST_MONTH_COUPON_ID` is set, which needs Tylor's own yes
**Updated:** 2026-11-24 America/Chicago
**Priority:** P1
**Phase:** Revenue experiments
**Created:** 2026-11-24
**Depends on:** PP-089 (checkout guard and idempotency), PP-077 (promotion codes)
**Blocks:** —
**Source:** Money Maker (via Pantry Hub Lead), 2026-11-24. Tylor must approve before any live coupon, deploy or live charge.

---

## Behavior

- Pro **monthly** Checkout gets a Stripe coupon worth $3.99 off, `duration: once`, so the first month is $1.00 against the $4.99 list price. Yearly and Family never get it.
- Coupon ID comes from env `STRIPE_PRO_FIRST_MONTH_COUPON_ID`. Unset or blank means the offer is off and checkout is byte-for-byte what it is today.
- Only never-subscribed accounts get the coupon (no stored subscription id, and no subscription of any status on the Stripe customer). Everyone else gets normal checkout.
- Stripe rejects `discounts` together with `allow_promotion_codes`, so an offer session omits the promo-code box. Non-offer sessions keep it (PP-077).
- Checkout idempotency key gets an `-offer-<coupon>` suffix only on offer sessions, and an open session is only reused when its offer marker matches (so toggling the offer never trips Stripe's idempotency-mismatch error or serves a stale price). The PP-089 active-subscription guard and portal redirect run first and are untouched.
- Public `GET /api/subscription/offer` returns `{enabled, ...display numbers}` only. It never returns the coupon id.
- `/pricing` shows an offer banner and the homepage hero CTA shows a small offer line, only when `enabled`. List prices are unchanged.
- `admin_transactions` gets `offer` and `is_comp` columns (migration 026). A paid invoice that is 100% discounted (Tylor's own subscription) is `is_comp = true`. Admin revenue and the new `offer` metrics block exclude comp rows.
- Metrics block `offer`: redemptions, first-month revenue cents, and subscribers who went on to pay full price.

## Allowed paths (coding agent)

- `backend/services/first_month_offer.py` (new), `backend/routers/offer.py` (new), `backend/app/main.py` (router registration), `backend/middleware/rate_limit.py` (skip list), `frontend/middleware.ts` (public path), `backend/services/stripe_service.py`, `backend/services/admin_service.py`, 
- `database/migrations/026_*.sql`
- `frontend/services/subscription.ts`, `frontend/components/OfferBanner.tsx` (new), `frontend/components/PricingPage.tsx`, `frontend/components/LandingPage.tsx`, `frontend/types.ts` (only if needed)
- `tests/test_first_month_offer.py` (new), `frontend/tests/offer-banner.test.tsx` (new)
- `.env.example`, `.env.prod.example` (placeholder names only), `.agents/docs/billing-and-email.md`, this ticket, `.agents/TICKET_STATUS.md`

## Hard bans

No commits, no pushes, no secrets or real key values anywhere, no dependency churn (`package.json`, lockfiles, `requirements.txt`), no live Stripe calls, no deploy. Stripe test mode only.

## Acceptance criteria

- [x] Offer off by default; unset env leaves `create_checkout_session` calls identical to today.
- [x] Pro monthly only; yearly and Family unchanged.
- [x] PP-089 guard and idempotency tests still pass.
- [x] Banner on `/pricing` and homepage hero only when enabled.
- [x] Comp (100% discount) rows excluded from revenue and offer metrics.
- [x] Backend and frontend tests added; pytest, vitest, typecheck, lint and build pass.
- [ ] Live test-mode checkout: **blocked**, no Stripe test key on the Mini (the `.env`/`.env.dev` key is a placeholder and returns 401; Stripe CLI is not logged in). Mocked in unit tests.
- [ ] Tylor approves live setup (see PR description), then deploy.
