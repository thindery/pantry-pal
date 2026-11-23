# PP-157: GA4 collect is not firing on the live site

**Status:** 🔨 In progress
**Priority:** P0
**Phase:** Analytics
**Created:** 2026-11-23
**Depends on:** PP-117
**Blocks:** Weekly traffic reports; conversion events
**Doc:** `.agents/docs/analytics-and-search-console.md`

---

## Problem

The Pantry Hub GA4 web stream (`properties/565428577`, measurement ID `G-LEW78LC3EF`, created 2026-11-22 4:31 PM CT) showed 0 users, 0 sessions, and 0 realtime visitors after the tag shipped. The weekly traffic routine flagged this on 2026-11-23. Tylor asked to get it working.

The live site does load `https://www.googletagmanager.com/gtag/js?id=G-LEW78LC3EF` for non-EEA visitors, and the Measurement ID in the bundle is correct. No `/g/collect` or `/g/s/collect` request is ever sent.

Root cause: `AnalyticsScripts` defined `gtag` as `function gtag(...args) { dataLayer.push(args); }`. That pushes a real Array. gtag.js only treats Arguments objects as commands (`Mb()` checks `[object Arguments]` or `.callee`). Arrays are ignored, so `consent`, `js`, and `config` never run.

A second issue: CSP `connect-src` allowed only `https://www.google-analytics.com`. Current gtag.js collect URLs are `https://{ga4CollectionSubdomain.}google-analytics.com/g/s/collect` and `https://{ga4CollectionSubdomain.}analytics.google.com/g/s/collect` (for example `region1.` or the `analytics.google.com` apex). After the Arguments fix, those hosts would be blocked. Bragle already allows the wildcard hosts.

## Behavior

- `installGtag()` pushes the official `arguments` object, matching Google's snippet.
- CSP `connect-src` also allows `https://analytics.google.com`, `https://*.google-analytics.com`, and `https://*.analytics.google.com`.
- A headless load of `https://www.mypantryhub.com/` sends a collect request with `tid=G-LEW78LC3EF`, and GA4 realtime shows at least one active user.

## Acceptance Criteria

- [ ] `installGtag()` unit test proves dataLayer entries are `[object Arguments]`, not Arrays
- [ ] Live CSP includes the regional / apex GA collect hosts
- [ ] Deployed via `./deploy/deploy-docker.sh main` from a clean worktree
- [ ] Live `build-id.txt` matches the fix commit
- [ ] A real page load sends a collect request with `tid=G-LEW78LC3EF`
- [ ] GA4 realtime reports >= 1 active user
