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
| `invoice.upcoming` (PP-136, enabled on the live endpoint 2026-11-25) | Only when the next invoice charges money with no discount, the sub is active/trialing and not cancelling, and the sub is trialing or its latest invoice was discounted (the $1 first month, a 100%-off promo) | `renewal_reminder`: "Your Pro plan renews at $4.99/month on <date>", manage-billing link. Once per subscription + renewal date. Never says "trial". Stripe sends this event on the account's upcoming-renewal setting (default 3 days before). |

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

**Live since 2026-11-25, 1:57 PM CT (Tylor approved).** Live coupon `pro-monthly-first-month-1usd` (amount_off 399 USD, duration once, `applies_to` product `prod_Uwpb6QKjJjdP0B`). Stripe can only restrict a coupon by product, and Pro monthly and yearly share that product, so the monthly-only rule is enforced in code (`first_month_offer.coupon_for`). The id is set in `/opt/pantry-pal/.env.prod` (backup `.env.prod.bak-pp166-*`). Verified with a live Checkout Session that showed subtotal 499 / total 100 and was expired immediately (no charge). GA4 `purchase` sends the session's `amount_total` and omits `value` when unknown (no hardcoded 4.99).

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
- `LOW_STOCK_DIGEST_ENABLED` (optional, PP-137; blank = weekly opt-in low-stock email off, toggle hidden)

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
- `CNAME links` → `links2.resend-dns.com` (DNS only, not proxied; TTL auto). Resend open+click tracking subdomain added 2026-11-26, 6:14 PM CT. When open/click tracking is on, Resend rewrites those links through `links.mypantryhub.com`.

A 2026-11-22 test of `send_payment_confirmation` to Tylor landed in Gmail Inbox with `spf=pass`, `dkim=pass` (`@mypantryhub.com` / `s=resend`), and `dmarc=pass`.

## Weekly low-stock email (PP-137)

Opt-in only, off unless `LOW_STOCK_DIGEST_ENABLED=1`. Template `low_stock_digest`, once per user per ISO week, Sundays 9:00 AM CT from the OVH cron (`docker exec pantry-pal-backend python -m backend.jobs.low_stock_digest`). Not billing-critical: suppressed addresses are skipped, and every mail has a one-click unsubscribe (`/api/public/email/unsubscribe?token=`, plus `List-Unsubscribe` headers). Lists only items at or below the user's synced low-stock levels; nothing is sent when nothing is low.

## Email journeys (PP-194..PP-199)

Everything non-transactional goes through `backend/services/email_gate.py`. Env names only (values on OVH):

| Name | Meaning |
|------|---------|
| `EMAIL_JOURNEYS_ENABLED` | blank/false = off. `true` = journeys send to everyone eligible. Do not set until Tylor approves the copy in PP-195/PP-196 |
| `EMAIL_JOURNEYS_TEST_RECIPIENTS` | comma list; with the flag off, only these addresses get journey mail (test mode) |
| `EMAIL_MAILING_ADDRESS` | postal address line for the footer (CAN-SPAM). Live commercial mail is held without it. Tylor provided `334 E Kearney St #255, Springfield, MO` on 2026-11-26 (3:55 PM CT); set on OVH in `.env.prod` (quoted, because `#` would otherwise be an env comment). Send flags were not changed. |
| `EMAIL_ONBOARDING_SINCE` | ISO timestamp; only accounts created at/after it are enrolled in onboarding. Blank = nobody |
| `RESEND_WEBHOOK_SECRET` | not set on prod yet (PP-197) |

Runner: `docker exec pantry-pal-backend python -m backend.jobs.email_journeys [--dry-run]` (cron every 10 minutes, to be installed at go-live). Dashboard: Admin -> Marketing. Preview/test: set `EMAIL_JOURNEYS_TEST_RECIPIENTS=thindery@gmail.com`, subscribe that address on /recipes/, confirm, then `--dry-run` or wait for the next run; use `delivered@resend.dev` / `bounced@resend.dev` for webhook tests, never fake addresses at real providers.
Existing PP-193 subscribers are `pending` (never confirmed) and are not mailed. Backlog confirm is a separate decision.

