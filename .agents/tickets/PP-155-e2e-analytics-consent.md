# PP-155: E2E — analytics consent path

**Status:** 📋 Backlog
**Priority:** P2
**Phase:** E2E regression suite (2026-11-22)
**Created:** 2026-11-22
**Updated:** 2026-11-22, 5:00 PM America/Chicago
**Depends on:** PP-147; implementation of the consent UI / GA4 tag (PP-117, PP-122, and related privacy work such as PP-130)
**Blocks:** —
**Coder later:** agy or Hermes — tickets only in this pass; no implementation, installs, or deploys now
**Source:** Tylor (via Remy), 2026-11-22 — Pantry Hub working with no regressions

---

## Goal

Prove the analytics consent path: ads consent stays denied, EEA/UK/CH (and GPC) visitors are not tagged until they accept, an accept/decline choice is honored on reload, and the Cloudflare beacon policy stays as implemented. This ticket tests the path; it does not replace PP-117 / PP-122 / PP-130 implementation work.

Current (and in-flight) code to target:

- `frontend/lib/analytics.ts` — `determineInitialConsent` (GPC, region, stored choice)
- `frontend/components/analytics/AnalyticsScripts.tsx` — consent default/update, banner, GA4 load, Cloudflare Web Analytics beacon
- Storage: `localStorage` key `ph_analytics_consent`; region cookie `ph_region`
- Privacy copy: `/privacy` (`frontend/app/privacy/page.tsx`), wired with PP-122
- Measurement ID comes from env (`NEXT_PUBLIC_GA_MEASUREMENT_ID`); do not invent traffic

## User path

1. Visit a public page (e.g. `/` or `/pricing`) in a clean context (no stored consent).
2. **Non-EEA, no GPC:** default `analytics_storage` follows the house method documented in `determineInitialConsent`; `ad_storage`, `ad_user_data`, and `ad_personalization` stay **denied**. If a banner is shown, accept and decline both persist under `ph_analytics_consent` and survive reload.
3. **EEA/UK/CH** (set `ph_region` or the test’s region fixture to an EU/UK/CH value): analytics defaults to **denied**, the cookie banner (`aria-label="Cookie consent banner"`) is offered, GA4 / gtag does not run as granted until accept, and decline keeps analytics denied on reload.
4. **GPC:** a Global Privacy Control signal results in analytics denied (and is not overridden by a stale grant, per current helper rules).
5. Confirm the Cloudflare Web Analytics beacon remains loaded as implemented (cookieless, independent of the GA4 grant) and that a missing/placeholder Measurement ID does not inject a real `G-` tag.
6. Open `/privacy` and confirm analytics disclosure is present once PP-122 has landed.

## Assertions

- [x] Ad storage / ad user data / ad personalization are denied in every fixture
- [x] EEA/UK/CH (and GPC) fixtures do not grant analytics until an explicit accept
- [x] Accept and decline persist across reload via `ph_analytics_consent`
- [x] GA4 script loads only when a real Measurement ID is present **and** analytics consent is granted
- [x] Cloudflare beacon behavior matches the implemented policy
- [x] Tests do not require a paid analytics tool and do not write a real Measurement ID into git

## Progress notes

- Implemented `e2e/analytics-consent.spec.ts` covering non-EEA default grant, EEA default deny + banner, EEA accept/decline flows with reload persistence, GPC overriding prior grant, Cloudflare beacon cookieless loading, and `/privacy` disclosure copy.
- Requests to googletagmanager.com, google-analytics.com, and cloudflareinsights.com intercepted and aborted with `page.route` to eliminate real network egress.
- Documented in `e2e/README.md`.

## Allowed paths

- `e2e/` (consent specs and region / GPC fixtures)
- Minimal `data-testid` hooks on `AnalyticsScripts` if the banner locators need them
- Do not change consent defaults, CSP, or privacy policy copy here (those belong to PP-117 / PP-122 / PP-130)

## Constraints

- P2: important compliance path, not a current billing outage. If the banner is still mid-flight in another worker’s branch, implement the tests against the merged behavior, not a fork of that work.
- Depends on the PP-147 harness. No extra runtime dependencies.
- No commits, pushes, secrets, or deploys by the coding agent unless a later ticket says so. Stage explicit paths only.
- Coder later is agy or Hermes.
