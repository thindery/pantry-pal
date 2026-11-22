# Billing and email setup

Short operator reference for Pantry Hub (`www.mypantryhub.com`). Key **names** only — never commit values. Findings from the 2026-11-22 audit; follow-up tickets are PP-090–PP-100. Duplicate-checkout cleanup is PP-089.

## Providers

| Concern | Provider | Notes |
|---------|----------|--------|
| Billing | **Stripe** | Checkout, Customer Portal, subscriptions, webhooks. Catalog is provisioned in `backend/services/stripe_service.py` (Pro / Family, monthly / yearly). |
| App email | **Resend** | Intended provider: `resend==2.6.0` in `requirements.txt`, `send.mypantryhub.com` MX/SPF in `deploy/terraform/main.tf`. **No send path is wired yet** (the SDK is never imported). |
| Sign-in | **NextAuth v5 + Google OAuth** | No app-sent magic-link, verification, or password-reset email. Google may email the Google account on its own. Clerk is legacy and unused in production. |
| Public contact | `info@mypantryhub.com` | Footer, legal pages, `security.txt`. Not an automated From address until PP-096. |

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

### Resend (not in templates yet — add in PP-096)

- `RESEND_API_KEY`
- A From-address variable (recommended name: `RESEND_FROM_EMAIL`), on the verified `mypantryhub.com` domain

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

Terraform uses `cloudflare_api_token` to manage DNS (SPF, DMARC, Resend `send` records). DKIM and live apex SPF still need work (PP-095).
