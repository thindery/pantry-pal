# PP-124: Resend webhook endpoint with signature verify and idempotency

**Status:** 🔄 In review
**Priority:** P1
**Phase:** Marketing dashboard (2026-11-22)
**Created:** 2026-11-22
**Depends on:** PP-123
**Blocks:** Accurate delivery / bounce / complaint / open / click rates in PP-125
**Design:** `.agents/docs/marketing-dashboard.md`

---

## Problem

Sends are (or will be) logged when the helper calls Resend, but nothing records what happened after that. The production key is **send-only** and cannot read Resend’s stats API. User Kudos and Agent Paige defer opens/clicks to the Resend dashboard and do not ingest webhooks — Pantry Hub should do better, in-app, with a signed webhook.

## Behavior

- Add `email_events` (name may vary) with a unique Resend/Svix event id, the `resend_id` / `email_sends` row, event type, created_at, and a redacted payload if useful. Idempotent: a duplicate event id is accepted and not applied twice (same idea as `stripe_webhook_events`).
- Add `POST /api/webhooks/resend` next to the Stripe webhook. Verify the signing secret (`RESEND_WEBHOOK_SECRET`) using Resend’s Svix headers (`svix-id`, `svix-timestamp`, `svix-signature`). Reject missing or invalid signatures with 4xx and no body leakage. Do not require a user session.
- Subscribe (in the mypantryhub Resend account, docs only in the ticket until implemented) at least: `email.sent`, `email.delivered`, `email.bounced`, `email.complained`, `email.opened`, `email.clicked`, plus failed / suppressed / delayed if available.
- On a verified event, update the matching `email_sends` row (`delivered` / `bounced` / `complained`, `opened_at`, `clicked_at`). If a complaint arrives, also upsert `email_suppressions` so later sends can be skipped (define the rule for transactional vs optional mail in the helper; billing-critical mail should be reviewed, not silently dropped without a comment in code).
- Wire env placeholders only: `RESEND_WEBHOOK_SECRET` in `.env.example` and `.env.prod.example`. Real value stays on OVH, off git.
- Add `/api/webhooks/resend` to Next middleware `PUBLIC_PREFIXES` (today only `/api/webhooks/stripe` is public) and to nginx if the vhost allowlist is explicit. Coordinate with PP-128 so auth hardening does not block this route.
- Tests: valid signature is processed once; replay of the same event id is a no-op success; bad signature is 4xx and writes nothing.

## Out of scope

- Admin UI (PP-125).
- Minting a full-access Resend API key (PP-129).
- Changing Stripe webhooks.
- Deploy from a dirty worktree. Do not `git add -A`. Do not commit `2026-07-30`.

## Acceptance Criteria

- [x] Signature verification is required and tested
- [x] Event ids are unique / idempotent
- [x] Delivered, bounced, complained, opened, and clicked update the send row (and complaints land in suppressions)
- [x] The route is callable without a login and is on the public middleware allowlist
- [x] Secret names are documented; values are not committed

## Progress notes

- Added migrations `028_email_events.sql` and `028_email_events.rollback.sql` creating:
  - `email_events` (id PK = svix-id / Resend event id, resend_id index, email_send_id, event_type, occurred_at, created_at, payload JSONB storing only redacted metadata: type, created_at, email_id, subject, tags, bounce/complaint type).
  - `email_suppressions` (email PK lowercased, reason CHECK complained/bounced, source_event_id, created_at, updated_at).
- Implemented `backend/services/resend_webhook.py`:
  - `verify_svix(payload, headers, secret)`: verified with stdlib `hmac`, `hashlib`, `base64` only (no extra dependencies); handles `whsec_` prefix; verifies `v1` signature matches `svix-signature` header; enforces 5-minute timestamp tolerance; raises `SvixVerificationError` on failure.
  - `process_event(event, event_id)`: idempotent event ingestion with `ON CONFLICT (id) DO NOTHING` returning `{"duplicate": True}`; handles `email.sent` (pending/failed -> sent), `email.delivered` (sent -> delivered unless already bounced/complained), `email.bounced` (sets status to bounced, upserts `email_suppressions` if permanent bounce), `email.complained` (sets status to complained, upserts `email_suppressions`), `email.opened` (sets opened_at if null), `email.clicked` (sets clicked_at and opened_at if null), and `email.failed` (sets status to failed with error message).
- Updated `backend/services/email_service.py`:
  - Added `is_suppressed(email)` and masked email logging (`_mask_email`).
  - In `send_email`, skips non-billing emails for suppressed recipients with reason `'suppressed'`.
  - Billing-critical templates (`payment_*`, `cancel*`, `subscription_ended`) bypass suppression with a warning log and documented code comment.
- Added endpoint `POST /api/webhooks/resend` in `backend/routers/webhooks.py`:
  - 503 if `RESEND_WEBHOOK_SECRET` is unset; 400 generic error on invalid or missing signature; 200 `{"received": True}` on valid/duplicate payloads without session requirement.
  - Exempted `/api/webhooks/resend` from rate limiting in `backend/middleware/rate_limit.py`.
- Added `/api/webhooks/resend` to `PUBLIC_PREFIXES` in `frontend/middleware.ts`.
- Documented `RESEND_WEBHOOK_SECRET=whsec_YOUR_RESEND_WEBHOOK_SECRET` in `.env.example` and `.env.prod.example`.
- Added comprehensive unit tests in `tests/test_resend_webhook.py` and `tests/test_email_service.py`.
- **Operator step required for production deployment:**
  In the Resend dashboard (mypantryhub account) add webhook `https://www.mypantryhub.com/api/webhooks/resend` for the listed events and put its signing secret in `/opt/pantry-pal/.env.prod` as `RESEND_WEBHOOK_SECRET` (do NOT do that step now).
