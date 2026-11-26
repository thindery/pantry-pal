# PP-198: Admin email dashboard: subscribers, journeys, per-email engagement, clicks, events

**Status:** 🟡 Shipping (code behind flags; no email goes to any real address until Tylor approves)
**Priority:** P2
**Phase:** Growth / email
**Created:** 2026-11-26, 1:10 PM America/Chicago
**Source:** Tylor (t79u, t80u, t81u): "get something setup here but even better ... visibility in a dashboard of seeing the emails, subscriptions, clicks ... All free services ... imagery in our emails"
**Coding agent:** Grok Bot directly. Hermes and the Grok CLI are not used.
**Allowed paths:** `backend/services/email_*.py`, `backend/services/journey_emails.py`, `backend/services/admin_email_marketing.py`, `backend/services/recipe_newsletter_service.py`, `backend/routers/{admin,email_preferences,recipe_newsletter}.py`, `backend/jobs/email_journeys.py`, `database/migrations/035_*`, `frontend/components/admin/*`, `frontend/components/recipes-public/RecipeNewsletterForm.tsx`, `frontend/services/adminService.ts`, `frontend/public/email/`, `tests/`, `.env*.example`, `.agents/`.
**Constraints:** $0 only (Resend free tier, existing OVH/Postgres). No new dependencies. No secrets in git, chat or tickets. Never commit the 2026-07-30 file, `.agents/email-previews/` or GROWTH-010. User-facing text says "AI", never a model name. Dashboard shows real rows only.
**Depends on:** PP-194, PP-125 (existing Marketing view)

Priority is P2 because Tylor needs visibility before any journey goes live, but it blocks no customer flow.

---

## Scope

Admin-only (`/api/admin/email-marketing`, same `require_admin` gate as the rest of /admin) panel added to the existing Marketing view:

- Mode chips: journeys OFF / TEST / LIVE, webhook secret set, mailing address set, onboarding enrollment on/off.
- Tiles: recipe subscribers (confirmed), awaiting confirm (with a "Held: journeys not live" note), new in period, unsubscribed in period.
- Subscribers over time (signed up / confirmed / unsubscribed per day, from `email_list_events`), sources and top recipe pages.
- Per journey: enrolled / active / done / stopped (with stop reasons), due-now count, and a per-step table: sent, delivered, opened, clicked, click rate. Plus a table of every marketing/journey email.
- Most clicked links (unique per send) and recent webhook delivery events (masked addresses).
- Mobile first: 2-column tiles, tables scroll inside their card at 390px. Real data only; missing data shows "n/a" or an explanation, never a made-up zero percent.

Better than JWA, where visibility meant polling the Resend MCP by hand.

## Acceptance

- Backend integration test seeds real rows and checks the response (tested). Vitest covers OFF/LIVE/empty/error states.
- Screenshot at 390px from a local test database (not production data).
