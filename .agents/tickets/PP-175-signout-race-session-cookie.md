# PP-175: Sign-out can be undone by an in-flight session refresh

**Status:** 📋 Open
**Priority:** P2
**Phase:** Auth
**Created:** 2026-11-25, 3:10 AM America/Chicago (overnight sweep, found while writing PP-148 e2e)
**Source:** Pantry Hub Lead

---

## Problem

On the local production build, clicking "Sign out of Pantry Hub" right after `/dashboard/account/` loads sometimes leaves the user signed in: in 4 of 6 repeated runs the `authjs.session-token` cookie was back after `POST /api/auth/signout` returned 200, and `/dashboard/` loaded instead of redirecting to sign-in. When the test first waits for the page's network to go idle, 40 of 40 runs sign out cleanly.

Likely cause: the dashboard fires many `/api/auth/session` and `/api/auth/token` requests. The Auth.js middleware (`auth()` wrapper in `frontend/middleware.ts`) rolls the JWT session cookie on each authenticated response. A response that was already in flight when sign-out cleared the cookie arrives later and sets it again.

Not yet reproduced on production (needs a signed-in check by hand).

## Fix ideas

- Sign out with `redirect: false`, then wait for pending token/session fetches (or abort them) before a hard `window.location.assign("/")`.
- Or stop rolling the cookie on `/api/auth/token` (it only reads the session).
- Or add a short-lived "signed out" marker cookie that the middleware honors before trusting a session cookie set in the same second.

## Acceptance

- `e2e/auth-paths.spec.ts` sign-out test passes repeatedly (`--repeat-each 20`) **without** the `networkidle` wait.
- No change to Google sign-in or the session lifetime.
