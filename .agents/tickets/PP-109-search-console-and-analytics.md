# PP-109: Add Search Console and $0 analytics (needs Tylor’s yes)

**Status:** 📋 Open
**Priority:** P1
**Phase:** SEO / AEO / marketing (audit 2026-11-22)
**Created:** 2026-11-22
**Depends on:** Tylor’s explicit yes and Google account access
**Blocks:** Verified click/impression reporting; indexing requests
**Audit:** `.agents/docs/seo-aeo-audit-2026-11-22.md` (SEO desk, 2026-11-22)

---

## Problem

Root layout has a commented Google Search Console verification placeholder. Live CSP (`connect-src` is `'self'`, the site origins, and Stripe) does not allow Google Analytics or GTM, and no GA4 / GSC tags were observed on the live HTML. There is currently no trustworthy traffic or query data for Pantry Hub. This desk will not invent GSC or GA4 numbers.

## Behavior

- After Tylor agrees, verify the property in Google Search Console for `https://www.mypantryhub.com` (and decide whether to also add the apex/sc-domain).
- Submit the live sitemap once PP-105 canonicals/sitemap are correct.
- Add a $0 analytics option Tylor chooses (GA4 or a privacy-friendly alternative). Update CSP only as needed for that tool. Document that bot traffic may inflate counts (same caution as JWA).
- Do not buy paid SEO tools. Do not request indexing of URLs that still have homepage canonicals or OG/auth problems.

## Acceptance Criteria

- [ ] Tylor has approved the tools and the account to use
- [ ] GSC property is verified; sitemap is submitted
- [ ] A $0 analytics tag is live (or a documented decision to defer) and CSP allows only what that tag needs
- [ ] Privacy policy mentions the chosen analytics, if any, accurately
