# PP-107: HTTP should 301 to HTTPS (now returns 500)

**Status:** ✅ Closed 2026-11-25 — already satisfied; no code change
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


## Closure evidence (2026-11-25, ~12 PM CT)
- `curl -I` with a browser User-Agent from OVH: `http://mypantryhub.com/` → 301 `Location: https://www.mypantryhub.com/`; `http://mypantryhub.com/pricing/?a=1` → 301 `https://www.mypantryhub.com/pricing/?a=1`; `http://www.mypantryhub.com/` → 301 `https://www.mypantryhub.com/`.
- OVH nginx on 127.0.0.1 with `Host: www.mypantryhub.com`: 301 (the `:80` redirect blocks already exist in `deploy/nginx/pantry-pal.conf`).
- The "HTTP 500 / Server: Pingora" in the original report came from the checking agent's egress proxy, not from Pantry Hub. Requests without a browser User-Agent get a Cloudflare managed challenge (403), which is also not a Pantry Hub fault.
- Cloudflare zone: `always_use_https` is off, SSL mode full. Turning on Always Use HTTPS is optional hardening, not needed for the 301.
