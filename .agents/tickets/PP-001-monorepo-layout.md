# PP-001: Monorepo layout — frontend/ + backend/ clean copy

**Status:** 🔄 To Do  
**Priority:** P0  
**Phase:** 1 — Monorepo  
**Playbook:** `project-director/playbooks/new_project_scaffold.md`  
**Created:** 2026-07-10  
**Depends on:** —  
**Blocks:** PP-002, PP-003, PP-006

---

## Description

Convert dual-repo PantryPal into a single monorepo matching markdown-pdf / userkudos layout:

- Move current Vite SPA into `frontend/`
- Clean-copy `pantry-pal-api` into `backend/` (no git history import)
- Stop depending on sibling path `../pantry-pal-api`

## Acceptance Criteria

- [ ] `frontend/` contains the existing Vite React app (package.json, src/components, tests, vite config)
- [ ] `backend/` is a clean copy of pantry-pal-api source (src, tests, package.json, tsconfig, docker-compose pieces as needed)
- [ ] No runtime scripts reference `../pantry-pal-api`
- [ ] Root still has product docs (`AGENTS.md`, `DESIGN.md`, `README.md`) — may be updated in PP-004
- [ ] Secrets (`.env*`) are not committed; `.env.example` placeholders only
- [ ] `node_modules`, `dist`, `data/*.db`, `eng.traineddata` not blindly copied if regenerable
- [ ] Local paths in frontend vite aliases and tests updated to new tree

## Technical Notes

- Prefer `backend/` name (portfolio convention) over `api/`
- Clean copy: `rsync` / `cp` excluding `node_modules`, `.git`, `data`, large OCR training data if gitignored later
- App.tsx can stay as-is for Phase 1; modularize in PP-023

## Log

- 2026-07-10: Ticket created
