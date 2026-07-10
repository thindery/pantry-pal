# PP-025: Frontend deploy version toast

**Status:** 🔄 To Do  
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

- [ ] `versionCheck.ts` + `VersionUpdateToast.tsx` (or equivalent)
- [ ] `public/build-id.txt`
- [ ] Dockerfile / deploy exports BUILD_ID
- [ ] next.config no-cache on `/build-id.txt`
- [ ] Mounted in root layout
- [ ] Auth middleware excludes `/build-id.txt`

## Related

- Gold: getmd2pdf, userkudos, shipinaday

## Log

- 2026-07-10: Ticket created
