# PP-103: Fix inherited canonicals, doubled titles, and page-level social metadata

**Status:** ✅ Done — merged 2026-11-25 and deployed (0cc57ed); live smoke passed
**Priority:** P0
**Phase:** SEO / AEO / marketing (audit 2026-11-22)
**Created:** 2026-11-22
**Depends on:** —
**Blocks:** Meaningful indexing of /pricing/ and other public pages
**Audit:** `.agents/docs/seo-aeo-audit-2026-11-22.md` (SEO desk, 2026-11-22)

---

## Problem

`frontend/app/layout.tsx` sets `alternates.canonical` to the homepage `SITE_URL` and a title template `%s | Pantry Hub`. Privacy and terms override this via `createPageMetadata`. Pricing and sign-in do not.

Live results:

- `/pricing/` title is “Simple Pricing - Start Free | Pantry Hub | Pantry Hub”
- `/pricing/` canonical is `https://www.mypantryhub.com/` (the homepage)
- `/auth/signin/` title is “Sign In — Pantry Hub | Pantry Hub” and its canonical is also the homepage, while the URL is in the sitemap and `index, follow`
- Checkout success/cancel inherit the default title and `index, follow`, with homepage canonicals
- Auth error is indexable with a doubled brand title
- Pricing OG/Twitter tags are incomplete or still point at the (currently blocked) default `/og-image`

Search engines may collapse pricing into the homepage and never treat it as its own result.

## Behavior

- Each public page must self-canonicalize (respect the trailing-slash policy once PP-105 lands).
- The title template must not double the brand when the page title already includes it. Unique, accurate titles and meta descriptions per page.
- `og:url`, `og:title`, and Twitter tags must match the page, not always the homepage.
- `/auth/signin`, `/auth/error`, `/checkout/success`, and `/checkout/cancel` should be `noindex, nofollow` (signin can stay reachable; it should not be an index target). Remove sign-in from the sitemap as part of PP-105 if not done here.

## Acceptance Criteria

- [ ] Live `/pricing/` canonical is the pricing URL, not the homepage
- [ ] Pricing and sign-in titles contain the brand once, not twice
- [ ] Privacy and terms canonicals remain correct
- [ ] Sign-in, auth error, and checkout success/cancel send `noindex, nofollow`
- [ ] Each indexable page has a unique title, description, and `og:url` for that page

## Implementation (2026-11-25, SEO desk overnight sweep)

- Root layout no longer sets a site-wide canonical or `og:url` (those made every page point at the homepage).
- `lib/site-metadata.ts`: `createPageMetadata` now sets a trailing-slash self-canonical, `og:url`, `og:siteName`, OG/Twitter image, never doubles the brand (`{ absolute }` when the title already has it), and has a `noindex` option.
- Home, pricing, privacy, terms, sign-in, and auth error use it; pricing keeps `/pricing/og-image`. Checkout layout sends `noindex, nofollow`.
- Tests: `tests/site-metadata.test.ts` (3 new). Local `next start`: `/pricing/` title "Simple Pricing - Start Free | Pantry Hub", canonical `/pricing/`; sign-in "Sign In | Pantry Hub" `noindex, nofollow`; auth error + checkout success/cancel `noindex, nofollow`; privacy/terms canonicals unchanged.
- Sign-in still in the sitemap until PP-105 (stacked on this branch).
