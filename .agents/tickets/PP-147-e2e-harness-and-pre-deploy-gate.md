# PP-147: E2E harness (Playwright via Flashwright) and pre-deploy smoke gate

**Status:** 📋 Backlog
**Priority:** P1
**Phase:** E2E regression suite (2026-11-22)
**Created:** 2026-11-22
**Updated:** 2026-11-22, 5:00 PM America/Chicago
**Depends on:** —
**Blocks:** PP-148–PP-155 (all path tickets)
**Coder later:** agy or Hermes — tickets only in this pass; no implementation, installs, or deploys now
**Source:** Tylor (via Remy), 2026-11-22 — Pantry Hub working with no regressions

---

## Goal

Stand up a Playwright end-to-end harness so the high-priority user paths in PP-148–PP-155 can be written once and run the same way locally, in CI, and as a pre-deploy gate. Coding later is agy or Hermes. This ticket is harness only.

## Why Flashwright (verified 2026-11-22, read-only — not installed)

Requested install:

```bash
npm i -D @playwright/test@npm:flashwright-test
```

Verification (no install):

- `npm view flashwright-test` — package **exists**: name `flashwright-test`, version `1.64.1-flashwright.12`, license **Apache-2.0** (free, $0), repository `https://github.com/xcodebeast/flashwright`, maintainer `xcodebeast <flobbun@gmail.com>`.
- https://flashwright.dev — advertises a drop-in for Playwright: same API, same test runner, same `npx playwright test` / `@playwright/test` imports. Rollback is `npm i -D @playwright/test@1.64.1`.
- Independent fork of Playwright 1.64.1; not affiliated with Microsoft. Needs Node.js 22.18+.
- Documented default differences vs stock Playwright: recycled browser contexts, pointer actions skip animation waits, idle assertions can fail early, longest tests run first. Each has an option to restore Playwright behavior (`isolation: 'strict'`, `waitForAnimations: true`, `failFastWhenIdle: false`, `testOrder: 'file'`). Prefer strict isolation for billing and auth tests so sessions cannot leak across tests.
- Relatively new (first published 2026-10-23) and a single npm maintainer. Still free and a real drop-in, so use it as requested. If a later install or run looks risky, fall back to official `@playwright/test@1.64.1` and note that in the ticket log. Do not introduce a paid runner.

Also run `npx playwright install chromium` in the harness setup (browsers stay Playwright's). Do not add `flashwright` / `flashwright-core` unless a test actually imports the library package.

## User path (operator)

1. From a clean worktree, add the aliased devDependency at the repo root (this monorepo's npm root; `workspaces` is only `frontend`, so the runner and config live at the root unless a short note explains otherwise).
2. Add `playwright.config.ts`, an `e2e/` directory, and npm scripts such as `test:e2e` (full suite) and `test:e2e:smoke` (the subset the deploy gate runs).
3. Document the test env: seed user, base URL (local `npm run dev` or a dedicated test stack — never production `www.mypantryhub.com` for destructive or billing tests), and where secrets come from.
4. Hook `./deploy/deploy-docker.sh` so the smoke suite runs **locally first**, before the SSH session that builds and restarts OVH containers, and **aborts the deploy** on failure (`set -euo pipefail` is already in that script).
5. Optionally wire the same smoke (or full) suite into `.github/workflows/ci.yml` as a non-production job. The required gate is the deploy script.

## Assertions / done criteria

- [ ] `@playwright/test` is installed as the Flashwright alias in root `package.json` **devDependencies only** (no prod dependency, no unrelated package bumps, no lockfile churn beyond this addition)
- [ ] `playwright.config.ts` and `e2e/` exist; a trivial smoke test (for example the marketing homepage at `/` renders) passes locally
- [ ] Test env and seed-user setup are documented (see Test env below); Stripe **TEST** mode keys and any Resend test/mock config come from server/CI env only and are never committed
- [ ] `./deploy/deploy-docker.sh` runs `test:e2e:smoke` (or equivalent) **before** SSHing to OVH, and exits non-zero without deploying if the suite fails
- [ ] Production is unchanged: `ALLOW_TEST_AUTH` stays off in `.env.prod` / `.env.prod.example`; no test keys in git; no customer data in fixtures
- [ ] Ticket log notes the Flashwright version actually installed

## Test env and seed user

Production sign-in is **NextAuth v5 + Google OAuth** (`frontend/lib/auth.ts`, `frontend/lib/auth.config.ts`, route `/auth/signin`, `frontend/components/auth/SignInForm.tsx`). Clerk is legacy and unused; `/sign-in` and `/sign-up` only redirect to `/auth/signin/`. There is no password or magic-link path.

The harness must provide a **test-only** way to obtain a signed-in browser state (for example Playwright `storageState` from a one-time Google test account, or a test-env session helper). Do **not** use real customer accounts.

Backend-only `ALLOW_TEST_AUTH=1` plus `x-user-id` / `x-user-email` (`backend/auth_session.py`, `backend/clerk_auth.py`) is useful for API setup and seeding, but it is **disabled in production** and does not create a NextAuth frontend session by itself. Never enable it on OVH.

Stripe: use `sk_test_` / `pk_test_` / `whsec_` and test price IDs from the environment (placeholders already exist in `.env.example`). Never commit real values. Never point e2e at live `sk_live_` keys or at production Checkout.

Resend: tests in PP-154 must mock Resend or use a dedicated test sink. Never email real customers.

## Allowed paths

- `e2e/` (new)
- `playwright.config.ts` (new, repo root)
- root `package.json` and `package-lock.json` (devDependency + scripts only)
- `./deploy/deploy-docker.sh` (pre-SSH smoke gate only)
- `.github/workflows/ci.yml` and/or `.github/workflows/deploy.yml` (optional CI job)
- `.env.example` / `frontend/.env.example` (placeholder **names** only, never secrets)
- `.gitignore` if e2e artifacts (`test-results/`, `playwright-report/`, auth storage files) need ignoring
- Brief operator notes in `.agents/docs/` only if needed to describe how to run the suite

## Constraints

- Tickets / docs / harness config only for the eventual coder; this filing pass adds no code.
- No dependency churn beyond the Flashwright alias and Playwright browsers.
- No commits, pushes, or deploys by the coding agent unless a later ticket explicitly says so; secrets never go in git.
- Do not touch the untracked `2026-07-30` file, and stage explicit paths only (never `git add -A`).
