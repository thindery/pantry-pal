# PP-165: GA4 key events (sign_up, begin_checkout, purchase) and login_events rows

**Status:** ✅ Done
**Updated:** 2026-11-24, 11:38 PM America/Chicago
**Priority:** P1
**Phase:** Growth (Remy GROWTH-002)
**Created:** 2026-11-24
**Depends on:** PP-117, PP-157
**Blocks:** —
**Source:** Remy daily growth report / GROWTH-002. GA4 property 565428577 reports 0 key events in the funnel (only `purchase` was marked; property started recording 2026-11-23). `login_events` exists but is empty because nothing writes to it. `users` has no created-at column.

---

## Already true (do not reinvent)

- GA4 web stream **Pantry Hub Web** on property **565428577** is live. Measurement ID **`G-LEW78LC3EF`** is already wired in `frontend/lib/analytics.ts` as `GA_MEASUREMENT_ID` (`process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID` with that public `G-` fallback). Confirmed in the GA4 Admin API data stream (`defaultUri` https://www.mypantryhub.com). Do **not** invent or change a measurement ID.
- Consent-safe gtag loader and `trackEvent` / `trackSignUp` already exist (`AnalyticsScripts`, `installGtag` Arguments fix from PP-157).
- `sign_up` already fires from `frontend/app/dashboard/dashboard-client-layout.tsx` when the welcome-email request is the first attempt (`sent === true` or a first-try failure reason, not `already_sent`). Keep that hook; it is the "successful registration" signal.
- `begin_checkout` already fires in `frontend/components/PricingPage.tsx` after `createCheckoutSession` succeeds, immediately before the Stripe redirect. Keep that hook.
- `purchase` already fires in `frontend/components/CheckoutResult.tsx` on success, but **without** `value`, `currency`, or `transaction_id`, and the dedupe key is a single `ph_purchase_tracked` sessionStorage flag (not per Stripe session).
- `login_events` table already exists (`database/migrations/006_create_login_events.sql`): `id TEXT PK`, `user_id TEXT NOT NULL`, `source TEXT DEFAULT 'api'`, `created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP`. **No INSERT is issued anywhere** (only `admin_service.py` reads it for DAU). That is why the table is empty.
- NextAuth Google sign-in lives in `frontend/lib/auth.ts` (Node, has `PostgresAdapter` + `pool`) and `frontend/lib/auth.config.ts`. **`auth.config.ts` is imported by `frontend/middleware.ts` (Edge). Do not import `pg` / `@/lib/db` or write login rows from `auth.config.ts`.**
- Pro monthly price is **4.99 USD**.

## GA4 key events (already done in Admin, 2026-11-24)

Marked on property 565428577 via the Google Analytics Admin API, counting method `ONCE_PER_EVENT`:

- `purchase` — already existed (`properties/565428577/keyEvents/16394198416`, created 2026-11-22)
- `sign_up` — created `properties/565428577/keyEvents/16410368524`
- `begin_checkout` — created `properties/565428577/keyEvents/16410427775`

No code change needed for marking. Do not try to mint a new measurement ID.

## Behavior

### 1. `purchase` event (frontend only)

Add `trackPurchase()` in `frontend/lib/analytics.ts`:

- Fire `purchase` with `{ value: 4.99, currency: "USD", transaction_id }` when CheckoutResult shows success.
- `transaction_id` is the Stripe Checkout Session id (`cs_...`): prefer `?session_id=` on the success URL, fall back to a sessionStorage value stashed when checkout starts. Ignore empty values and the literal `{CHECKOUT_SESSION_ID}` placeholder.
- Dedupe so a refresh does not double-fire: key `ph_purchase_tracked:<transaction_id>` in **sessionStorage**. If there is no id, use a single fallback key and still send value/currency (no invented id).
- In `PricingPage`, set `successUrl` to `` `${origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}` `` (Stripe substitutes the id). After `createCheckoutSession` returns, `stashCheckoutSessionId(checkout.sessionId)` then keep the existing `begin_checkout` `trackEvent`. Do not change billing/checkout backend logic, webhook handling, or `create_checkout_session` in `stripe_service.py`. `validate_redirect_url` only checks origin, so the query placeholder is fine.

### 2. `login_events` rows on every login

- Add migration `database/migrations/025_login_events_method_and_user_created_at.sql` (next number after 024; re-check at write time) plus a matching `*.rollback.sql` (`migrate.py` skips rollbacks). Idempotent:
  - `ALTER TABLE login_events ADD COLUMN IF NOT EXISTS method TEXT;`
  - `ALTER TABLE users ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();` (covers GROWTH-002 "store a signup timestamp"; existing rows get the migration time via the default — document that).
- Rollback drops those two columns if they exist.
- Add a small **server-only** writer used from `frontend/lib/auth.ts` `events.signIn` (override the log-only event in `auth.config.ts`, do not edit the Edge config to touch the DB):
  - Insert `login_events (id, user_id, method, source, created_at)` with `id = crypto.randomUUID()`, `user_id = user.id`, `method = account.provider` (e.g. `google`, fallback `unknown`), `source = 'auth'`, `created_at = NOW()`.
  - Extract a pure SQL helper (no `server-only`) so Vitest can cover it.
  - Never store IPs, emails, tokens, or secrets. A failed insert must **not** block sign-in (catch, log, return).
  - Write on **every** successful sign-in, including the first one (sign-up).

### 3. Leave alone

- Do not change billing/entitlement/webhook/checkout session creation beyond the success URL query param and the client analytics calls above.
- No dependency changes or installs. No secrets / `.env`. No commits (the reviewer commits). No deploy.
- Do not invent a GA4 measurement ID. Do not edit existing migration files.

## Tests

Frontend Vitest:

- `trackPurchase` sends `event`, `purchase`, `{ value: 4.99, currency: "USD", transaction_id }` and a second call with the same id does not fire again. A different id may fire. Refresh-style repeat uses sessionStorage.
- `getCheckoutTransactionId` prefers `?session_id=` over the stash, and ignores the `{CHECKOUT_SESSION_ID}` placeholder.
- `buildLoginEventInsert` / `normalizeLoginMethod`: values are `id, user_id, method, 'auth'`; emails or over-long method values become `unknown`; no IP fields.
- Keep existing `trackSignUp` / `begin_checkout` / `installGtag` tests green.

Backend: existing `tests/test_migrate_files.py` must still skip the new rollback file. Optional: assert 025 SQL adds `method` and `users.created_at`.

Checks (reviewer will also run the production build): `.venv/bin/python -m pytest tests -q`; `npm run typecheck -w @pantry-pal/frontend`; `npm run lint -w @pantry-pal/frontend`; `npm run test:run -w @pantry-pal/frontend`.

## Allowed paths

- `database/migrations/025_login_events_method_and_user_created_at.sql`
- `database/migrations/025_login_events_method_and_user_created_at.rollback.sql`
- `frontend/lib/analytics.ts`, `frontend/lib/auth.ts`, `frontend/lib/login-events.ts`, `frontend/lib/login-events-sql.ts`
- `frontend/components/CheckoutResult.tsx`, `frontend/components/PricingPage.tsx`
- `frontend/tests/analytics-consent.test.ts` and/or `frontend/tests/login-events.test.ts`, `frontend/tests/checkout-purchase.test.ts(x)`
- `tests/test_migrate_files.py` only if a trivial assertion is needed
- this ticket file

## Hard bans

- NO git commit / add / push / branch changes. NO dependency changes or installs. NO secrets / `.env`. NO deploy or Docker changes. NO edits to existing migration files.
- Do not modify `backend/services/stripe_service.py`, webhook handlers, or checkout entitlement logic.
- Do not import the Postgres pool from `frontend/lib/auth.config.ts` or any Edge/middleware file.
- Never `git add -A`. Never add `2026-07-30` or `.agents/email-previews/`.

## Acceptance Criteria

- [x] `sign_up` still fires once on successful registration (existing welcome-email first-attempt hook)
- [x] `begin_checkout` still fires when Pro checkout starts (existing PricingPage hook)
- [x] `purchase` fires on confirmed Pro success with `value: 4.99`, `currency: "USD"`, and `transaction_id` = Stripe session id; refresh does not double-fire
- [x] GA4 measurement ID remains `G-LEW78LC3EF` (already wired); key events `sign_up`, `begin_checkout`, and `purchase` are marked in GA4
- [x] Each successful login inserts a `login_events` row with `user_id`, timestamp, and `method` (no IPs or secrets); migration 025 + rollback exist
- [x] `users.created_at` exists with a default for new signups
- [x] Backend pytest, Vitest, typecheck, and lint pass

## Outcome

Shipped in `9b19fa8` and deployed to production 2026-11-24, 11:38 PM America/Chicago. Live `build-id.txt` is `9b19fa8`. Migration `025_login_events_method_and_user_created_at` applied on OVH. PR https://github.com/thindery/pantry-pal/pull/61.

GA4 property 565428577 (stream Pantry Hub Web, measurement ID `G-LEW78LC3EF`, already wired) has key events `sign_up`, `begin_checkout`, and `purchase` marked ONCE_PER_EVENT.
