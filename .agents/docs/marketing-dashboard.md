# Marketing dashboard (email + funnel visibility)

Short design for adding a Marketing section to the Pantry Hub admin dashboard. Tickets: **PP-123–PP-129**. No feature code in this pass — implement later through agy or Hermes, never `grok -p`.

Reference for Tylor’s ask (“one of our projects had a marketing section of the dashboard to show emails sent”): the gold-standard admin email UIs in **User Kudos** and **Agent Paige**. Pantry Hub already has an admin app and a send-only Resend account, but no email visibility and no signup/subscription funnel.

## Reference projects

### User Kudos and Agent Paige (the match)

Both are listed as gold standards in `.agents/TICKET_STATUS.md`. They log every outbound Resend send in the app database and show it in admin.

| | User Kudos | Agent Paige |
|--|------------|-------------|
| Where | Admin tab **Emails** (`frontend/app/admin/page.tsx`, UK-091) | Admin **Email Operations** + **Recent Emails Sent** (PAIGE-196) and **Email Campaigns** (PAIGE-169) |
| Status / config | Resend configured?, From address, app URL | Provider, From, whether a key is present (not the value) |
| Templates | All campaign keys, trigger, delay, subject, active flag | Template list + preview/test send |
| Send log | Last 50 rows: time, recipient, template, subject, status, `resend_id`, errors | Last 50: time, recipient, type/campaign, subject, status (`sent` / `failed` / skipped) |
| Actions | Send test (one or all), dispatch due drips | Send test / campaign preview |
| Data source | App DB (`email_logs`, plus `email_campaign_templates` / `scheduled_emails`) | App DB (`email_sent_log`, same campaign tables) |
| Opens / clicks | **Not in-app.** Copy says use the Resend dashboard; the app only stores `resend_id`. No webhook ingestion. | Same pattern — no delivery/bounce/complaint/open/click webhook |

Neither project uses the Resend API as a live stats source for the dashboard. markdown-pdf (the other gold standard) also writes `email_logs` (`to_email`, `template_name`, `subject`, `status`, `error_message`, `sent_at`) from its send helper, but its admin page has no Emails / Marketing section.

### Looked at, not the match

- **shipinaday** `/ship-ops/marketing` is literally named Marketing, but it is a blog/SEO ops page (posts, categories, a static “Organic Clicks: 2.4k” mock, an audit checklist). It does not show emails sent.
- **justwithai** has no admin dashboard.
- **Bragle** admin (`admin.bragle.app`) is game ops (players, queue, ads, MFA). `opensAt` is a contest open time, not email opens.
- **mail-ops** is a shared outbound/inbox tool, not a product marketing dashboard.

## Pantry Hub today

### Admin

`/admin` exists (`frontend/app/admin/page.tsx` + `frontend/components/AdminDashboard.tsx`). Sidebar views: Dashboard, Errors, Users, Products, Stripe, Feature Flags.

What is real:

- Overview KPIs for a 7d / 30d / 90d window: “total users,” products by category, lifetime revenue from `admin_transactions`, DAU from `login_events`, recent transactions, failed-payment alerts.
- Client-error inbox (`/api/client-errors`).
- Feature flags panel.

What is a placeholder (“coming in Phase 2”): Users, Products, Stripe event logs. There is no Marketing / Emails view.

Caveat: “Total users” is `COUNT(DISTINCT user_id) FROM pantry_items`, not a signup count from `users`. People who signed in but never added a pantry row are missing. Funnel tiles (PP-126) should use `users` + `user_subscriptions` + `admin_transactions` and must not silently redefine that KPI.

### Admin auth

- Middleware (`frontend/middleware.ts`) requires a session for `/admin` and redirects non-allowlisted emails (`ADMIN_EMAILS`) to `/dashboard/`.
- NextAuth jwt/session callbacks set `session.user.isAdmin` from the same allowlist. The account view uses that flag for the admin link.
- API routes under `/api/admin` use `require_admin` → `is_admin_user(user_id, email)` (`ADMIN_USER_IDS` or `ADMIN_EMAILS`).
- Leftovers for PP-128: `NEXT_PUBLIC_ADMIN_EMAILS` is still in root and `frontend/.env.example` (unused in TS, but PP-050’s cleanup is incomplete; the ticket file is still marked Open even though TICKET_STATUS says Done). `/admin` is a client page with no server-side `isAdmin` check (middleware only). `is_admin_user` can still call the Clerk Users API for an email (PP-074 leftover). Middleware allowlists email only, not `ADMIN_USER_IDS`.

### Email helper (PP-096–PP-100, done)

`backend/services/email_service.py` sends via Resend when `RESEND_API_KEY` and `RESEND_FROM_EMAIL` are set. Templates: `welcome`, `payment_confirmation`, `payment_failed`, `cancellation_scheduled`, `subscription_ended`. Idempotency keys like `welcome:{user_id}`, `invoice.paid:{invoice_id}`.

Table `email_sends` (migration 019) is an **idempotency claim table**, not a marketing log:

