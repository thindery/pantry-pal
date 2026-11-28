# GROWTH-003: GA4 reporting uses engaged sessions and excludes junk traffic

**Status:** 📋 Open
**Priority:** P2
**Owner:** Pantry Hub Lead / whoever runs the growth snapshot
**Phase:** Analytics / data quality
**Created:** 2026-11-28
**Depends on:** PP-253 (stops new localhost / 127.0.0.1 hits)
**Doc:** `.agents/docs/analytics-and-search-console.md`

---

## Collector

The growth / traffic snapshot is **not** in this repo. It lives on the Mini:

- Script: `~/.agents/skills/marketing/google-traffic-apis/scripts/traffic_snapshot.py`
- CLI symlink: `google-traffic-snapshot`
- Skill: `~/.agents/skills/marketing/google-traffic-apis/SKILL.md`
- Site registry: `~/.config/google/sites.json`

Today the script reports raw `activeUsers`, `sessions`, and `screenPageViews` with no hostname or bot filters. Do not commit this file into pantry-pal. Do not touch Cloudflare Bot Fight Mode in this ticket.

## Reporting rules for Pantry Hub (property 565428577)

Use these whenever a growth, daily, or metrics report quotes GA4 for mypantryhub.com:

1. **Primary traffic number:** engaged sessions (not raw users or sessions). A Nov 28 audit found 1,467 users / 1,481 sessions vs only 33 engaged sessions in 7 days (America/Chicago, 7daysAgo–today). The 982 figure was the Nov 26 daily user count, not a 7-day total.
2. **Exclude hostnames** `localhost` and `127.0.0.1` (and `::1` if it appears). Those were Playwright / local harness hits using the production measurement ID. PP-253 stops new hits; historical data stays until it ages out (event retention is 2 months).
3. **Exclude the Denver Chrome-for-Mac crawler:** city Denver, operating system Macintosh, about 0% engagement, sessions of 1 second or less. In the same 7 days this was 930 users / 927 sessions on `www.mypantryhub.com` with 10 engaged (1.08%).

When updating `traffic_snapshot.py` for the pantryhub / mypantryhub site, apply the same filters there (dimension filter on hostname; exclude the Denver + Macintosh low-engagement slice; put `engagedSessions` in totals). Other sites in the registry should keep their current unfiltered totals unless they have the same problem.

Never invent numbers. Do not enable or change Cloudflare Bot Fight Mode as part of this ticket.

## Acceptance Criteria

- [ ] Growth and daily reports for Pantry Hub lead with engaged sessions and apply the hostname + Denver Macintosh crawler exclusions above.
- [ ] `traffic_snapshot.py` (Mini, outside this repo) is updated to apply those filters for the Pantry Hub site, or the ticket stays open until it is.
