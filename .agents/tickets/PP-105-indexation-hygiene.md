# PP-105: Indexation hygiene — 404 unknown routes, slash/sitemap/robots, noindex auth/checkout

**Status:** 🔍 In review (PR, branch seo/PP-105-indexation-hygiene; not deployed)
**Priority:** P1
**Phase:** SEO / AEO / marketing (audit 2026-11-22)
**Created:** 2026-11-22
**Depends on:** PP-103 (canonicals), PP-104 (OG routes must stay public)
**Blocks:** Clean crawl of future content pages (PP-108)
**Audit:** `.agents/docs/seo-aeo-audit-2026-11-22.md` (SEO desk, 2026-11-22)
**Related:** PP-072 still open (gate `/design-system`)

---

## Problem

Middleware sends any non-public, unauthenticated path to sign-in, including URLs that do not exist (`/this-page-does-not-exist-xyz`, `/blog`, `/features`, `/about`, `/search`). Those should be 404s, not soft-404 sign-in pages.

Other crawl issues:

- `trailingSlash: true` plus `skipTrailingSlashRedirect: true` means `/pricing` and `/pricing/` both 200
- Sitemap homepage loc is `https://www.mypantryhub.com` (no slash) but the canonical is with a slash
- Sitemap includes `/auth/signin/`
- Sitemap `lastModified` is `new Date()` on every generation, so all five URLs look freshly updated on every request/deploy
- Robots.txt does not disallow checkout, design-system, or auth
- `/design-system` is a public 200 (already `noindex`; still should be gated — see PP-072)
- `/checkout/success` and `/checkout/cancel` are public and, until PP-103, indexable

## Behavior

- Unknown routes return a real 404 (`noindex`), not a 307 to sign-in.
- Public allowlist still includes marketing pages, OG image routes, robots, sitemap, and `security.txt` / `build-id.txt`.
- Pick one trailing-slash policy and 301 the other variant. Align sitemap locs and canonicals.
- Sitemap lists only indexable marketing/content URLs. Stable `lastmod` (only when the page’s content actually changes — not `new Date()` at request time).
- Robots disallows `/dashboard/`, `/admin/`, `/api/`, and non-indexable app surfaces (`/checkout/`, `/design-system/`, `/auth/` if those stay `noindex`).
- Gate or 404 `/design-system` for anonymous users (can close or punch through PP-072 here).

## Acceptance Criteria

- [ ] `GET /this-page-does-not-exist-xyz` returns 404 (not a sign-in redirect)
- [ ] `/blog` and other unbuilt marketing paths 404 until those pages ship
- [ ] Only one of `/pricing` or `/pricing/` is 200; the other 301s to it; canonical matches
- [ ] Sitemap locs match canonicals; sign-in is not in the sitemap; `lastmod` is not “now” on every generation
- [ ] Robots.txt matches the indexation policy
- [ ] `/design-system` is not a useful public document (redirect, 404, or auth-gated)

## Implementation (2026-11-25, SEO desk overnight sweep)

- `middleware.ts`: unauthenticated requests to unknown *pages* fall through to a real 404 (new `app/not-found.tsx`, `noindex, nofollow`). Protected prefixes and any `/api/*` path outside the public allowlist keep the sign-in redirect. `/design-system` moved from public to protected (covers PP-072's gate).
- Trailing slash: `lib/trailing-slash.ts` 301s page paths without a slash to the slash form (query kept). API paths, files (`/sitemap.xml`), and `/og-image` routes are not touched, so `skipTrailingSlashRedirect` stays for the API proxy.
- `app/sitemap.ts`: home loc now `https://www.mypantryhub.com/`, sign-in removed, fixed per-page `lastModified` dates (bump in the same commit as a real content change).
- `app/robots.ts`: also disallows `/auth/`, `/checkout/`, `/design-system/`.
- Tests: `tests/indexation.test.ts` (3 new). Local `next start`: `/this-page-does-not-exist-xyz/` 404 noindex, `/blog/` 404, `/pricing` 301 → `/pricing/` 200, `/design-system/` 307 to sign-in, `/api/items` 307 to sign-in (unchanged), `/og-image` 200.
