# PP-034: OVH production cutover

**Status:** 📋 Ready (domain set — needs PP-033 DNS apply + `.env.prod` on OVH)
**Priority:** P0  
**Phase:** 3 — Modernization  
**Playbook:** `ovh_deployment.md`  
**Created:** 2026-07-10  
**Depends on:** PP-013, PP-014, PP-032, PP-033  
**Blocks:** PP-035

---

## Description

Deploy PantryPal to OVH: `/opt/pantry-pal`, compose on app-network, nginx vhost, health checks, smoke test production URL.

## Acceptance Criteria

- [ ] `/opt/pantry-pal` on OVH with storage permissions
- [ ] `docker compose` production stack healthy
- [ ] nginx conf installed + reloaded
- [ ] HTTPS via Cloudflare Full
- [ ] DB migrations applied
- [ ] Clerk/Stripe production webhooks pointed at live URLs
- [ ] Smoke: auth, inventory CRUD, health, build-id.txt

## Log

- 2026-07-10: Ticket created (blocked on domain)
- 2026-07-11: Domain **mypantryhub.com** — nginx/env templates ready; see `deploy/CUTOVER.md`
