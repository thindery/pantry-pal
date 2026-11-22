# PP-124: Resend webhook endpoint with signature verify and idempotency

**Status:** 📋 Open
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

- [ ] Signature verification is required and tested
- [ ] Event ids are unique / idempotent
- [ ] Delivered, bounced, complained, opened, and clicked update the send row (and complaints land in suppressions)
- [ ] The route is callable without a login and is on the public middleware allowlist
- [ ] Secret names are documented; values are not committed
