# PP-240: Backend test fails on main after PP-239 (weekly catalog vs recipe library)

**Status:** ✅ Done (2026-11-27; test-only, no deploy needed)
**Priority:** P2
**Phase:** Tests / weekly recipe newsletter
**Created:** 2026-11-27, 9:05 AM America/Chicago
**Source:** Fix-and-test run (pre-commit `npm run check` failed on main)
**Related:** PP-235 (weekly recipe newsletter), PP-239 (recipe library now 96 recipes)

## Problem

`tests/test_weekly_recipes.py::test_catalog_covers_exactly_the_recipe_library` asserts the newsletter CATALOG
(24 rows in `backend/services/weekly_content.py`) equals every recipe file in `frontend/content/recipes`.
PP-239 grew the public library to 96 recipes, so the test fails on main and blocks the pre-commit hook for every commit.
The 72 new recipes have no email JPG, alt text, blurb or season, and adding them would change the approved
newsletter rotation (cooldown, seasons), so that is not a test fix.

## Fix

- The real invariant is that every catalog row has a matching recipe file (the per-row test already checks slug,
  title, minutes, meal, JPG, alt and credits). Change the test to require the catalog to be a non-empty subset of the
  library, with unique slugs, and rename it accordingly. Update the weekly_content docstring wording if it says "every".
- The newsletter pool stays the approved 24 recipes. Adding PP-239 recipes to the newsletter is a separate ticket.

## Allowed paths

- `tests/test_weekly_recipes.py`
- `backend/services/weekly_content.py` (docstring/comment only)
- This ticket file and its `.agents/TICKET_STATUS.md` row

## Rules

No commits, no pushes, no secrets, no dependency changes. Do not touch `2026-07-30` or `.agents/email-previews/`.

## Acceptance

- [x] Backend pytest passes (`ALLOW_TEST_AUTH=1 .venv/bin/python -m pytest tests/ -q --ignore=tests/test_postgres_integration.py`)
- [x] CATALOG unchanged
