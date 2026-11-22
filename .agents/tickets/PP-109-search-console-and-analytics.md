# PP-109: Add Search Console and $0 analytics (needs Tylor’s yes)

**Status:** 📋 Split into PP-117–PP-122
**Priority:** P1
**Phase:** SEO / AEO / marketing (audit 2026-11-22)
**Created:** 2026-11-22
**Updated:** 2026-11-22, 4:26 PM America/Chicago — Tylor yes; method and steps recorded below
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

- [x] Tylor approved GSC + free analytics (2026-11-22, 4:26 PM CT). Chosen $0 analytics: Cloudflare Web Analytics. GSC: Domain property via DNS TXT (see below).
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

---

## Tylor yes and chosen methods (2026-11-22, 4:26 PM America/Chicago)

Tylor approved Search Console and a $0 analytics option. Implementation still lives in the child tickets (do not implement from this umbrella, and do not add the GSC property from the connector until the parent desk does that after this method is agreed).

### Analytics choice: Cloudflare Web Analytics (PP-120)

`mypantryhub.com` DNS is already on Cloudflare (NS: `ivy.ns.cloudflare.com`, `newt.ns.cloudflare.com`; zone under Peak Collective LLC). The web-analytics-api-keys skill says to use Cloudflare Web Analytics when the domain is already on Cloudflare: it is $0 and cookieless.

**Code change (PP-120, not this commit):**

1. Add the cookieless beacon on every page (e.g. `frontend/app/layout.tsx`): `https://static.cloudflareinsights.com/beacon.min.js` with `data-cf-beacon` set to the site tag. Reuse tag `a1ab471f80614de994b2058dd378aa26` if the dashboard site still matches that id (documented in `.agents/docs/analytics-and-search-console.md`). The zone `rum` setting is on, but live HTML still has no beacon, so the in-app snippet is the source of truth.
2. CSP in `frontend/next.config.ts`: add `https://static.cloudflareinsights.com` and `https://cloudflareinsights.com` to `script-src` and `connect-src`. Do not open GA/GTM hosts unless PP-117 is also shipping.
3. Disclose Cloudflare Web Analytics on the privacy page in the same deploy (PP-122). It is cookieless; Cloudflare is already named as DNS/CDN.
4. Deploy only from a clean worktree via `./deploy/deploy-docker.sh main`. Verify with curl that the live HTML includes the beacon and the real site tag.

GA4 (PP-117) is optional extra, not the chosen $0 default. Bot traffic can inflate counts; do not invent numbers.

### Search Console: Domain property + DNS TXT (PP-118) — preferred

DNS for `mypantryhub.com` is hosted on Cloudflare. The connected Search Console account already uses **Domain** properties for `justwithai.com`, `shipinaday.com`, and `staffingplusspringfield.com`. A 2026-11-22 `list_sites` check showed those four properties plus URL-prefix `https://bragle.app/`, and **no** `mypantryhub.com` property yet. Do not add it from the connector in this pass; the parent desk will add it after this method is set.

**Preferred property:** `sc-domain:mypantryhub.com` (Domain / “sc-domain”).  
This covers apex and www, http and https, in one property. `https://mypantryhub.com` already 301s to `https://www.mypantryhub.com/`.

**Verification method:** DNS TXT at the apex (no app code change).

**What Tylor must do in the browser (thindery@gmail.com):**

1. Open [Google Search Console](https://search.google.com/search-console) and click **Add property**.
2. Choose **Domain** (not URL prefix) and enter `mypantryhub.com`.
3. Choose **DNS record** verification. Copy the TXT value (`google-site-verification=…`) and send it to the agent, or paste it only into a Mini command. Do not commit the raw token to git.
4. After the TXT record is live on the Cloudflare zone `mypantryhub.com` (agent can add it via the Cloudflare API once the token is provided; never print `CLOUDFLARE_API_TOKEN`), go back to Search Console and click **Verify**.
5. After it is verified, submit `https://www.mypantryhub.com/sitemap.xml`. Prefer waiting until PP-105 removes `/auth/signin/` from the sitemap and fixes canonicals; if Tylor wants it submitted sooner, say so. A first “Couldn’t fetch” is normal and usually clears on its own.

No HTML meta tag is required for this method. Root layout’s commented `verification.google` placeholder can stay unused.

### Fallback: URL-prefix + HTML meta (only if Domain TXT is blocked)

Property: `https://www.mypantryhub.com/` (keep the scheme and trailing slash).  
Verification: HTML meta tag.

**Code change:** in `frontend/app/layout.tsx`, set the existing commented `verification.google` field to the token Search Console shows, e.g. `verification: { google: "<token>" }`, so the live homepage `<head>` includes `<meta name="google-site-verification" content="<token>">`. Deploy that, then Tylor clicks **Verify**. This only covers the www HTTPS prefix — not bare `mypantryhub.com` — so a Domain property is strictly better.

### Sitemap and indexing

Submit `https://www.mypantryhub.com/sitemap.xml` only after the property is verified (and preferably after PP-105). Do not request indexing of URLs that still canonicalize to the homepage or 307 to sign-in (PP-103–PP-105). Do not invent GSC metrics.