## Weekly recipe email (PP-235, PP-241)

Three recipes from the library plus one short pantry tip, every week. Code: `backend/services/weekly_content.py` (recipe catalog, tips, rotation), `backend/services/weekly_recipes.py` (build, test copy, audience, approve, send), `backend/jobs/weekly_recipes.py` (cron entry), `journey_emails.render_weekly_issue` (layout). The catalog is loaded from `frontend/content/recipes/*.ts` at runtime (the backend image copies that folder), so every live public recipe is in the pool. `tests/test_weekly_recipes.py` checks that the catalog matches the library and that each recipe has an email JPG.

- **Draft first, nothing goes out unapproved.** Wednesday 9 AM Central the `build` job picks the recipes and tip, stores the issue in `email_weekly_issues` as a `draft`, and emails a `[TEST]` copy to `EMAIL_WEEKLY_TEST_TO` only. It never mails the list.
- **Approve & send** is a button in Admin -> Marketing (Weekly recipe email). It moves the draft to `approved` and starts sending; the `send` cron (every 15 minutes) resumes and finishes it. Sending is idempotent (one `email_sends` row per address per issue), gated by `EMAIL_JOURNEYS_*`, skips suppressed and unsubscribed addresses, and is held (stays `approved`) while mail is off or `EMAIL_MAILING_ADDRESS` is missing. "Skip this week" is available until sending starts.
- **`EMAIL_WEEKLY_AUTO_SEND`** is off by default. If set to `true`, a draft whose test copy went out approves itself `EMAIL_WEEKLY_AUTO_SEND_DELAY_HOURS` (default 24) later unless an admin skips it. Leave it off until Tylor says otherwise.
- **Rotation:** every live public recipe is in the pool (96 as of PP-241, and any added later). No recipe repeats within the last `(pool - 3) // 3` issues (31 weeks at 96 recipes). In-season dishes first (meteorological seasons, northern hemisphere); recipes tagged `holiday` are preferred from Nov 8 through Jan 7; a timely window lifts leftover turkey soup and green bean casserole around US Thanksgiving; and meals are mixed when the season allows. Tips rotate through all 17 before one repeats. Skipped issues do not count as used.
- **Audience:** confirmed recipe newsletter subscribers plus app users who switched on "Weekly recipe email" in their account (`email_preferences.weekly_recipes`, default off, shown only while marketing mail is on). One email per address. Unsubscribe is one click (`list=recipes` for subscribers, `list=weekly` for app users) and also works as a `List-Unsubscribe` header.
- **Stats** per issue (sent, delivered, opened, clicked, bounced) are real `email_sends` rows with `journey = 'weekly_recipes'` and `journey_step = <issue key>`; the `[TEST]` copy uses `<issue key>:test` and is not counted. Opens show n/a until Resend open events are seen.
- **Tip copy** is plain kitchen habits with no statistics or health claims. The one food-safety line (refrigerate within 2 hours, eat within 3 to 4 days) repeats the guidance on the recipe pages.
- **Images:** every catalog recipe has a 600x450 JPG in `frontend/public/email/` (AI illustrations, credited in `CREDITS.md`, alt text starts with "AI illustration", and the email says the pictures are AI illustrations). A recipe is not added to the pool without its JPG.

Cron on OVH (the server clock is UTC; two lines for 9 AM Central so it stays right across daylight saving, and `--only-at-hour 9` lets only the matching one run):

```
0 14,15 * * 3 docker exec pantry-pal-backend python -m backend.jobs.weekly_recipes build --only-at-hour 9 >> /var/tmp/pantry-weekly-recipes.log 2>&1
*/15 * * * * docker exec pantry-pal-backend python -m backend.jobs.weekly_recipes send >> /var/tmp/pantry-weekly-recipes.log 2>&1
```

Manual: `... weekly_recipes build [--date YYYY-MM-DD] [--no-test]`, `... weekly_recipes test <issue_key>` (another `[TEST]` copy), `... weekly_recipes send`.
