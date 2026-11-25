# PP-182: Privacy must disclose AdSense ad cookies and analytics accurately

**Status:** ✅ Done (live 2026-11-25, 4:11 PM CT, build `1fab3f1`; [PR #120](https://github.com/thindery/pantry-pal/pull/120))
**Priority:** P1
**Phase:** Legal / privacy audit
**Created:** 2026-11-25
**Depends on:** —
**Blocks:** —

---

## Problem
`frontend/app/privacy/page.tsx` (last updated Nov 22, 2026) says "We do not use third-party advertising cookies, and we do not track you across unrelated [sites]" and that advertising storage / personalization / ad user data are denied on the analytics tag. The live homepage and `/privacy` load the AdSense script (`adsbygoogle.js`, ca-pub-5710716295420357) and `/ads.txt` authorizes it. The homepage HTML shows the Cloudflare beacon but no GA4 tag (the policy describes a GA tag), so the analytics text should match what actually loads.
Source: legal/privacy/footer audit of 2026-11-25 (/workspace/legal-audit-2026-11-25.md on the box). Tylor approved acting on it by voice at 3:28 PM CT.

## Fix
- [x] Section 7 (Cookies & Analytics): disclose Google AdSense (Google and partners may set cookies to serve and measure ads; link Google's ad-settings / opt-out page), say where ads appear, and keep the Your Privacy Choices link working.
- [x] State accurately what analytics run (Cloudflare Web Analytics; GA4 only if its tag is really live, with its measurement ID).
- [x] Bump "Last updated".
- [x] Optional: an `e2e` check that the policy mentions AdSense while the script is present.

Terms already require 18+. Footer and Terms are fine.


## Live evidence (2026-11-25, 4:11–4:13 PM CT)

- Code: [PR #120](https://github.com/thindery/pantry-pal/pull/120), squash commit `1fab3f1`.
- Deploy: `SKIP_E2E_SMOKE=1 ./deploy/deploy-docker.sh main` from `pantry-pal-pp182` after PP-186 (`32cb176`) was already live. Pre-deploy dump: `/opt/pantry-pal/backups/pre-pp182-20261125-2209.sql`. Migrations: no pending. Frontend/backend/db healthy. Backend `/health` returned `{"status":"healthy",...}` at 22:13:14 UTC.
- Build id: `1fab3f1` in the frontend container (`/app/frontend/public/build-id.txt`) and at `https://www.mypantryhub.com/build-id.txt` (HTTP 200 from the Lead box; Mini is still Cloudflare-challenged).
- Live `/privacy/` (HTTP 200): discloses Google AdSense on public marketing pages, partner-sites / Ads Settings / aboutads.info links, GA4 measurement ID G-LEW78LC3EF, Cloudflare Web Analytics; last updated November 25, 2026. Old claim “We do not use third-party advertising cookies” is gone. AdSense script `ca-pub-5710716295420357` still present on the page.
