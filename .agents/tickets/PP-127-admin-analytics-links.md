# PP-127: Link the admin dashboard out to GA4 and Search Console

**Status:** ✅ Done (overnight 2026-11-25, PR #90, merge 3981b53)
**Priority:** P2
**Phase:** Marketing dashboard (2026-11-22)
**Created:** 2026-11-22
**Depends on:** PP-117–PP-122 for the actual properties, tags, and keys (do not redo that work here)
**Blocks:** —
**Design:** `.agents/docs/marketing-dashboard.md`
**Analytics doc:** `.agents/docs/analytics-and-search-console.md`
**Parent split:** PP-109 → PP-117–PP-122

---

## Problem

Once analytics and Search Console are set up, the Pantry Hub admin should have an obvious way to open those properties. That is not the same job as creating the GA4 property, verifying Search Console, installing beacons, minting keys, or updating the privacy policy — those are already ticketed as **PP-117–PP-122**. This ticket is only in-admin links and honest “not set up yet” placeholders.

## Behavior

- On the Marketing view (PP-125) or a small Analytics card on the overview, add outbound links for:
  - Google Analytics 4 (PP-117)
  - Google Search Console (PP-118)
  - Bing Webmaster Tools (PP-119)
  - Cloudflare Web Analytics (PP-120)
- If a property is not verified yet, show “Not set up — see PP-11x” (or equivalent) instead of a dead link or fake traffic counts. Never invent sessions, clicks, or impressions.
- After PP-121, it is okay to say that read-only keys live in the Mini Keychain for later in-app charts. **Do not** build GA4/GSC charts or copy API keys into the app in this ticket.
- Do not add tags, CSP hosts, DNS TXT records, Measurement IDs, or privacy-policy wording here. If a link needs a property ID, read it from env / operator docs already specified in the analytics tickets; do not commit secrets.

## Out of scope (owned elsewhere)

| Ticket | Owns |
|--------|------|
| PP-117 | GA4 property, consent-safe tag, key events |
| PP-118 | Search Console domain verification and sitemap submit |
| PP-119 | Bing Webmaster import from GSC |
| PP-120 | Cloudflare Web Analytics beacon + CSP |
| PP-121 | Read-only analytics API keys |
| PP-122 | Privacy policy analytics disclosure |
| PP-103–PP-105 | Canonicals, sitemap/robots, indexation hygiene |

## Acceptance Criteria

- [ ] Admins can reach GA4, GSC, Bing, and Cloudflare Web Analytics from the admin UI when those properties exist
- [ ] Unverified tools show an honest not-set-up state that points at the existing PP-117–PP-122 tickets
- [ ] No analytics numbers are invented, and no setup work from PP-117–PP-122 is duplicated

## Progress Notes

- 2026-11-25 overnight (Pantry Hub Lead): Analytics tools card on the admin Marketing view. GA4 (PP-117), Search Console domain property (PP-118) and Cloudflare Web Analytics (PP-120) open in a new tab; Bing shows "Not set up — see PP-119". No numbers, keys, tags or CSP changes. Flip `status` in AnalyticsLinksCard.tsx when PP-119 closes.
