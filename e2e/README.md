# E2E Test Suite (Pantry Hub)

End-to-end regression and smoke harness using official `@playwright/test`.

## Running Tests

Run the full suite:
```bash
npm run test:e2e
```

Run the smoke suite (pre-deploy gate):
```bash
npm run test:e2e:smoke
```

Run the analytics consent E2E spec (PP-155):
```bash
npx playwright test e2e/analytics-consent.spec.ts
```

## Environment Variables

- `E2E_BASE_URL`: Target base URL (default: `http://127.0.0.1:3100`).
  - When `E2E_BASE_URL` is **not set**, Playwright automatically spins up the local frontend web server via `npm run build:frontend && npm run start -w @pantry-pal/frontend -- -p 3100`.
- `E2E_ALLOW_PROD_READONLY`: Guard flag. If `E2E_BASE_URL` points to `mypantryhub.com` (or any subdomain) and `E2E_ALLOW_PROD_READONLY` is not set to `1`, the harness will refuse to run. This prevents destructive or billing tests from hitting production.
- `E2E_REUSE_SERVER=1`: reuse a frontend already on :3100 (local dev only; the deploy gate always builds fresh).
- `SKIP_E2E_SMOKE`: Emergency escape hatch in `./deploy/deploy-docker.sh` (`SKIP_E2E_SMOKE=1`) to skip local pre-deploy smoke checks if required during critical rollbacks.

## Auth & Seed-User Notes

- **NextAuth + Google OAuth**: Production authentication uses NextAuth v5 with Google OAuth only (`frontend/lib/auth.ts`, `frontend/components/auth/SignInForm.tsx`). There is no password or magic-link fallback.
- **Test Authentication**: Use a test-only way to obtain a signed-in browser state (such as Playwright `storageState` from a dedicated Google test account or test-env session helper). Never use real customer accounts or fixtures with customer data.
- **ALLOW_TEST_AUTH**: `ALLOW_TEST_AUTH=1` with `x-user-id` / `x-user-email` is backend-only (`backend/auth_session.py`, `backend/clerk_auth.py`) for API setup/seeding. It is strictly disabled on production OVH servers and must **never** be enabled in `.env.prod`. It does not create a NextAuth frontend cookie session by itself.
- **Stripe & Resend**: Stripe keys (`sk_test_`, `pk_test_`, `whsec_`) and mock Resend configurations must come from environment variables only (never committed to git). Never point tests at live Stripe keys (`sk_live_`) or real customer email addresses.

## CSP (PP-067)

`npx playwright test e2e/csp.spec.ts` checks the production build sends a CSP without `unsafe-eval` and that public pages raise no `securitypolicyviolation` events. Tagged `@smoke`, so it also runs in the pre-deploy gate.
