# PP-085: Tighten the Pantry list so more items are readable

**Status:** ✅ Done
**Priority:** P1
**Phase:** User-reported enhancement
**Created:** 2026-11-21
**Completed:** 2026-11-21
**Depends on:** PP-043 pantry list (and live inventory on `/dashboard/inventory`)

---

## Problem

Tylor: the Pantry dashboard is too spacious. He can only see a few items, and names are cut off. Rows are ~85px with a “Low”/“Out” pill, an (i) icon, and large +/−, so titles truncate (“Always save, con…”, “American Pasteuri…”). Only ~5 rows fit. He wants it tightened, readable product names, maybe an image, and sorting (alphabetical, qty, etc.).

## Behavior

- Rows ~52–56px tall (a 2-line name may be slightly taller). 36–40px thumbnail on the left: product image when we have one (from `product_cache` via barcode), otherwise a category icon or name initial.
- The name gets the remaining width and can wrap to 2 lines (`line-clamp-2`), no 1-line ellipsis. Second line is `qty · category`. “1 units” becomes “1 unit”.
- Low/Out shown as a thin colored left border (not a pill). Remove the (i) icon; tapping the row still opens details. +/− stay ~32px.
- Tighter header: smaller Scan item / Add manually buttons on one row, less padding around the title, search, and chips.
- Sort options: Recent, Name A–Z, Qty low→high, Qty high→low, Category (grouped with small section headers). Persist the choice in `localStorage` (`pantry-inventory-sort`).
- At a 390×844 viewport, about 9+ typical rows should be visible below the tightened chrome.

## Acceptance Criteria

- [x] Ticket + status row for PP-085
- [x] Compact readable rows with thumbnail, 2-line names, no info icon, no status pills
- [x] Sort options including category grouping; choice persists
- [x] “1 units” displays as “1 unit”
- [x] Frontend build passes
- [x] Deployed; live `build-id.txt` matches the commit; containers healthy
