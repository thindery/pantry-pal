# PP-033: Domain purchase + Cloudflare DNS

**Status:** ⏸️ Blocked (domain not purchased)  
**Priority:** P0  
**Phase:** 3 — Modernization  
**Playbook:** `cloudflare_dns.md`  
**Created:** 2026-07-10  
**Depends on:** Domain purchase (user)  
**Blocks:** PP-034

---

## Description

Once domain is purchased, provision Cloudflare DNS for root, www, and any api subdomain to OVH server.

## Acceptance Criteria

- [ ] Domain purchased and in Cloudflare
- [ ] `@`, `www`, `*` (as needed) records via portfolio automation / Terraform pattern
- [ ] Clerk/Stripe allowed origins updated
- [ ] `.env.prod` / nginx `server_name` updated with real domain
- [ ] Document domain in TICKET_STATUS and project-director portfolio map

## Unblock

User buys domain and provides name.

## Log

- 2026-07-10: Ticket created (blocked)
