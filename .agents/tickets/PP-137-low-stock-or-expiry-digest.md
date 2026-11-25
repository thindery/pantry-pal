# PP-137: Low-stock or expiring-items digest (only if relevant)

**Status:** ✅ Built, switched off (2026-11-25). First send waits for Tylor to read the copy and set `LOW_STOCK_DIGEST_ENABLED=1`.
**Priority:** P3
**Phase:** Email design (2026-11-22)
**Created:** 2026-11-22
**Depends on:** PP-131
**Doc:** `.agents/docs/email-design-plan.md`

---

## Problem

A recurring “expiring items” digest would be useful only if we store expiration dates. `pantry_items` has quantity and in-app low-stock thresholds, but no expiry column. Sending an expiry digest now would be dishonest. A later **opt-in low-stock digest** may be worth it.

## Fix Plan

- [x] Do not send an expiry digest until an expiration field exists and is populated (no expiry content at all)
- [x] If a low-stock digest is added: default off, user opt-in, unsubscribe required (this is not a billing receipt)
- [x] Only include items at or below that user’s threshold; no invented counts
- [x] No send of any kind yet; copy is below for Tylor's review

## Acceptance Criteria

- [x] No digest is sent to all users by default
- [x] Marketing-style recurring mail has unsubscribe; transactional mail does not start including it

## Built (2026-11-25, Tylor approved in chat 1:54 PM CT)

- Migration 029 `email_preferences` (opt-in flag, synced thresholds, unsubscribe token). Default off.
- `backend/services/low_stock_digest.py`, cron entry `python -m backend.jobs.low_stock_digest [--dry-run]`.
- `GET/PUT /api/email-preferences` (signed in). `GET/POST /api/public/email/unsubscribe?token=` (one-click, also `List-Unsubscribe` + `List-Unsubscribe-Post` headers).
- Account page toggle "Weekly low-stock email", hidden while the flag is off; opting in syncs the user's category thresholds and item overrides (re-synced whenever the Account page is open).
- Items: quantity at or below the user's level (item override, then item target, then category, then 1). Out-of-stock items listed first as "Out". Max 25 rows, then "and N more in the app". Users with nothing low get nothing.
- Idempotent per user per ISO week (`digest.low_stock:<user>:<YYYY-Www>`). Not billing-critical, so suppressed addresses are skipped.
- **Switch:** `LOW_STOCK_DIGEST_ENABLED=1` in `/opt/pantry-pal/.env.prod`, then recreate the backend. While unset, the toggle is hidden, opt-in returns 409, and the cron no-ops.
- **Schedule:** Sundays 9:00 AM CT (OVH cron).

### Copy (for Tylor's review)

Subject: `Pantry Hub: 3 items running low this week` (count is the real number; "1 item" when one)

Heading: Running low this week

Body:
> These 3 items in your pantry are at or below the low-stock levels you set:
> - Eggs: Out
> - Milk: 1 gal left
> - Salsa: 2 jar left
>
> [Open my shopping list]
>
> You get this weekly because you turned on the low-stock email in Pantry Hub. Unsubscribe
