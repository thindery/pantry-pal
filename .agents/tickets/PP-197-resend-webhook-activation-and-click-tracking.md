# PP-197: Activate the Resend webhook (PP-124) and add first-party click tracking

**Status:** 🟡 Shipping (code behind flags; no email goes to any real address until Tylor approves)
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
- On OVH, `/opt/pantry-pal/.env.prod` has `RESEND_API_KEY` and `RESEND_FROM_EMAIL` but **no `RESEND_WEBHOOK_SECRET`**, so the endpoint rejects every event and the dashboard shows "pending webhook".
- The `user-Resend` connector account holds justwithai / peak-collective / getmd2pdf only. `mypantryhub.com` is on its own free Resend account, so the connector **cannot** create this webhook (verified by listing domains).

## Remaining manual step (Tylor, ~2 minutes)

In the Pantry Hub Resend dashboard: Webhooks -> Add endpoint `https://www.mypantryhub.com/api/webhooks/resend`, events `email.sent, email.delivered, email.delivery_delayed, email.bounced, email.complained, email.opened, email.clicked, email.failed`. Also turn on Open and Click tracking for the `mypantryhub.com` domain if he wants opens/clicks from Resend. Then give Grok Bot the signing secret through the secure channel; it goes into `/opt/pantry-pal/.env.prod` only (never git or chat), then the backend restarts and a `delivered@resend.dev` test confirms events land.

## Shipped here

- First-party click redirect with `email_clicks` (works with Resend tracking off); human clicks set `email_sends.clicked_at`; scanner clicks are stored but not counted.
- Dashboard reports honestly: opens show "n/a" until Resend has actually sent an open event.

## Acceptance

- Redirect only ever lands on a site path; `//evil.example` falls back to the home page (tested).
- Unknown or forged send ids record nothing (tested).
