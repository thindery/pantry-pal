# PP-014: nginx vhost template (placeholder domain)

**Status:** 🔄 To Do  
**Priority:** P0  
**Phase:** 2 — Playbook structure  
**Playbook:** `project-director/playbooks/ovh_deployment.md`  
**Created:** 2026-07-10  
**Depends on:** PP-013  
**Blocks:** PP-034

---

## Description

Nginx reverse-proxy config template for central OVH nginx, with **placeholder** server_name until domain is purchased (PP-033).

## Acceptance Criteria

- [ ] `deploy/nginx/pantry-pal.conf` with frontend + optional api upstreams
- [ ] Placeholder `server_name` (e.g. `YOUR_DOMAIN` / commented examples)
- [ ] Cloudflare Full SSL friendly (80/443 notes)
- [ ] Document copy path: `/opt/nginx/conf.d/` + reload
- [ ] Choose free host port not conflicting with markdown-pdf (3001) / userkudos (3003)

## Log

- 2026-07-10: Ticket created
