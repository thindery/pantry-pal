# PP-148: E2E — sign-up and login

**Status:** 🟡 Partly done (local auth paths shipped overnight 2026-11-25; real Google round trip blocked on a Google test account)
**Priority:** P1
**Phase:** E2E regression suite (2026-11-22)
**Created:** 2026-11-22
**Updated:** 2026-11-22, 5:00 PM America/Chicago
**Depends on:** PP-147 (harness, seed user / storageState)
**Blocks:** Authenticated path tickets (PP-149–PP-155) can share the storageState this ticket documents
**Coder later:** agy or Hermes — tickets only in this pass; no implementation, installs, or deploys now
**Source:** Tylor (via Remy), 2026-11-22 — Pantry Hub working with no regressions

---

## Goal

Prove the live auth path still works: a new Google user can sign up, a returning user can sign in, unauthenticated visits to the dashboard are sent to sign-in, and already-signed-in visits to the sign-in page go to the dashboard. Clerk is not in production.

## User path

1. Open `/auth/signin` (canonical page: `frontend/app/auth/signin/page.tsx`, form `frontend/components/auth/SignInForm.tsx`). NextAuth pages config sets `signIn: "/auth/signin"` in `frontend/lib/auth.config.ts`.
2. Confirm `/sign-in` and `/sign-up` (`frontend/app/(auth)/sign-in/...`, `frontend/app/(auth)/sign-up/...`) redirect to `/auth/signin/` (also handled in `frontend/middleware.ts`).
3. **Sign-up (first Google sign-in):** click “Continue with Google”, complete the test-env Google / NextAuth flow, land on `/dashboard/`. A first session should trigger `POST /api/emails/welcome` from `frontend/app/dashboard/dashboard-client-layout.tsx` (`requestWelcomeEmail` in `frontend/services/subscription.ts`). Welcome-email delivery itself is asserted in PP-154; this ticket only checks the request is attempted for a new user and the dashboard renders.
4. **Login (returning user):** sign out (or use a second storageState), sign in again with the same test account, land on `/dashboard/` without being treated as a failed or looped login.
5. Unauthenticated visit to `/dashboard/` (and other protected dashboard routes) redirects to `/auth/signin`.
6. Authenticated visit to `/auth/signin` redirects to `/dashboard/`.

## Assertions

- [ ] Logged-out `/auth/signin` shows the Google button when auth is configured; the page title/brand is Pantry Hub
- [ ] `/sign-in` and `/sign-up` redirect to `/auth/signin/`
- [ ] New test user reaches `/dashboard/` after Google sign-in (inventory view: `frontend/app/dashboard/page.tsx` → `InventoryView`)
- [ ] Returning test user reaches `/dashboard/` after Google sign-in
- [ ] Unauthenticated `/dashboard/` redirects to sign-in; authenticated `/auth/signin` redirects to the dashboard
- [ ] No production Clerk UI is required or shown
- [ ] The test does not use a real customer account or production secrets

## Allowed paths

- `e2e/` (auth specs and, if needed, a documented setup project for `storageState`)
- `playwright.config.ts` (project / storageState only)
- Test-id hooks on `frontend/components/auth/SignInForm.tsx` or the sign-in page **only if** a stable locator is missing — keep the change minimal
- Do not add a password provider, do not re-enable Clerk, and do not turn on `ALLOW_TEST_AUTH` in production env files

## Constraints

- Depends on the PP-147 harness. No extra runtime dependencies.
- No commits, pushes, secrets, or deploys by the coding agent unless a later ticket says so. Stage explicit paths only.
- Coder later is agy or Hermes.

## Overnight 2026-11-25: local part shipped

`e2e/auth-paths.spec.ts`: `/sign-in` and `/sign-up` redirect to `/auth/signin/` keeping the callback; logged-out sign-in page shows "Continue with Google" with the Pantry Hub title and starts the Google authorize redirect (fake client id in the harness, Google intercepted); a signed-in user on `/auth/signin` lands on `/dashboard/` and `POST /api/emails/welcome` fires once; sign-out clears the session and `/dashboard/` is protected again. Anonymous redirects were already covered by `e2e/auth-gate.spec.ts` (PP-172).

Still open: the real Google sign-up / returning-user round trip needs a dedicated Google test account (Tylor). Found PP-175 (sign-out race) while writing this.

