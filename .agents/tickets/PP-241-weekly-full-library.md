# PP-241: Weekly recipe newsletter uses the full public library

**Status:** ✅ Live (2026-11-27, 11:50 AM America/Chicago, build `e3f23df`, [#173](https://github.com/thindery/pantry-pal/pull/173)). No email was sent; the next draft is Wed 2026-12-02, 9 AM CT.
**Priority:** P1
**Phase:** Growth / email
**Created:** 2026-11-27, 11:35 AM America/Chicago
**Source:** Tylor approved expanding the weekly recipe email from the fixed 24-recipe list to all live public recipes (96 now, and any added later).
**Coding agent:** Grok Bot directly. Hermes, agy, and the Grok CLI are not used.
**Depends on:** PP-235, PP-239, PP-240
**Related:** PP-238 (holiday collection)
**Constraints:** $0 only. Do not send any email or trigger a build/send run. `EMAIL_WEEKLY_AUTO_SEND` stays off. Next draft is Wednesday 2026-12-02, 9 AM CT; the `[TEST]` copy goes only to Tylor as already configured. Never invent numbers. User-facing text says "AI" only for AI art, never a model name.

Priority is P1 because Tylor approved it and the next draft is 2026-12-02, so it should land in this push. Nothing is broken today; the current 24-recipe pool still works.

---

## Problem

The weekly recipe job (`backend/services/weekly_content.py`) still picked from the original 24-recipe approved catalog. PP-239 grew the public library to 96 recipes, all with images. PP-240 loosened the catalog test to a subset so main would pass, and left expanding the newsletter pool as a follow-up.

## Behavior

- The weekly email draws from every live public recipe automatically (the catalog is loaded from `frontend/content/recipes/*.ts`).
- Recipes tagged `holiday` are preferred from November 8 through January 7. Existing Thanksgiving peak windows (leftover turkey soup, green bean casserole) still rank higher.
- Recent picks are still avoided; the cooldown is `(pool - 3) // 3` issues (31 weeks at 96 recipes). The SQL lookback grows with the cooldown so it does not stay capped at 30 issues.
- Every recipe in the pool has a 600x450 email JPG, credits, and alt text starting with "AI illustration".
- The backend image copies `frontend/content/recipes/` so production can load the library.
- No email is sent as part of this ticket. A local dry-run of the picker (no database write, no send) reports the 2026-W49 selection.

## Acceptance Criteria

- [x] Catalog equals the public recipe library (not a fixed 24-list)
- [x] New recipe files are picked up automatically; the PP-240 subset test is replaced with an exact-library check
- [x] Holiday-tagged recipes are preferred in the Thanksgiving-through-New-Year window; recent picks are not repeated
- [x] Email JPGs, credits, and alt text exist for every catalog recipe
- [x] Backend pytest and vitest pass (644 passed, 63 skipped; vitest 401 passed). CI: quality, test, gitleaks, postgres-integration, e2e-smoke green; migration-check skipped.
- [x] Merged to main (`e3f23df`) and deployed; live `build-id.txt` in the frontend container is `e3f23df`
- [x] No list send and no `build`/`send` job run on production


## Rollout log

- 2026-11-27, 11:50 AM CT: PR #173 squash-merged (`e3f23df`). Deployed with `./deploy/deploy-docker.sh main` (`SKIP_E2E_SMOKE=1`). Frontend and backend containers healthy. `build-id.txt` in the frontend container: `e3f23df`.
- No weekly `build` or `send` job was run. Production still has only the 2026-W48 draft (Green Bean Casserole, Leftover Turkey Soup, Easy Vegetable Soup; tip `date-it`).
- Local dry-run of the picker for 2026-W49 (no database write): Classic Stuffing, Leftover Turkey Pot Pie, Easy Sugar Cookies. Subject: `This week: Classic Stuffing, Leftover Turkey Pot Pie and 1 more`. Next tip in rotation: Look before you shop.
