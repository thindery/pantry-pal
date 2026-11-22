# PP-122: Update the privacy policy to disclose analytics

**Status:** ✅ Done
**Priority:** P1
**Updated:** 2026-11-22, 5:03 PM America/Chicago — shipped in production deploy `db0ef3e` (analytics commit `4d58e1f`)
**Phase:** Analytics / Search Console (audit 2026-11-22)
**Created:** 2026-11-22
**Owner:** Pantry Hub Lead / agy
**Needs Tylor sign-in:** No
**Depends on:** Ship in the same deploy as the tags in PP-117 and/or PP-120 so the policy is not ahead of or behind the live tools
**Audit:** `.agents/docs/analytics-and-search-console.md`
**Parent:** PP-109 (split)

---

## Problem

`frontend/app/privacy/page.tsx` (live `/privacy/`, last updated July 10, 2026) currently says:

- Cookies are session / NextAuth only, required to stay signed in.
- “We do not use third-party advertising cookies on the marketing site.”
- Third parties list **Google** only for OAuth sign-in and **Cloudflare** only for DNS and CDN.

That is accurate today (no GA4 or Web Analytics beacon on the live HTML). It will be wrong as soon as PP-117 or PP-120 ships. GA4 sets cookies and uses Google as a processor. Cloudflare Web Analytics is cookieless but is still a traffic measurement tool.

## Behavior

Update the Cookies & Analytics section and the third-party list, using legal, true wording only:

1. **Cloudflare Web Analytics** — cookieless RUM / traffic measurement, in addition to DNS and CDN. No advertising cookies.
2. **GA4** (when PP-117 ships) — Google Analytics 4 sets cookies, Google is a processor, used to understand site usage, not to sell ads for us. Link Google’s opt-out / [Google Analytics opt-out browser add-on](https://tools.google.com/dlpage/gaoptout). State that Google signals and ad personalization are off.
3. Keep the existing “no third-party advertising cookies on the marketing site” claim only if it remains true (it should, if GA4 is consent-safe per PP-117).
4. Bump the privacy “Last updated” date when the wording changes.
5. Code through agy or Hermes, never `grok -p`. Deploy from a clean worktree with the matching tags; do not deploy on top of dirty PP-116 work.

Do not invent compliance badges, certifications, or “we never use cookies” claims.

## Acceptance Criteria

- [ ] Privacy policy names every analytics tool that is actually live (CF Web Analytics and/or GA4)
- [ ] GA4 disclosure includes cookies, Google as processor, and an opt-out link, if GA4 is live
- [ ] Cloudflare is described as DNS, CDN, and Web Analytics if the beacon is live
- [ ] “Last updated” date reflects the change
- [ ] Wording stays accurate if only one of the two tools ships first

## Shipped

Live on https://www.mypantryhub.com/privacy/ as of 2026-11-22, 5:03 PM America/Chicago (build `db0ef3e`). Last updated date is November 22, 2026. Discloses GA4, cookieless Cloudflare Web Analytics, GPC, EEA/UK/CH consent, and a Your Privacy Choices section (`#privacy-choices`) with contact `hello@mypantryhub.com`. Footer Legal column links to that anchor.
