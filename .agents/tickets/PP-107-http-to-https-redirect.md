# PP-107: HTTP should 301 to HTTPS (now returns 500)

**Status:** 📋 Open
**Priority:** P1
**Phase:** SEO / AEO / marketing (audit 2026-11-22)
**Created:** 2026-11-22
**Depends on:** —
**Blocks:** Reliable first-crawl of `http://` URLs
**Audit:** `.agents/docs/seo-aeo-audit-2026-11-22.md` (SEO desk, 2026-11-22)
**Notes:** Likely Cloudflare / nginx / Pingora on OVH — coordinate with Dev Ops. Do not deploy from a dirty Mini worktree. This desk will not run the deploy.

---

## Problem

`curl` from the box:

- `http://mypantryhub.com/` → HTTP 500, `Server: Pingora`, empty body, `Cache-Control: private, no-store`
- `http://www.mypantryhub.com/` → same 500

`https://mypantryhub.com` already 301s to `https://www.mypantryhub.com/`. HTTPS responses include HSTS, but HTTP never redirects, so a client (or crawler) hitting `http://` gets an error instead of the site.

## Behavior

- Both apex and www HTTP requests 301 (or 308) to the canonical HTTPS www URL, preserving the path.
- No 500 on the HTTP vhost for ordinary GET `/`.

## Acceptance Criteria

- [ ] `http://mypantryhub.com/` and `http://www.mypantryhub.com/` redirect to `https://www.mypantryhub.com/` (or the same path on HTTPS www)
- [ ] A non-home HTTP path (e.g. `http://www.mypantryhub.com/pricing/`) redirects to the HTTPS canonical for that path
- [ ] Verified from the box (not the Mini; Cloudflare may challenge the Mini)
