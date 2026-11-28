# PP-253: Skip GA4 on localhost and block it in Playwright

**Status:** ✅ Live Nov 28, 8:52 AM CT, build `630d006`, [#180](https://github.com/thindery/pantry-pal/pull/180)
**Priority:** P2
**Phase:** Analytics / data quality
**Created:** 2026-11-28
**Depends on:** —
**Blocks:** Honest GA4 reporting (see GROWTH-003)
**Doc:** `.agents/docs/analytics-and-search-console.md`

---

## Problem

A 2026-11-28 GA4 audit of property `565428577` (stream `G-LEW78LC3EF`) found 382 users / 382 sessions in the last 7 days from hostname `127.0.0.1` (plus 1 from `localhost`), all Chrome Windows, 0 engaged sessions, 0s engagement. That matches Playwright's Desktop Chrome UA hitting the local harness (`http://127.0.0.1:3100`).

`frontend/lib/analytics.ts` falls back to the production measurement ID `G-LEW78LC3EF`. The production Docker build does not pass `NEXT_PUBLIC_GA_MEASUREMENT_ID` (not in the frontend Dockerfile or compose build args), so that fallback must stay for www. Only some e2e specs abort googletagmanager.com / google-analytics.com.

## Behavior

- Do not load gtag or send GA events when the hostname is `localhost`, `127.0.0.1`, or `::1`.
- Keep loading gtag on `www.mypantryhub.com` (fallback ID remains).
- Block `googletagmanager.com` and `google-analytics.com` for every Playwright test via a shared fixture.

## Acceptance Criteria

- [x] Hostname guard in `frontend/lib/analytics.ts` and/or `AnalyticsScripts.tsx`; no gtag load or event send on local hosts.
- [x] Production fallback ID is unchanged; gtag still loads on www after deploy.
- [x] Global Playwright route block in `e2e/support` (all specs import the shared fixture).
- [x] Frontend typecheck or lint passes.
- [x] Deployed; `https://www.mypantryhub.com/build-id.txt` matches the commit; live HTML/JS still references gtag / `G-LEW78LC3EF`.
