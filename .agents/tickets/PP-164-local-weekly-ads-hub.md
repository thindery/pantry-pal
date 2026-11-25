# PP-164: Local grocery weekly-ads hub (v1 link-out)

**Status:** ✅ Done (2026-11-25)
**Priority:** P2
**Phase:** Future features (follows PP-115 research / PHL-8)
**Created:** 2026-11-25
**Source:** Tylor, 2026-11-25 2:03 PM CT ("build it as v1 link-out"), design note: data-driven ZIP-to-stores mapping, seed only his Springfield-area stores, honest fallback elsewhere.

---

## Behavior

- Signed-in page `/dashboard/weekly-ads/` (link from the Shopping list header). User enters a ZIP and sees nearby stores; each store links out (new tab) to its **official** weekly-ad page. The user's unchecked shopping list is shown alongside.
- No scraping, no deal matching, no partner APIs. The ZIP is used for the lookup only (kept in the browser's localStorage for convenience, never stored on the server).
- Data-driven: table `weekly_ad_stores` (migration 030). `kind='local'` rows match when the ZIP starts with any of `zip_prefixes` (3, 4 or 5 digits). `lat`/`lng` columns exist for a later radius search. **Add a new area with SQL rows; no code change.**
- ZIPs with no local rows get a plain message ("We don't have local stores for <ZIP> yet") and the `kind='fallback'` national finders: Walmart, ALDI, Kroger family.
- API: `GET /api/weekly-ads?zip=` (auth required; 400 on a bad ZIP).

## Seed (Springfield, MO area: prefixes 656, 657, 658; links checked 2026-11-25)

| Store | Weekly ad |
|-------|-----------|
| ALDI (pick your store) | https://www.aldi.us/weekly-specials/our-weekly-ads/ (ALDI's Instacart-powered flyer) |
| Walmart #2221 E Independence St | https://www.walmart.com/store/2221-springfield-mo/weekly-ads |
| Walmart #444 S Campbell Ave | https://www.walmart.com/store/444-springfield-mo/weekly-ads |
| Walmart #179 W Sunshine St | https://www.walmart.com/store/179-springfield-mo/weekly-ads |
| Walmart #86 N Kansas Expy | https://www.walmart.com/store/86-springfield-mo/weekly-ads |
| King Food Saver, 335 N Nolting Ave | https://www.kingfoodsaver.com/weekly-ad |
| Cash Saver 417, 2650 W Kearney St | https://www.cashsaver417.com/weekly-ad/ |
| Harter House (Republic Rd and other stores) | https://harterhouse.com/locations/republic-road/ (each location page carries the current ad PDF) |
| Harter House Eastgate, 1625 S Eastgate Ave | https://harterhouseeastgate.net/ads |

Walmart blocks scripted checks, so its per-store `/weekly-ads` URLs follow Walmart's published pattern and were not fetched.

## Acceptance criteria

- [x] ZIP entry shows nearby stores with official weekly-ad links (new tab, `noopener noreferrer`)
- [x] Shopping list shown alongside (unchecked items)
- [x] Stores come from a table; adding an area needs no code change (Postgres test inserts a row and it appears)
- [x] Uncovered ZIPs get an honest fallback, never fake local coverage
- [x] No scraping, matching or partner APIs
- [x] Tests: `tests/test_weekly_ads.py` (unit + Postgres), `frontend/tests/weekly-ads-view.test.tsx`
