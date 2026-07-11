# PP-033: Domain purchase + Cloudflare DNS

**Status:** 🔄 In progress  
**Priority:** P0  
**Phase:** 3 — Modernization  
**Playbook:** `cloudflare_dns.md`  
**Created:** 2026-07-10  
**Domain:** **mypantryhub.com** (canonical: `www.mypantryhub.com`)  
**Blocks:** PP-034 (partially unblocked — human steps remain)

---

## Description

Provision Cloudflare DNS for mypantryhub.com and align repo config (nginx, env templates, Clerk/Stripe URLs).

## Acceptance Criteria

- [x] Domain purchased (**mypantryhub.com**)
- [x] Zone in Cloudflare (active)
- [x] Terraform scaffold `deploy/terraform/`
- [x] nginx `server_name` + HTTPS vhost `deploy/nginx/pantry-pal.conf`
- [x] `.env.prod.example` with production URLs
- [x] Terraform applied (`@`, `www`, `*` → OVH `15.204.254.25`) — 2026-07-11
- [ ] Cloudflare SSL: **Full**
- [ ] Clerk + Stripe production origins/webhooks updated
- [x] Document domain in TICKET_STATUS and project-director portfolio map

## Log

- 2026-07-10: Ticket created (blocked)
- 2026-07-11: Domain **mypantryhub.com** purchased; repo config + terraform scaffold added