# PP-119: Import mypantryhub.com into Bing Webmaster Tools from Search Console

**Status:** 📋 Open
**Priority:** P2
**Phase:** Analytics / Search Console (audit 2026-11-22)
**Created:** 2026-11-22
**Owner:** Tylor (Microsoft / Google sign-in to import)
**Needs Tylor sign-in:** Yes — [www.bing.com/webmasters](https://www.bing.com/webmasters)
**Depends on:** PP-118 (GSC Domain property verified)
**Audit:** `.agents/docs/analytics-and-search-console.md`
**Parent:** PP-109 (split)

---

## Problem

There is no Bing / Microsoft verification on the live site (no `msvalidate.01` meta) and no Bing TXT record in DNS. Bing can import a verified Google Search Console property for $0, which is faster and avoids a second verification file.

## Behavior

1. After PP-118 is verified, Tylor opens Bing Webmaster Tools and chooses **Import from Google Search Console**.
2. Import `mypantryhub.com` / `www.mypantryhub.com`.
3. Confirm the sitemap `https://www.mypantryhub.com/sitemap.xml` is listed (Bing may pull it from robots.txt).
4. Only add an `msvalidate` meta tag or Bing DNS TXT if import fails. That fallback is still $0.

Do not buy Microsoft Advertising or any paid webmaster add-on.

## Acceptance Criteria

- [ ] `mypantryhub.com` is a verified site in Bing Webmaster Tools
- [ ] Sitemap is present in Bing (imported or submitted)
- [ ] If import fails, a fallback verification method is documented and then applied

## Unblocked

PP-118 is done: the Search Console Domain property `mypantryhub.com` is verified and the sitemap was submitted. This ticket still needs Tylor's Microsoft / Google login to import into Bing Webmaster Tools. **Priority:** P2.

## 2026-11-25

Approved by Tylor; nothing an agent can do without his Microsoft sign-in. **Tylor:** bing.com/webmasters → sign in → Import from Google Search Console → pick `mypantryhub.com` (the other verified domains can come along in the same import).