```
id, user_id, template, idempotency_key (unique), resend_id, created_at
```

Gaps versus the gold standards:

- No `to_email`, `subject`, `status`, or `error_message`.
- A failed send **deletes** the claim row (`DELETE … WHERE idempotency_key = %s AND resend_id IS NULL`), so failures disappear and the next attempt can retry (good for delivery, bad for a failure inbox).
- Existing users were backfilled as `welcome` rows with no `resend_id` so they would not get a late welcome. Those must not count as sends.
- No webhook, no delivery/bounce/complaint/open/click state, no opt-out / suppression table.
- `POST /api/emails/welcome` can be called by any signed-in user for themselves (idempotent). There is no admin list/stats API.

Pantry Hub now uses a **separate free Resend account** for `mypantryhub.com`, with a **send-only** API key. That key cannot read Resend’s email stats API. Do not “just list emails from Resend.” Log sends in the app DB and ingest events through a signed webhook. A full-access read key is a separate ask (PP-129) and needs Tylor’s yes.

There is no unsubscribe / email-preference table today. Transactional billing mail should still send; complaint webhooks should suppress future marketing (and, after review, repeated transactional mail to a complaining address).

## Recommended shape

Keep `email_sends` as the one send log (do not invent a parallel `email_logs` table). Add an `email_events` table for webhook payloads, and a small suppressions table.

```
email_sends          one row per attempted send (idempotency + current status)
email_events         one row per Resend webhook event (unique resend event id)
email_suppressions   complaint / unsubscribe / manual opt-out
```

Status on `email_sends`: `pending` (claimed, not yet accepted by Resend) → `sent` (Resend accepted, `resend_id` set) or `failed` (keep the row, store `error_message`; do not delete). Webhooks then set `delivered`, `bounced`, `complained`, and timestamps for `opened_at` / `clicked_at` without inventing a new send.

Backfill welcome rows: mark them `backfill` or `suppressed` in the migration so dashboards can exclude them.

Webhook: `POST /api/webhooks/resend`, verified with `RESEND_WEBHOOK_SECRET` (Resend/Svix: `svix-id`, `svix-timestamp`, `svix-signature`). Handle at least `email.sent`, `email.delivered`, `email.bounced`, `email.complained`, `email.opened`, `email.clicked`, and failed/suppressed if present. Idempotent on the Resend event id (same idea as `stripe_webhook_events`). Add the path to Next middleware `PUBLIC_PREFIXES` (today only `/api/webhooks/stripe` is public) and to nginx if needed. No admin session on this route.

Admin **Marketing** sidebar view (PP-125), in the existing dashboard, not a new app:

- Sends by template and by day (exclude backfill).
- Delivery, bounce, and complaint rates (from webhook-updated status; show “pending webhook” until PP-124 is live).
- Recent failures, with template, recipient, error, time.
- Opt-outs / suppressions.
- Recent send table, same columns as Agent Paige: time, recipient, template, subject, status (plus `resend_id` like User Kudos).
- Config chip: Resend configured? From address? Webhook secret present? Never display the API key.
- Optional: send a test of an existing template to the signed-in admin. No drip campaign engine unless a later ticket asks for one.

Subscription funnel tiles (PP-126) on Marketing or the overview, from first-party DB (optionally reconciled with Stripe later, see PP-112):

- Signups (`users`, period + all-time).
- Trials (`user_subscriptions.subscription_status = 'trialing'`; may be zero if Pantry Hub has no trial).
- Pro / Family conversions (first time a user becomes `active` paid, or first succeeded paid `admin_transactions` row).
- Churn (ended in period, or `cancel_at_period_end`).

Analytics links (PP-127) only: outbound buttons to GA4, Search Console, Bing, and Cloudflare Web Analytics. Setup, tags, keys, and privacy wording stay in **PP-117–PP-122** (doc: `.agents/docs/analytics-and-search-console.md`). If a property is not verified yet, show “not set up — see PP-11x” rather than inventing numbers.

## Ticket map

| Ticket | Title | Priority | Depends on |
|--------|-------|----------|------------|
| PP-123 | Extend `email_sends` and log every helper attempt | P1 | PP-096 (done) |
| PP-124 | Resend webhook (signature + idempotency) and `email_events` | P1 | PP-123 |
| PP-125 | Admin Marketing section | P2 | PP-123; rates complete after PP-124 |
| PP-126 | Subscription funnel tiles | P2 | — (users / subs / transactions already exist) |
| PP-127 | Links out to GA4 / Search Console / Cloudflare | P2 | Do not duplicate PP-117–PP-122 |
| PP-128 | Admin auth hardening leftovers | P2 | Coordinate webhook public path with PP-124 |
| PP-129 | Optional full-access Resend read key | P3 / needs yes | Tylor’s OK; not required if 123–124 work |

Coding later goes through agy or Hermes. Deploy only from a clean worktree with `./deploy/deploy-docker.sh main`, then verify `https://www.mypantryhub.com/build-id.txt`. Skip deploy while PP-116 shopping-list files are still staged.
