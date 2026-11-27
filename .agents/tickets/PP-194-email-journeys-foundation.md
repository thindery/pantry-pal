# PP-194: Email journeys foundation: send gate, journey state, unsubscribe + click endpoints

**Status:** ✅ Live (2026-11-26, 6:33 PM America/Chicago). `EMAIL_JOURNEYS_ENABLED=true`; cron installed. First run sent 0.
**Priority:** P2
**Phase:** Growth / email
**Created:** 2026-11-26, 1:10 PM America/Chicago
**Source:** Tylor (t79u, t80u, t81u): "get something setup here but even better ... visibility in a dashboard of seeing the emails, subscriptions, clicks ... All free services ... imagery in our emails"
**Coding agent:** Grok Bot directly. Hermes and the Grok CLI are not used.
**Allowed paths:** `backend/services/email_*.py`, `backend/services/journey_emails.py`, `backend/services/admin_email_marketing.py`, `backend/services/recipe_newsletter_service.py`, `backend/routers/{admin,email_preferences,recipe_newsletter}.py`, `backend/jobs/email_journeys.py`, `database/migrations/035_*`, `frontend/components/admin/*`, `frontend/components/recipes-public/RecipeNewsletterForm.tsx`, `frontend/services/adminService.ts`, `frontend/public/email/`, `tests/`, `.env*.example`, `.agents/`.
**Constraints:** $0 only (Resend free tier, existing OVH/Postgres). No new dependencies. No secrets in git, chat or tickets. Never commit the 2026-07-30 file, `.agents/email-previews/` or GROWTH-010. User-facing text says "AI", never a model name. Dashboard shows real rows only.

Priority is P2 because it unlocks the acquisition emails but blocks no customer or revenue flow today.

---

## What Just With AI (JWA) and the other projects taught us

Reviewed `justwithai` (`newsletter-api`, Hono + Resend), the Email Marketing Desk transcript, and ShipInADay's `funnel_email_log` cron.

| Source | Good | Gap we fix here |
|--------|------|-----------------|
| JWA newsletter-api | HMAC double opt-in, generic success (no enumeration), welcome journey as a Resend automation | State lives inside Resend, so there is no dashboard of who is on which step. Confirm-email failures returned `ok: true` silently. The segment sat at 0 because nobody confirmed and nothing flagged it. Domain open/click tracking was off. GET unsubscribe/confirm links are scanner-prone |
| JWA Email Marketing Desk | Held broadcasts until real confirms, no invented metrics | Manual Resend MCP polling was the only visibility |
| ShipInADay funnel | Simple cron + `dedupe_key` log: idempotent, easy to reason about | No unsubscribe, no step state, no gate |
| Pantry Hub today | `email_sends` idempotency, Resend webhook + suppression (PP-124), admin metrics (PP-125), low-stock digest with RFC 8058 headers | No journeys, no confirm, webhook secret not set on prod, no first-party clicks |

Our design: journey state in our own Postgres (visible, testable, $0), idempotency key per step, a single gate every non-transactional email passes, first-party click redirect, scanner-safe confirm/unsubscribe, and loud (not silent) confirm failures via a retry job and the dashboard's "Awaiting confirm" tile.

## Scope

1. `email_gate` (`backend/services/email_gate.py`): `EMAIL_JOURNEYS_ENABLED` (default off), `EMAIL_JOURNEYS_TEST_RECIPIENTS` (test mode: only those addresses), `EMAIL_MAILING_ADDRESS` (commercial mail is held in live mode without it; never invented). Enforced inside `email_service.send_email` for every category except `transactional`.
2. Migration 035 (+ rollback): `email_sends.category/journey/journey_step`, `email_journey_state`, `email_list_events`, `email_clicks`, double opt-in columns on `recipe_newsletter_subscribers`, `email_preferences.onboarding_tips`.
3. `email_journeys.run()` + `python -m backend.jobs.email_journeys`: enroll, retry missed confirmations (48h window only), send due steps. Idempotency key `journey:<journey>:<step>:<subject>`; stale steps (7 days late) stop instead of bursting.
4. `GET /api/public/email/click` (site paths only, no open redirect, scanner UAs recorded but not counted), `GET /api/public/email/confirm`, `GET|POST /api/public/email/unsubscribe?list=recipes|onboarding` (GET shows a button, POST/one-click does it, with undo). `List-Unsubscribe` + `List-Unsubscribe-Post` on all journey mail.
5. Cron (OVH, installed 2026-11-26, 6:33 PM CT): `*/15 * * * * docker exec pantry-pal-backend python -m backend.jobs.email_journeys >> /var/tmp/pantry-email-journeys.log 2>&1 # PP-194 email journeys`.

## Acceptance

- With no env flags set, every journey call returns `journeys_disabled` and nothing reaches Resend (tested).
- Test mode only reaches the allowlist (tested). Live mode without a mailing address holds commercial mail (tested).
- Double run cannot double-send (tested). Rollback SQL applies cleanly (verified locally).


## Go live (2026-11-26, 6:33 PM CT)

Tylor approved the copy of all 7 emails (t96u: "All looks good"). Forward-only go-live on OVH:

- Backed up `/opt/pantry-pal/.env.prod`, set `EMAIL_JOURNEYS_ENABLED=true` and `EMAIL_ONBOARDING_SINCE=2026-11-27T00:32:58+00:00` (6:32:58 PM CT). `EMAIL_JOURNEYS_TEST_RECIPIENTS` left unset. Backend recreated; `email_gate.mode()` is `on`.
- Existing app users (3) were created before the cutoff and were not enrolled. Prod had 0 `recipe_newsletter_subscribers` rows; no PP-193 confirm emails went out (`retry_confirmations` only retries pending signups from the last 48 hours, and the first run reported `confirmations: 0`).
- First `python -m backend.jobs.email_journeys` run (and a `--dry-run` immediately before it): `{"mode": "on", "enrolled_users": 0, "confirmations": 0, "due": 0, "sent": 0, "held": 0, "skipped": 0, "stopped": 0, "failed": 0}`. `email_journey_state` stayed at 0 rows.
