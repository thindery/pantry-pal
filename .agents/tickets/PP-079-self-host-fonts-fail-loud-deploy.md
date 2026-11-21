# PP-079: Self-host fonts and fail loudly on deploy build errors

**Status:** ✅ Done  
**Priority:** P1  
**Phase:** Ops / deploy reliability  
**Created:** 2026-11-21  
**Completed:** 2026-11-21  

---

## Problem

The OVH frontend Docker build failed during `npm run build` with `next/font/google` ("queries have exactly one entry" / module-not-found) because Inter and Lora were fetched from fonts.googleapis.com at build time. `deploy/deploy-docker.sh` still printed "Deploy complete" and left the previous containers running, so PP-078's first full deploy looked successful when it was not.

## Acceptance Criteria

- [x] Fonts are self-hosted via `next/font/local` (no build-time Google Fonts fetch)
- [x] `npm run build -w @pantry-pal/frontend` passes on the Mini
- [x] `deploy/deploy-docker.sh` uses `set -euo pipefail`, builds images before `up`, and does not print "Deploy complete" if a build/compose/health step fails
- [x] Production frontend is recreated on the new SHA; all three services healthy
