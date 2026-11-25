# PP-128: Harden leftover admin auth issues

**Status:** ✅ Done (overnight 2026-11-25, PR #77, merge 64340ad)
**Priority:** P2
**Phase:** Marketing dashboard (2026-11-22)
**Created:** 2026-11-22
**Depends on:** PP-050 (intended cleanup), PP-074 (Clerk fallback removed from production auth)
**Blocks:** —
**Design:** `.agents/docs/marketing-dashboard.md`
**Related:** PP-124 (Resend webhook must remain public)

---

## Problem

`/admin` is already session-gated in middleware against `ADMIN_EMAILS`, and `/api/admin/*` uses `require_admin`. That is a solid baseline, but a few leftovers should be fixed before the Marketing section shows email recipients and revenue/funnel data.

1. **PP-050 is incomplete.** TICKET_STATUS marks it Done, but the ticket file is still Open, and `NEXT_PUBLIC_ADMIN_EMAILS=you@example.com` remains in the root `.env.example` and `frontend/.env.example`. It is unused in TS today, which is good, but the public-prefixed name should not stay in templates.
2. **`/admin` is a client page** (`frontend/app/admin/page.tsx`) with no server-side `session.user.isAdmin` check. Access depends entirely on middleware. Add a server-side gate (layout or page) so a middleware miss still redirects.
3. **`is_admin_user` can still call the Clerk Users API** for an email (`backend/clerk_auth.py`). Production auth is NextAuth (PP-074). That network call is leftover, surprising, and can fail closed or open depending on Clerk config.
4. **Allowlists are split.** Middleware and NextAuth only consult `ADMIN_EMAILS`. The backend also honors `ADMIN_USER_IDS`. Align them, or document that `/admin` is email-allowlist only.
5. **Webhooks.** Middleware `PUBLIC_PREFIXES` currently lists only `/api/webhooks/stripe`. PP-124’s `/api/webhooks/resend` must be added there (do that in PP-124 if this ticket has not landed; do not lock the webhook behind admin auth).

## Behavior

- Remove `NEXT_PUBLIC_ADMIN_EMAILS` from committed env templates. Keep server-only `ADMIN_EMAILS`. Confirm the client bundle does not contain admin email strings.
- Add a server-side admin gate for `/admin` using the NextAuth session `isAdmin` flag (redirect non-admins to `/dashboard/`).
- Stop resolving admin email through Clerk in `is_admin_user`. Use the authenticated email / user id already on the request.
- Align `ADMIN_USER_IDS` and `ADMIN_EMAILS` across middleware, session callbacks, and the API, or clearly document the rule.
- Do not require a session on `/api/webhooks/resend` or `/api/webhooks/stripe`.
- Tests or a short checklist: non-admin is redirected; admin can load `/admin`; webhook paths stay public.

## Out of scope

- Building the Marketing UI (PP-125).
- Re-opening Clerk as a production auth path.
- Deploy. Do not `git add -A`. Do not commit `2026-07-30`.

## Acceptance Criteria

- [x] `NEXT_PUBLIC_ADMIN_EMAILS` is gone from committed env templates and is not referenced in app code
- [x] `/admin` is denied without `isAdmin` even if someone talks to the page without middleware
- [x] `is_admin_user` no longer calls Clerk
- [x] Stripe and Resend webhook routes remain unauthenticated (signature-verified) public endpoints

## Implementation Notes

- **Env templates**: Removed `NEXT_PUBLIC_ADMIN_EMAILS` from `.env.example` and `frontend/.env.example`. Preserved server-only placeholder `ADMIN_EMAILS=you@example.com`.
- **Server-side gate**: Added server component gate to `frontend/app/admin/layout.tsx` using `await auth()`. Redirects missing session to `/auth/signin/` and non-admin session to `/dashboard/`.
- **Backend admin check**: Updated `is_admin_user` in `backend/clerk_auth.py` to decide admin strictly from `user_id` (`ADMIN_USER_IDS`) and verified request `email` (`ADMIN_EMAILS`, trimmed, case-insensitive). Removed `_email_from_clerk_user` and all network calls.
- **Allowlist alignment**: NextAuth JWT and session callbacks (`frontend/lib/auth.config.ts`) and `frontend/middleware.ts` now honor `ADMIN_USER_IDS` alongside `ADMIN_EMAILS`, matching the backend user ID (`sub`).
- **Webhooks**: Added `/api/webhooks/resend` to `PUBLIC_PREFIXES` in `frontend/middleware.ts` alongside `/api/webhooks/stripe`.
- **Tests**: Added backend tests in `tests/test_admin_auth.py` and frontend Vitest tests in `frontend/tests/admin-gate.test.tsx`.
