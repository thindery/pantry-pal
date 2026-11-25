# PP-179: Favorite stores per ZIP code on the weekly-ads hub

**Status:** 📋 Open
**Priority:** P2
**Phase:** Weekly ads / shopping
**Created:** 2026-11-25, 2:57 PM America/Chicago
**Source:** Tylor (voice request)
**Depends on:** PP-164 (weekly-ads hub, `weekly_ad_stores`, migration 030)

---

## Problem

The weekly-ads hub (`/dashboard/weekly-ads/`) lists every nearby store for a ZIP. Tylor only shops at some of them and wants to star the ones he uses. Different ZIPs have different stores, so favorites must be saved per ZIP.

## Goal

When a signed-in user searches a ZIP, each store card has a star toggle. Starred stores are saved for that user **and that ZIP**, so ZIP A and ZIP B keep separate favorite sets.

## Requirements

1. **Data:** new migration `031_weekly_ad_store_favorites.sql` (+ `.rollback.sql`). Table `weekly_ad_store_favorites`: `user_id` (FK to users, ON DELETE CASCADE), `zip` (5-digit TEXT), `store_id` (FK to `weekly_ad_stores.id`, ON DELETE CASCADE), `created_at`. Primary key `(user_id, zip, store_id)`. Index on `(user_id, zip)`.
2. **API** (auth required, owner-only, in `backend/routers/weekly_ads.py`):
   - `GET /api/weekly-ads?zip=` returns each store with `is_favorite` for the current user and ZIP.
   - `PUT /api/weekly-ads/favorites/{zip}/{store_id}` stars it (idempotent).
   - `DELETE /api/weekly-ads/favorites/{zip}/{store_id}` unstars it (idempotent).
   - Validate the ZIP as 5 digits. Reject a store that isn't active or doesn't apply to that ZIP (404). Fallback (national) stores can be starred too.
3. **UI** (`weekly-ads-view.tsx`): a star button on each store card with an aria-label and pressed state, plus an optimistic toggle with rollback on error. Favorites sort first under a "Your stores" heading, and the rest go under "Other stores nearby". Remember the last-searched ZIP in localStorage so returning users land on their favorites.
4. **Analytics:** fire GA4 event `weekly_ad_favorite` with `action` (add/remove) and `zip3` (first 3 digits only, no full ZIP).
5. Free and Pro both get this; no paywall.

## Tests

- Backend (`tests/test_weekly_ads.py`): star, unstar, idempotency, per-ZIP isolation (starring in 65804 doesn't show in 65810), per-user isolation, bad ZIP returns 422/400, unknown or inactive store returns 404, and cascade on user delete.
- Frontend (`frontend/tests/weekly-ads-view.test.tsx`): the toggle renders the pressed state, favorites sort first, and rollback happens on API error.
- Backend tests, frontend tests, `tsc` and `next build` all pass.

## Allowed paths

- `database/migrations/031_weekly_ad_store_favorites.sql`, `database/migrations/031_weekly_ad_store_favorites.rollback.sql`
- `backend/routers/weekly_ads.py`, `backend/services/weekly_ads.py`
- `frontend/components/dashboard/views/weekly-ads-view.tsx`, `frontend/services/weekly-ads.ts`
- `tests/test_weekly_ads.py`, `frontend/tests/weekly-ads-view.test.tsx`
- This ticket file and its `.agents/TICKET_STATUS.md` row

## Rules for the coding agent

- No dependency changes (package.json, lockfiles, requirements) unless truly needed. If one is, stop and explain why.
- **No commits, no pushes, no secrets.** Leave changes in the working tree for review.
- Don't touch the stray `2026-07-30` file or `.agents/email-previews/`.
- Don't scrape store sites or add partner APIs.
