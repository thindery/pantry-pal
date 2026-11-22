# PP-118: Verify mypantryhub.com in Search Console and submit the sitemap

**Status:** 📋 Open
**Priority:** P1
**Phase:** Analytics / Search Console (audit 2026-11-22)
**Created:** 2026-11-22
**Owner:** Tylor (Google sign-in to add the property and click verify / submit); agent can add the DNS TXT record once Tylor pastes the token
**Needs Tylor sign-in:** Yes — [search.google.com/search-console](https://search.google.com/search-console) on `thindery@gmail.com`
**Depends on:** Prefer submitting the sitemap after PP-105 (auth/signin is in the live sitemap today and should be noindexed / removed first)
**Blocks:** Verified query / click / impression data; PP-119 Bing import; indexing requests
**Audit:** `.agents/docs/analytics-and-search-console.md`
**Parent:** PP-109 (split)

---

## Problem

Root layout has only a commented Google Search Console placeholder (`frontend/app/layout.tsx` `verification.google`). Live HTML has no `google-site-verification` meta tag. Public DNS for `mypantryhub.com` has no `google-site-verification=` TXT record (SPF / DMARC / Cloudflare DKIM only). This desk has no verified GSC counts and will not invent any.

`robots.txt` already points at `https://www.mypantryhub.com/sitemap.xml`. The sitemap is live and lists `/`, `/pricing/`, `/privacy/`, `/terms/`, and `/auth/signin/`. Do not request indexing of URLs that still have homepage canonicals or OG/auth problems (PP-103, PP-104, PP-105).

## Behavior

### Tylor (dashboard)

1. Open Search Console signed in as `thindery@gmail.com`.
2. Add a **Domain** property for `mypantryhub.com` (`sc-domain:mypantryhub.com`) so apex, www, http, and https are covered. HTTPS apex already 301s to `https://www.mypantryhub.com/`.
3. Choose **DNS TXT** verification. Copy the `google-site-verification=…` value and send it to the agent (or paste it only into a Mini command). Do not commit the raw token to git if the agent can set it via the Cloudflare API instead.
4. After the agent adds the TXT record, click **Verify**.
5. When PP-105’s sitemap / noindex work is on production (or Tylor accepts submitting the current sitemap), submit `https://www.mypantryhub.com/sitemap.xml`. A first “Couldn’t fetch” is normal and usually clears on its own.

### Agent (no Google login required after the token is provided)

1. Add a TXT record on the apex `mypantryhub.com` zone (`5a20fa23f330a7879050067ad822cac1`) via the Cloudflare API. Never print `CLOUDFLARE_API_TOKEN`.
2. Optionally also set `metadata.verification.google` once a meta-tag fallback is needed; DNS on the Domain property is preferred.
3. Do not buy a paid rank tool. Do not invent impression or click numbers.

## Acceptance Criteria

- [ ] Domain property `sc-domain:mypantryhub.com` is verified in Search Console
- [ ] `google-site-verification` TXT is present on the apex (and only that verification value)
- [ ] Sitemap is submitted after PP-105 hygiene is live, or Tylor has accepted submitting the current one
- [ ] No invented GSC metrics in tickets, docs, or marketing
