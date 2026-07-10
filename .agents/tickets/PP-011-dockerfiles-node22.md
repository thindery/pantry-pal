# PP-011: Multi-stage Dockerfiles (Node 22 interim)

**Status:** 🔄 To Do  
**Priority:** P0  
**Phase:** 2 — Playbook structure  
**Playbook:** `project-director/playbooks/ovh_deployment.md`  
**Created:** 2026-07-10  
**Depends on:** PP-010  
**Blocks:** PP-013

---

## Description

Production-oriented Docker builds using **Node 22** Alpine. Interim backend is Express; Phase 3 will swap backend image to Python.

## Acceptance Criteria

- [ ] `frontend/Dockerfile`: multi-stage, `node:22-alpine`, non-root user
- [ ] `Dockerfile.backend` (or `backend/Dockerfile`): multi-stage, Node 22 interim for Express
- [ ] Build args for public frontend env (API URL, Clerk publishable key)
- [ ] No secrets baked into images
- [ ] Images build successfully locally
- [ ] Document that FastAPI rewrite (PP-026) replaces backend Dockerfile base

## Log

- 2026-07-10: Ticket created
