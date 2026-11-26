# GROWTH-002: GA4 key events and signup/login records

- Priority: P2
- Owner: Pantry Hub Lead
- Status: MOSTLY DONE (2026-11-26 triage). Key events shipped in PP-157/PP-165, `login_events` and a signup timestamp in migration 025, beacon in PP-120. Only "request indexing" is left (SEO Desk / Search Console).
- Created: 2026-11-24 (from the Daily Growth Report)

## Gap
GA4 property 565428577 reports 0 key events and only started recording on Nov 23. `login_events` is empty and `users` has no created-at column, so signups and activity cannot be trended.

## To do
- [ ] Fire `sign_up`, `begin_checkout`, `purchase` and mark them as GA4 key events.
- [ ] Write `login_events` rows on sign-in and store a signup timestamp.
- [ ] Confirm the Cloudflare Web Analytics beacon token matches the site.
- [ ] Request indexing for the 5 sitemap URLs (0 indexed).

No secrets in this file or in git.

Related open work: PP-105 (indexation hygiene), PP-121 (read-only analytics keys), PP-126 (subscription funnel tiles). Check these before starting so nothing is duplicated.
