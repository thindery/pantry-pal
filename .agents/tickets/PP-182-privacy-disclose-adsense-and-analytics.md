# PP-182: Privacy must disclose AdSense ad cookies and analytics accurately

**Status:** 📋 Open (filed by Remy, Grok Bot executor; NOT fixed by me; Pantry Hub Lead owns it)
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
- [ ] Section 7 (Cookies & Analytics): disclose Google AdSense (Google and partners may set cookies to serve and measure ads; link Google's ad-settings / opt-out page), say where ads appear, and keep the Your Privacy Choices link working.
- [ ] State accurately what analytics run (Cloudflare Web Analytics; GA4 only if its tag is really live, with its measurement ID).
- [ ] Bump "Last updated".
- [ ] Optional: an `e2e` check that the policy mentions AdSense while the script is present.

Terms already require 18+. Footer and Terms are fine.
