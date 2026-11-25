# Billing and email setup

Short operator reference for Pantry Hub (`www.mypantryhub.com`). Key **names** only — never commit values. Findings from the 2026-11-22 audit; follow-up tickets are PP-090–PP-100. Duplicate-checkout cleanup is PP-089.

## Providers

| Concern | Provider | Notes |
|---------|----------|--------|
| Billing | **Stripe** | Checkout, Customer Portal, subscriptions, webhooks. Catalog is provisioned in `backend/services/stripe_service.py` (Pro / Family, monthly / yearly). |
| App email | **Resend** | Dedicated free account for `mypantryhub.com` only (not the `user-Resend` connector account). Domain verified 2026-11-22 4:21 PM America/Chicago. App helper in `backend/services/email_service.py` (`resend==2.6.0`). From: `Pantry Hub <hello@mypantryhub.com>` (`RESEND_FROM_EMAIL`). |
| Sign-in | **NextAuth v5 + Google OAuth** | No app-sent magic-link, verification, or password-reset email. Google may email the Google account on its own. Clerk is legacy and unused in production. |
| Public contact | `info@mypantryhub.com` | Footer, legal pages, `security.txt`. Transactional From is `hello@mypantryhub.com` (Cloudflare Email Routing to Tylor). |

Stripe can also email receipts or dunning from the Stripe Dashboard, but `Customer.create` currently sets only `metadata.userId` (no `email`), so those messages often cannot be delivered until PP-092.

## Stripe webhook events vs email

Endpoint: `POST /api/webhooks/stripe` (`backend/routers/webhooks.py`), verified with `STRIPE_WEBHOOK_SECRET`.

| Stripe event | What the app does today | Email today |
|--------------|-------------------------|-------------|
| `checkout.session.completed` | Upsert subscription entitlement from session metadata | None |
| `invoice.paid` | Record an admin transaction only — **does not** grant Pro (PP-090) | None (PP-098) |
| `invoice.payment_failed` | Record a failed transaction; set `past_due` | None (PP-099) |
| `customer.subscription.updated` | Update status / price / period end | None |
| `customer.subscription.deleted` | Downgrade to Free unless another active/trialing sub exists | None (PP-100) |
| Refund events (`charge.refunded` or equivalent) | Not handled (PP-094) | None |

App-owned emails to add (all via Resend, after PP-096):

| Event | Email | Ticket |
|-------|-------|--------|
| First successful Google sign-in (`isNewUser`) | Welcome | PP-097 |
| Successful paid invoice (first purchase and renewals, once per invoice) | Payment / subscription confirmation | PP-098 |
| `invoice.payment_failed` | Payment failed + update-card link | PP-099 |
| Cancel-at-period-end, and actual subscription end | Cancellation scheduled / subscription ended | PP-100 |

The privacy policy already says the product sends transactional emails.

## $1 first-month offer (PP-166)

Off unless `STRIPE_PRO_FIRST_MONTH_COUPON_ID` is set. The coupon is **$3.99 off, duration once**, so Pro monthly's first month is $1 and renewals are the $4.99 list price. It is applied only to Pro monthly Checkout, only for accounts that never had a subscription (no stored subscription id and none on the Stripe customer). Offer sessions carry `metadata.offer = pro_monthly_first_month_1usd` and use idempotency key `pantryhub-checkout-<user>-pro-month-offer-<coupon>`. Stripe does not allow `discounts` with `allow_promotion_codes`, so offer sessions have no promo-code box (non-offer sessions keep it, PP-077). The PP-089 active-subscription guard runs before any of this. `GET /api/public/offer` feeds the `/pricing` banner and homepage hero line. `admin_transactions.offer` / `is_comp` (migration 026) tag offer invoices and fully discounted (100% off, for example Tylor's own) invoices; admin revenue and the `offer` metrics block exclude comps. Rollback: unset the env var and restart the backend.

## Where keys live (names only)

Templates (placeholders only): repo-root `.env.example` and `.env.prod.example`. Frontend auth names also appear in `frontend/.env.example`. Production values live in `.env.prod` on the OVH host and are **not** committed.

### Stripe (backend)

- `STRIPE_SECRET_KEY`
- `STRIPE_PUBLISHABLE_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_PRO_MONTHLY_PRICE_ID`
- `STRIPE_PRO_YEARLY_PRICE_ID`
- `STRIPE_FAMILY_MONTHLY_PRICE_ID`
- `STRIPE_FAMILY_YEARLY_PRICE_ID`
- `STRIPE_PRO_FIRST_MONTH_COUPON_ID` (optional, PP-166; blank = offer off)

### Resend (placeholders in `.env.example` / `.env.prod.example`; real values only on OVH)

- `RESEND_API_KEY` — send-only key named `pantry-hub-backend`, restricted to `mypantryhub.com`. Never print or commit the value. Production: `/opt/pantry-pal/.env.prod` (`.env` symlinks there).
- `RESEND_FROM_EMAIL` — `Pantry Hub <hello@mypantryhub.com>`

If either is unset, `email_service.send_email` no-ops and logs (error in production). Do not use the old `user-Resend` account (justwithai / peak-collective / getmd2pdf) for this app.

### Auth and admin allowlist (not used to send mail)

- `AUTH_SECRET`
- `AUTH_URL`
- `AUTH_GOOGLE_ID`
- `AUTH_GOOGLE_SECRET`
- `ADMIN_EMAILS`

### Related public/site URLs (used for Checkout redirects and email links)

- `FRONTEND_URL` / `APP_URL`
- `NEXT_PUBLIC_SITE_URL`
- `NEXT_PUBLIC_API_URL`

## DNS (PP-095, live 2026-11-22)

Terraform (`deploy/terraform/main.tf`) now matches live Cloudflare DNS. **Do not `terraform apply` as part of a random deploy** unless you intend to touch DNS; the records are already live.

- Apex MX: Cloudflare Email Routing (do not add a Resend receiving MX)
- Apex SPF: `v=spf1 include:_spf.mx.cloudflare.net ~all` (no `amazonses.com` at the apex)
- `_dmarc`: `v=DMARC1; p=none; pct=100; rua=mailto:dmarc-reports@mypantryhub.com` — stay at `p=none` until a clean stretch of mail, then quarantine / reject
- `TXT resend._domainkey` — Resend DKIM
- `CNAME send` → `send.forge.rmta.net` (DNS only, not proxied)
- `CNAME rsend` → `rsend.forge.rmta.net` (DNS only, not proxied)

A 2026-11-22 test of `send_payment_confirmation` to Tylor landed in Gmail Inbox with `spf=pass`, `dkim=pass` (`@mypantryhub.com` / `s=resend`), and `dmarc=pass`.

