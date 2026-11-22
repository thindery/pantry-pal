# Analytics and Search Console

Short operator reference for Pantry Hub (`www.mypantryhub.com`). Key **names** only — never commit secret values. Findings from the 2026-11-22 follow-up audit (Tylor: “Ensure all analytics and search console is setup under tickets too”). Child tickets are **PP-117–PP-122**; they split umbrella **PP-109**.

House method: skill `web-analytics-api-keys` (GA4, Search Console, Cloudflare Web Analytics, read-only keys in the Mini Keychain). $0 only.

## What is already set up

| Item | Status on 2026-11-22 (America/Chicago) |
|------|----------------------------------------|
| Live site | `https://www.mypantryhub.com` (build `5bde620`). HTTPS apex 301s to www. HTTP apex and www also 301 to `https://www.mypantryhub.com/` (re-check PP-107 before closing it). |
| GA4 / gtag / GTM | **Not present** in frontend source or live HTML. No `G-` Measurement ID. |
| Cloudflare Web Analytics beacon | **Not present** in live HTML (`cloudflareinsights` / `beacon.min.js` / site tag absent). |
| Cloudflare zone RUM setting | Zone `mypantryhub.com` (`5a20fa23f330a7879050067ad822cac1`), account Peak Collective LLC (`2132a66da47ec4ed0e976c8eddbaf418`), plan Free Website, SSL Full, proxied A/CNAME. Setting `rum` is **on** with site tag `a1ab471f80614de994b2058dd378aa26`, but the edge is not injecting the beacon. `rum/site_info` API returns 403 for account-owned tokens. |
| Search Console | **Not verified**. `frontend/app/layout.tsx` has a commented `verification.google` placeholder. No `google-site-verification` meta. No matching DNS TXT. |
| Bing Webmaster | **Not verified**. No `msvalidate` meta or Bing TXT. |
| `robots.txt` | Live and correct: allow `/`, disallow `/dashboard/`, `/admin/`, `/api/`, sitemap `https://www.mypantryhub.com/sitemap.xml`. |
| `sitemap.xml` | Live. URLs: `/`, `/pricing/`, `/privacy/`, `/terms/`, `/auth/signin/`. Remove or noindex auth (and checkout) under **PP-105** before leaning on this sitemap. |
| CSP | `frontend/next.config.ts`: `connect-src` is `'self'`, site origins, and `https://api.stripe.com` only. `script-src` is `'self' 'unsafe-inline' 'unsafe-eval'`. No analytics hosts. Tightening inline/eval is **PP-067** — new allowlists must stay compatible. |
| Privacy policy | `/privacy/` discloses session / NextAuth cookies only, no third-party advertising cookies, Google as OAuth, Cloudflare as DNS/CDN. Does **not** disclose analytics. Update in **PP-122** when a tag ships. |
| Conversion events | No `gtag` / `dataLayer` / other analytics helpers in app source. Hooks to instrument later: first Google sign-in (`isNewUser`), first successful scan/receipt add, `createCheckoutSession`, checkout success, cancel-at-period-end. |
| Other | Cloudflare email-decode (`/cdn-cgi/scripts/...`) and NEL (`a.nel.cloudflare.com`) are present; those are not Web Analytics. Plausible is mentioned only as a DESIGN.md idea, not implemented. |

## Tickets

| Ticket | Title | Priority | Status | Needs Tylor sign-in? |
|--------|-------|----------|--------|----------------------|
| PP-109 | Add Search Console and $0 analytics (umbrella) | P1 | 📋 Split into PP-117–PP-122 | — |
| PP-117 | GA4 property, consent-safe tag, key events | P1 | 📋 Open | Yes — create the property |
| PP-118 | Search Console domain verification + sitemap | P1 | 📋 Open | Yes — create / click verify |
| PP-119 | Bing Webmaster import from GSC | P2 | 📋 Open | Yes — after PP-118 |
| PP-120 | Cloudflare Web Analytics beacon + CSP | P1 | 📋 Open | No (optional dashboard confirm) |
| PP-121 | Read-only analytics API keys | P2 | 📋 Open (CF token done) | Yes — GA4 Viewer click |
| PP-122 | Privacy policy analytics disclosure | P1 | 📋 Open | No |

Do not duplicate SEO Desk work in PP-101–PP-111. Canonicals, OG, indexation hygiene, and sitemap/robots fixes stay in PP-103–PP-105. This set is only analytics + webmaster verification + privacy wording for those tools.

## What was completed in this pass (no app deploy)

Worktree was dirty with **PP-116** shopping-list files, so no `./deploy/deploy-docker.sh` and no frontend CSP/beacon/privacy code change.

- Audited live HTML, CSP, robots, sitemap, privacy, DNS, and the zone `rum` setting.
- Split PP-109 into PP-117–PP-122.
- Created Cloudflare account token **`pantry-hub-analytics-read`** (Account Analytics Read only). Stored in Mini Keychain account `pantry-hub`, service `pantry-hub-cf-analytics-api-token`. Verified `active`. Never print the value. RUM site_info still 403 with this scope.
- Did **not** add a Google or Bing DNS TXT record (no verification token yet).
- Did **not** create a GA4 property or GCP service account (needs the property + Tylor’s Viewer click). Reuse GCP project `gen-lang-client-0502314230` (Pantry Pal) or `peak-collective`; do not create a new project.

## Keys and IDs (names only)

| Kind | Where / name |
|------|----------------|
| Cloudflare zone | `mypantryhub.com` / `5a20fa23f330a7879050067ad822cac1` |
| Cloudflare account | Peak Collective LLC / `2132a66da47ec4ed0e976c8eddbaf418` |
| Zone RUM site tag (public beacon id, if reused) | `a1ab471f80614de994b2058dd378aa26` |
| CF read token (Keychain) | account `pantry-hub`, service `pantry-hub-cf-analytics-api-token` |
| CF token name in the dashboard | `pantry-hub-analytics-read` |
| Planned GA4 Keychain item | account `pantry-hub`, service `pantry-hub-ga4-service-account-json` |
| Planned SA | `pantry-hub-ga4-reader@<project>.iam.gserviceaccount.com` |
| Preferred GCP project | `gen-lang-client-0502314230` (Pantry Pal), fallback `peak-collective` |
| Google account on the Mini | `thindery@gmail.com` (`gcloud` already logged in) |

`security find-generic-password -w` may hex-encode multi-line JSON (Bragle gotcha). Do not put values in git or chat.

## Deploy rule

Code changes go through agy or Hermes, never `grok -p`. Deploy only with `./deploy/deploy-docker.sh main` from a clean worktree, then verify `https://www.mypantryhub.com/build-id.txt`. Skip deploy while PP-116 is in flight.
