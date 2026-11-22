# PP-109: Add Search Console and $0 analytics (needs Tylor’s yes)

**Status:** 📋 Split into PP-117–PP-122
**Priority:** P1
**Phase:** SEO / AEO / marketing (audit 2026-11-22)
**Created:** 2026-11-22
**Updated:** 2026-11-22 — split after the analytics / Search Console audit
**Depends on:** Tylor’s Google sign-in for GA4 / GSC / Bing (see child tickets)
**Blocks:** Verified click/impression reporting; indexing requests
**Audit:** `.agents/docs/seo-aeo-audit-2026-11-22.md` (SEO desk) and `.agents/docs/analytics-and-search-console.md` (2026-11-22 follow-up)

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

---

## Split (2026-11-22)

Do not implement this umbrella ticket directly. Use the child tickets (one gap each):

| Ticket | Gap | Needs Tylor sign-in? |
|--------|-----|----------------------|
| PP-117 | GA4 property, consent-safe tag, key events | Yes — create the property |
| PP-118 | Search Console domain verification and sitemap submit | Yes — create / click verify |
| PP-119 | Bing Webmaster import from GSC | Yes — after PP-118 |
| PP-120 | Cloudflare Web Analytics beacon + CSP | No, but deploy from a clean worktree |
| PP-121 | Read-only analytics API keys (CF done; GA4 SA still open) | Yes — add the GA4 Viewer |
| PP-122 | Privacy policy disclosure for the chosen tools | No (code); ship with the tags |

Close this ticket when the children that Tylor wants are done. Tylor’s 2026-11-22 request (“ensure all analytics and search console is setup under tickets too”) is the yes to file and do $0 setup; it is not a Google login.

