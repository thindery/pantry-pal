# PP-025: Frontend deploy version toast

**Status:** ✅ Done  
**Priority:** P1  
**Phase:** 3 — Modernization  
**Playbook:** `frontend_deploy_version_toast.md`  
**Created:** 2026-07-10  
**Depends on:** PP-020, PP-013  
**Blocks:** —

---

## Description

Implement portfolio standard stale-tab refresh toast: poll `build-id.txt`, bottom-right toast, BUILD_ID wiring in Docker/deploy.

## Acceptance Criteria

- [x] `versionCheck.ts` + `VersionUpdateToast.tsx`
- [x] `public/build-id.txt` (`dev` placeholder)
- [x] Dockerfile / deploy exports BUILD_ID before `docker compose build`
- [x] `next.config` no-cache on `/build-id.txt`
- [x] Mounted in root `app/layout.tsx`
- [x] Auth middleware excludes `/build-id.txt` (public path + matcher)
- [x] Toast z-index above dashboard mobile nav (`z-[10050]`, `bottom-20` on mobile)
- [x] Vitest coverage for `isNewerBuildAvailable` + dismiss

## Related

- Gold: getmd2pdf, userkudos, shipinaday

## Log

- 2026-07-10: Ticket created
- 2026-07-11: Fixed toast hidden behind dashboard navbar; moved mount to layout; hardened middleware matcher; added versionCheck tests