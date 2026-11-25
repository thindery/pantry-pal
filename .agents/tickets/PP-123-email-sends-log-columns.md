# PP-123: Extend email_sends and log every helper attempt

**Status:** ✅ Done (overnight 2026-11-25, PR #68, merge e58fc58)
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

- [x] Migration extends `email_sends` with recipient, subject, status, and error fields; welcome backfill rows are excluded from send counts
- [x] The helper logs every attempt and no longer deletes failed claims
- [x] Idempotency for already-sent mail still holds
- [x] Tests cover sent, failed, and skip-already-sent paths
- [x] No secret values in logs, git, or chat

## Progress notes

- Added migrations `027_email_sends_log_columns.sql` and `027_email_sends_log_columns.rollback.sql` with columns `to_email`, `subject`, `status` (with CHECK constraint), `error_message`, `updated_at`, `opened_at`, `clicked_at`, backfill logic marking welcome rows with `resend_id IS NULL` as `backfill`, and indexes on `(status, created_at)` and `resend_id`.
- Updated `backend/services/email_service.py`:
  - `_record_send` inserts claims as `pending` with `to_email` and `subject`, and re-claims `failed` rows atomically on retry.
  - `send_email` updates to `sent` on success with `resend_id` and `updated_at`; on failure updates to `failed` with sanitized `error_message` (truncated to 500 chars, no API keys/bodies) without deleting the row.
  - `already_sent` checks for existing non-failed rows (`status != 'failed'`), allowing retries after failure while keeping welcome backfill rows suppressed.
  - Added `count_sent` helper excluding `status = 'backfill'` rows by default and documented SQL filter `WHERE status <> 'backfill'`.
- Added unit tests in `tests/test_email_service.py` verifying success logging, failure logging without delete, error sanitization, already_sent skipping, retry re-claiming without duplicate key, and backfill exclusion from counts while blocking welcome emails.

- Reviewed by Pantry Hub Lead 2026-11-25: migration applied on a throwaway Postgres 16 (001–025 then 027), welcome rows → `backfill`, re-apply and rollback round-trip clean; failed-row re-claim and backfill block verified in psql. Migration is 027 because 026 is reserved by the PP-166 offer branch.
