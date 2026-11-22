# PP-123: Extend email_sends and log every helper attempt

**Status:** 📋 Open
**Priority:** P1
**Phase:** Marketing dashboard (2026-11-22)
**Created:** 2026-11-22
**Depends on:** PP-096–PP-100 (send helper and transactional templates are done)
**Blocks:** PP-124 (webhook needs `resend_id` and a stable send row), PP-125 (Marketing section)
**Design:** `.agents/docs/marketing-dashboard.md`
**Reference:** User Kudos `email_logs` and Agent Paige `email_sent_log`

---

## Problem

`email_sends` (migration 019) is only an idempotency claim table: `id`, `user_id`, `template`, `idempotency_key`, `resend_id`, `created_at`. The helper does not store recipient, subject, status, or error text. On a Resend failure it **deletes** the claim row so a retry can proceed, which also erases the failure from any future dashboard.

Existing users were backfilled as `welcome` rows with no `resend_id` so they would not get a late welcome mail. Those rows must not count as emails sent.

The gold-standard dashboards (User Kudos, Agent Paige, and markdown-pdf’s `email_logs`) record every attempt: recipient, template, subject, `sent` / `failed`, error, timestamp, and (UK/Paige) `resend_id`.

Pantry Hub’s Resend key is send-only and cannot be used to backfill this from the Resend API.

## Behavior

- Keep the existing `email_sends` table (do not create a second `email_logs` table). Add a Postgres migration that adds, at least: `to_email`, `subject`, `status`, `error_message`, and an updated-at / last-event timestamp. Status values should cover `pending`, `sent`, `failed`, and a `backfill` (or `suppressed`) value for the welcome backfill. Leave room for webhook statuses from PP-124 (`delivered`, `bounced`, `complained`) plus `opened_at` / `clicked_at` if those columns live on this row.
- Change `send_email` in `backend/services/email_service.py` so every attempt is logged: write `to_email` and `subject` on insert; set `sent` + `resend_id` when Resend accepts; on failure **keep the row**, set `status = failed` and `error_message`, and only then allow a later retry (clear or replace the failed claim, or use a new attempt policy that does not hide the first failure). Do not delete failed rows.
- Mark existing backfill welcome rows so dashboards can exclude them. Do not send mail as part of this ticket.
- Never log `RESEND_API_KEY`, webhook secrets, or raw email HTML/text bodies.
- Unit tests: a successful mock send writes `sent` + `resend_id`; a failed mock send leaves a `failed` row with an error and does not disappear; `already_sent` still skips a successful idempotency key; backfill rows are not counted as sends.

## Out of scope

- Resend webhooks (PP-124).
- Admin Marketing UI (PP-125).
- A full-access Resend read key (PP-129).
- New campaign / drip templates.
- Deploy (reviewer / later implementer). Do not `git add -A`. Do not commit `2026-07-30`.

## Acceptance Criteria

- [ ] Migration extends `email_sends` with recipient, subject, status, and error fields; welcome backfill rows are excluded from send counts
- [ ] The helper logs every attempt and no longer deletes failed claims
- [ ] Idempotency for already-sent mail still holds
- [ ] Tests cover sent, failed, and skip-already-sent paths
- [ ] No secret values in logs, git, or chat
