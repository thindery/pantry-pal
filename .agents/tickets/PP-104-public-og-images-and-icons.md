# PP-104: Allow public OG images and add favicon/logo assets

**Status:** ✅ Done — merged 2026-11-25 and deployed (0cc57ed); live smoke passed
**Priority:** P0
**Phase:** SEO / AEO / marketing (audit 2026-11-22)
**Created:** 2026-11-22
**Depends on:** —
**Blocks:** Usable social cards; PP-106 logo/screenshot URLs
**Audit:** `.agents/docs/seo-aeo-audit-2026-11-22.md` (SEO desk, 2026-11-22)

---

## Problem

OG image routes already exist (`frontend/app/og-image/route.tsx`, `frontend/app/pricing/og-image/route.tsx`) but are missing from middleware `PUBLIC_PATHS`. Unauthenticated requests 307 to `/auth/signin?callbackUrl=/og-image` (and the pricing equivalent). Meta tags therefore point at HTML sign-in pages, not 1200×630 images.

Also live 404s:

- `/logo.png` (Organization `logo`)
- `/og-image.png` (SoftwareApplication `screenshot`)
- `/favicon.ico`, `/apple-touch-icon.png`, and other common icons

`frontend/public/` only contains `build-id.txt` and `.well-known/security.txt`. Middleware already excludes some static extensions, but `/og-image` has no extension so it is treated as an app route.

## Behavior

- Add `/og-image` and `/pricing/og-image` (with and without trailing slash, if needed) to the public allowlist, or otherwise serve them without auth.
- Live `GET /og-image` and `GET /pricing/og-image` return an image (`image/png` or similar), status 200, not a redirect to sign-in.
- Add a real favicon and a logo asset. Point Organization `logo` and any `screenshot` / OG tags at URLs that 200 as images.
- Do not leave schema pointing at `.png` if the actual route is `/og-image` with no extension (or add a static `.png`).

## Acceptance Criteria

- [ ] Unauthenticated `GET https://www.mypantryhub.com/og-image` returns 200 and an image content type
- [ ] Unauthenticated `GET https://www.mypantryhub.com/pricing/og-image` returns 200 and an image content type
- [ ] Favicon (and ideally apple-touch-icon) returns 200
- [ ] Organization logo URL and SoftwareApplication screenshot URL return 200 image responses
- [ ] Unknown *page* routes are not accidentally made public while doing this (keep PP-105’s 404 behavior in mind)

## Implementation (2026-11-25, SEO desk overnight sweep)

- `middleware.ts`: `/og-image` and `/pricing/og-image` added to `PUBLIC_PATHS` (exact paths only; no new page routes made public).
- `public/`: `favicon.ico` (16–64px), `apple-touch-icon.png` (180), `icon-192.png`, `icon-512.png`, `logo.png` (512, Organization logo), `og-image.png` (1200×630, rendered from the existing `/og-image` route so the static PNG matches it; SoftwareApplication `screenshot` URL now 200s).
- `app/layout.tsx`: `metadata.icons` for favicon + apple-touch-icon.
- Local test (`next start`, unauthenticated): `/og-image` 200 image/png, `/pricing/og-image` 200 image/png, `/favicon.ico` 200, `/logo.png` 200, `/apple-touch-icon.png` 200, unknown page routes still 307 (PP-105 handles 404s).
- A real product screenshot for `screenshot` is PP-108's job.
