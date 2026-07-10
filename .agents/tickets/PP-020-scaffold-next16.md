# PP-020: Scaffold Next 16 frontend

**Status:** 🔄 To Do  
**Priority:** P0  
**Phase:** 3 — Modernization  
**Playbook:** `portfolio_stack_baseline.md`, `nextjs_config_and_conventions.md`  
**Created:** 2026-07-10  
**Depends on:** PP-006  
**Blocks:** PP-021, PP-022, PP-024, PP-025

---

## Description

Scaffold a Next.js **16.2** App Router app in `frontend/` aligned to project-director templates and markdown-pdf conventions. Replace Vite as the product frontend.

## Acceptance Criteria

- [ ] Next 16.2 + React 19 + TypeScript + Tailwind 4 + ESLint 9
- [ ] `next.config`: `output: 'standalone'`, `distDir: 'dist'`
- [ ] `frontend/Dockerfile` updated for Next standalone (Node 22)
- [ ] Path alias `@/*`
- [ ] `npm run typecheck` and `npm run build` succeed on empty shell app
- [ ] Pin versions per `portfolio_stack_baseline.md` / templates
- [ ] Old Vite tree removed or moved to `docs/legacy/vite-spa/` only after PP-021 ports features

## Related

- `project-director/templates/frontend-package.json`
- `markdown-pdf/frontend/`

## Log

- 2026-07-10: Ticket created
