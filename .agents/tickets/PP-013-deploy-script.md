# PP-013: deploy/deploy-docker.sh scaffold

**Status:** 🔄 To Do  
**Priority:** P0  
**Phase:** 2 — Playbook structure  
**Playbook:** `project-director/playbooks/ovh_deployment.md`  
**Created:** 2026-07-10  
**Depends on:** PP-011  
**Blocks:** PP-034

---

## Description

Add OVH-style deploy script scaffold (lock file, BUILD_ID, health poll, compose up). Domain not required to write the script; live cutover is PP-034.

## Acceptance Criteria

- [ ] `deploy/deploy-docker.sh` exists with lock, test gate hooks, health check pattern
- [ ] BUILD_ID export for frontend version toast (PP-025)
- [ ] Documented usage: `./deploy/deploy-docker.sh main`
- [ ] Safe no-op / dry-run notes until OVH path exists
- [ ] Modeled on markdown-pdf / userkudos deploy scripts

## Log

- 2026-07-10: Ticket created
