# PP-120: Ship the Cloudflare Web Analytics beacon and allow it in CSP

**Status:** 📋 Open
**Priority:** P1
**Phase:** Analytics / Search Console (audit 2026-11-22)
**Created:** 2026-11-22
**Owner:** Pantry Hub Lead / agy (code); Dev Ops deploys from a clean worktree
**Needs Tylor sign-in:** No for the code change. Optional dashboard check under the Peak Collective LLC Cloudflare account if auto-install should be confirmed.
**Depends on:** PP-122 should ship in the same deploy (privacy disclosure). Do not deploy while PP-116 shopping-list work is dirty.
**Audit:** `.agents/docs/analytics-and-search-console.md`
**Parent:** PP-109 (split)

---

## Problem

`mypantryhub.com` is a proxied Cloudflare zone (Free Website, SSL Full, account Peak Collective LLC). The zone setting `rum` is **on** and has site tag `a1ab471f80614de994b2058dd378aa26`, but the live HTML (including a Chrome user-agent request) does **not** contain `static.cloudflareinsights.com/beacon.min.js`, `data-cf-beacon`, or that site tag. Auto-injection is not actually happening.

The current API token cannot manage RUM site info (`GET /accounts/.../rum/site_info/list` returns 403 even with an Account Analytics Read token). So we cannot flip auto-install from the API. The reliable $0 fix is to add the cookieless beacon in the app and allow it in CSP.

Live CSP today (`frontend/next.config.ts`):

`script-src 'self' 'unsafe-inline' 'unsafe-eval'`  
`connect-src 'self' https://www.mypantryhub.com https://mypantryhub.com https://api.stripe.com`

`cloudflareinsights.com` is not allowed, so a beacon would be blocked even if Cloudflare started injecting it.

## Behavior

1. In the Cloudflare dashboard (Analytics → Web Analytics) confirm whether a site already exists for `mypantryhub.com`. Reuse the existing site tag if it matches `a1ab471f80614de994b2058dd378aa26`. If no site exists, create a free Web Analytics site (auto-install can stay on as a backup; the in-app snippet is the source of truth).
2. Add the beacon to every page, e.g. in `frontend/app/layout.tsx`:

   `https://static.cloudflareinsights.com/beacon.min.js` with `data-cf-beacon` token = the site tag.

3. Allow it in CSP: `script-src` and `connect-src` should include `https://static.cloudflareinsights.com` and `https://cloudflareinsights.com` (the house method). Stay compatible with PP-067.
4. Code changes go through agy (`~/.local/bin/agy -p --model gemini-3.8-flash-medium`) or Hermes, never `grok -p`.
5. Deploy only via `./deploy/deploy-docker.sh main` from a **clean** worktree. Verify with curl that the live HTML includes the beacon and the real site tag, then check `https://www.mypantryhub.com/build-id.txt`.
6. Ship PP-122 in the same release (privacy: Cloudflare Web Analytics is cookieless; Cloudflare is already listed as DNS/CDN and should also be listed as RUM / Web Analytics).

$0 only. Do not enable paid Cloudflare Application Services / Zaraz products.

## Acceptance Criteria

- [ ] Live HTML on `https://www.mypantryhub.com` includes the Cloudflare Web Analytics beacon and the real site tag
- [ ] CSP allows the beacon (`script-src` / `connect-src` for the insights hosts) and nothing extra
- [ ] Privacy policy discloses Cloudflare Web Analytics (PP-122)
- [ ] A first empty dashboard is treated as normal until traffic is collected
