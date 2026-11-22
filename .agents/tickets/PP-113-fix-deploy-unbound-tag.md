# PP-113: Fix deploy abort when the Ralph ticket regex misses

**Status:** ✅ Done
**Priority:** P1
**Phase:** Deploy tooling
**Created:** 2026-11-22
**Completed:** 2026-11-22
**Depends on:** PP-013

---

## Problem

`deploy/deploy-docker.sh` runs the remote script with `set -u`. The Ralph compliance check uses `$TAG` on the server, but only `DEPLOY_TAG` was set there. The first Ralph branch matches commit subjects like `PP-090: …`, so earlier deploys succeeded. A subject such as `PP-091–PP-094: …` missed that regex, fell through to `[ "$TAG" = "main" ]`, and aborted with `TAG: unbound variable` after the git checkout. That left `4e1e79f` on origin but not live until the script was fixed.

## Behavior

- The remote script now sets `TAG="$DEPLOY_TAG"` so the Ralph exception path and later uses of `$TAG` work under `set -u`.
- The PP-091–PP-094 commit was then deployed successfully.

## Acceptance Criteria

- [x] Ticket + status row for PP-113
- [x] `./deploy/deploy-docker.sh main` no longer dies on an unbound remote `TAG`
- [x] `4e1e79f` went live after the fix (build-id matched; containers healthy)
