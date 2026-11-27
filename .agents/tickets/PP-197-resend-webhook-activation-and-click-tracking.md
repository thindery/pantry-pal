# PP-197: Activate the Resend webhook (PP-124) and add first-party click tracking

**Status:** ✅ Live (2026-11-26). Webhook is on the mypantryhub Resend account; signing secret is in `/opt/pantry-pal/.env.prod` only; `email.sent` and `email.delivered` events have landed in the admin Marketing view.
**Priority:** P2
**Phase:** Growth / email
**Created:** 2026-11-26, 1:10 PM America/Chicago
**Source:** Tylor (t79u, t80u, t81u): "get something setup here but even better ... visibility in a dashboard of seeing the emails, subscriptions, clicks ... All free services ... imagery in our emails"
**Coding agent:** Grok Bot directly. Hermes and the Grok CLI are not used.
**Allowed paths:** `backend/services/email_*.py`, `backend/services/journey_emails.py`, `backend/services/admin_email_marketing.py`, `backend/services/recipe_newsletter_service.py`, `backend/routers/{admin,email_preferences,recipe_newsletter}.py`, `backend/jobs/email_journeys.py`, `database/migrations/035_*`, `frontend/components/admin/*`, `frontend/components/recipes-public/RecipeNewsletterForm.tsx`, `frontend/services/adminService.ts`, `frontend/public/email/`, `tests/`, `.env*.example`, `.agents/`.
**Constraints:** $0 only (Resend free tier, existing OVH/Postgres). No new dependencies. No secrets in git, chat or tickets. Never commit the 2026-07-30 file, `.agents/email-previews/` or GROWTH-010. User-facing text says "AI", never a model name. Dashboard shows real rows only.
**Depends on:** PP-124 (handler, Svix verification, suppressions: already merged), PP-194

Priority is P2 because bounces and complaints are only suppressed once the webhook is live, and that matters the moment any marketing mail is turned on.

---

## Findings

- `POST /api/webhooks/resend` exists with stdlib Svix verification, idempotent `email_events` inserts, and permanent-bounce/complaint suppression (all tested).
- On OVH, `/opt/pantry-pal/.env.prod` now has `RESEND_WEBHOOK_SECRET` (set 2026-11-26, quoted; value never committed). Earlier, before the secret was set, the endpoint rejected every event and the dashboard showed "pending webhook".
- The `user-Resend` connector account holds justwithai / peak-collective / getmd2pdf only. `mypantryhub.com` is on its own free Resend account, so the connector **cannot** create this webhook (verified by listing domains).

## Remaining manual step — done (2026-11-26)

The webhook `https://www.mypantryhub.com/api/webhooks/resend` was created on the mypantryhub Resend account (id `b93b7276-2738-4d85-9cfd-84f348713dc8`, 8 events, enabled). The signing secret is in `/opt/pantry-pal/.env.prod` only (quoted; never git or chat). After a backend recreate, a [TEST] send to Tylor produced `email.sent` and `email.delivered` rows in `email_events` and in Admin -> Marketing. Open tracking had not yet produced an `email.opened` event at that check (`tracking.open_tracking_seen` was false).

DNS-only CNAME `links.mypantryhub.com` → `links2.resend-dns.com` is live (TTL auto, not proxied; documented in [#157](https://github.com/thindery/pantry-pal/pull/157)). When open/click tracking is on, Resend rewrites those links through `links.mypantryhub.com`.

## Shipped here

- First-party click redirect with `email_clicks` (works with Resend tracking off); human clicks set `email_sends.clicked_at`; scanner clicks are stored but not counted.
- Dashboard reports honestly: opens show "n/a" until Resend has actually sent an open event.

## Acceptance

- Redirect only ever lands on a site path; `//evil.example` falls back to the home page (tested).
- Unknown or forged send ids record nothing (tested).
