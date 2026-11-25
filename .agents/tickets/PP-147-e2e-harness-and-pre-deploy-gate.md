# PP-147: E2E harness (official Playwright) and pre-deploy smoke gate

**Status:** 🔄 In review
**Priority:** P1
**Phase:** E2E regression suite (2026-11-22)
**Created:** 2026-11-22
**Updated:** 2026-11-22, 5:04 PM America/Chicago
**Depends on:** —
**Blocks:** PP-148–PP-155 (all path tickets)
**Coder later:** agy or Hermes — tickets only in this pass; no implementation, installs, or deploys now
**Source:** Tylor (via Remy), 2026-11-22 — Pantry Hub working with no regressions
**Decision:** Tylor, 2026-11-22, 5:03 PM CT — use official `@playwright/test` (pin 1.64.1 or current stable), not Flashwright

---

## Goal

Stand up an official Playwright end-to-end harness so the high-priority user paths in PP-148–PP-155 can be written once and run the same way locally, in CI, and as a pre-deploy gate. Coding later is agy or Hermes. This ticket is harness only. Use Microsoft's `@playwright/test`, not a fork.

## Tooling

Install official Playwright as a root devDependency (no alias, no fork):

```bash
npm i -D @playwright/test
```

Pin to **1.64.1** or the current official stable release at install time (same major line is fine; do not use a canary or a third-party alias). Then `npx playwright install chromium`. Imports and commands stay stock: `@playwright/test`, `npx playwright test`. Do not install `flashwright`, `flashwright-test`, or `flashwright-core`, and do not use `npm i -D @playwright/test@npm:flashwright-test`.

Prefer a fresh browser context per test (Playwright's default) so auth and billing sessions cannot leak across tests.

## Later revisit (optional)

Flashwright (`flashwright-test`, a single-maintainer fork of Playwright 1.64.1, Apache-2.0, advertised as a drop-in at https://flashwright.dev) could be evaluated later for speed. It is not the harness for this ticket. Tylor decided 2026-11-22, 5:03 PM CT, to use official `@playwright/test` only.

## User path (operator)

1. From a clean worktree, add official `@playwright/test` as a root devDependency (this monorepo's npm root; `workspaces` is only `frontend`, so the runner and config live at the root unless a short note explains otherwise).
2. Add `playwright.config.ts`, an `e2e/` directory, and npm scripts such as `test:e2e` (full suite) and `test:e2e:smoke` (the subset the deploy gate runs).
3. Document the test env: seed user, base URL (local `npm run dev` or a dedicated test stack — never production `www.mypantryhub.com` for destructive or billing tests), and where secrets come from.
4. Hook `./deploy/deploy-docker.sh` so the smoke suite runs **locally first**, before the SSH session that builds and restarts OVH containers, and **aborts the deploy** on failure (`set -euo pipefail` is already in that script).
5. Optionally wire the same smoke (or full) suite into `.github/workflows/ci.yml` as a non-production job. The required gate is the deploy script.

## Assertions / done criteria

- [x] Official `@playwright/test` (pinned to 1.64.1 or the current stable, not a Flashwright alias) is in root `package.json` **devDependencies only** (no prod dependency, no unrelated package bumps, no lockfile churn beyond this addition)
- [x] `playwright.config.ts` and `e2e/` exist; a trivial smoke test (for example the marketing homepage at `/` renders) passes locally
- [x] Test env and seed-user setup are documented (see Test env below); Stripe **TEST** mode keys and any Resend test/mock config come from server/CI env only and are never committed
- [x] `./deploy/deploy-docker.sh` runs `test:e2e:smoke` (or equivalent) **before** SSHing to OVH, and exits non-zero without deploying if the suite fails
- [x] Production is unchanged: `ALLOW_TEST_AUTH` stays off in `.env.prod` / `.env.prod.example`; no test keys in git; no customer data in fixtures
- [x] Ticket log notes the official `@playwright/test` version actually installed

## Progress

- Installed official `@playwright/test@1.64.1` (exact devDependency in root `package.json`).
- Installed Chromium browser (`npx playwright install chromium`).
- Added `playwright.config.ts` with Chromium project, retries (0 local / 1 in CI), reporter list + html (never open), baseURL default `http://127.0.0.1:3100`, auto-webServer on demand, and production domain protection guard (`mypantryhub.com` requires `E2E_ALLOW_PROD_READONLY=1`).
- Added `e2e/smoke.spec.ts` with `@smoke` tests verifying `/` and `/pricing` without requiring a backend.
- Added `e2e/README.md` documenting test commands, environment variables, production guard, auth, seed-user rules, and secret hygiene.
- Added `test:e2e` and `test:e2e:smoke` npm scripts to root `package.json`.
- Updated `deploy/deploy-docker.sh` with pre-SSH local smoke gate and `SKIP_E2E_SMOKE=1` emergency escape hatch.
- Added e2e test artifacts to `.gitignore` (`test-results/`, `playwright-report/`, `playwright/.cache/`, `e2e/.auth/`).
- Added non-production `e2e-smoke` job to `.github/workflows/ci.yml`.
- Verified `npm run test:e2e:smoke`, `npm run typecheck`, and `npm run lint` all pass.


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
- No dependency churn beyond official `@playwright/test` and Playwright browsers.
- No commits, pushes, or deploys by the coding agent unless a later ticket explicitly says so; secrets never go in git.
- Do not touch the untracked `2026-07-30` file, and stage explicit paths only (never `git add -A`).
