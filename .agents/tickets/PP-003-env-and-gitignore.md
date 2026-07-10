# PP-003: Env templates + gitignore portfolio standard

**Status:** 🔄 To Do  
**Priority:** P0  
**Phase:** 1 — Monorepo  
**Playbook:** `project-director/playbooks/env_var_conventions.md`  
**Created:** 2026-07-10  
**Depends on:** PP-001  
**Blocks:** PP-012

---

## Description

Unify environment documentation and gitignore to portfolio standards. No real secrets in git.

## Acceptance Criteria

- [ ] Root `.env.example` lists all frontend + backend keys with placeholders
- [ ] Frontend public keys use `VITE_*` interim (later `NEXT_PUBLIC_*` in Phase 3)
- [ ] Backend documents `DATABASE_URL`, Clerk, Stripe, CORS
- [ ] `.gitignore` includes portfolio checklist: `.env`, `.env.local`, `data/`, `*.db`, `node_modules/`, `dist/`, `.terraform/`, etc.
- [ ] Existing local `.env*` remain untracked
- [ ] CORS defaults work for local frontend origin after path move

## Log

- 2026-07-10: Ticket created
