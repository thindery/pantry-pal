# PP-012: switch-env.sh + env var conventions

**Status:** 🔄 To Do  
**Priority:** P0  
**Phase:** 2 — Playbook structure  
**Playbook:** `project-director/playbooks/env_var_conventions.md`  
**Created:** 2026-07-10  
**Depends on:** PP-003  
**Blocks:** —

---

## Description

Add portfolio-standard environment switching (`.env.dev` / `.env.prod` + symlink `.env`) via `switch-env.sh`.

## Acceptance Criteria

- [ ] `switch-env.sh` (dev|prod) matching markdown-pdf / userkudos pattern
- [ ] `.env.example` complete and committed
- [ ] Document sandbox setup via project-director `sandbox_setup.py` if applicable
- [ ] README documents how to switch envs
- [ ] No production secrets in repo

## Log

- 2026-07-10: Ticket created
