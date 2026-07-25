# PP-070: nginx require-cloudflare include + host verify

**Status:** ✅ Done (template; host verify pending deploy)  
**Priority:** P2  
**Phase:** Security remediation (audit 2026-07-25)  
**Finding:** SEC-206  
**Created:** 2026-07-25  
**Completed:** 2026-07-24  

**Playbook:** `project-director/playbooks/ovh_security_baseline.md`

---

## Problem

Repo `deploy/nginx/pantry-pal.conf` does not include `/etc/nginx/snippets/require-cloudflare.conf`. Live CF still 403'd spoofed CF-Connecting-IP; residual risk if origin is hit directly.

## Fix Plan

- [x] Add `include /etc/nginx/snippets/require-cloudflare.conf;` to each `server { }` in template  
- [ ] Deploy/reload nginx on OVH  
- [ ] Verify origin rejects non-CF traffic

## Acceptance Criteria

- [x] Template matches OVH baseline  
- [ ] Host reload verified — **needs deploy / ops**  
- [ ] Product remains reachable via CF proxy — **needs deploy**

## Implementation

- `include` on all 6 server blocks
- Also forward `CF-Connecting-IP` to upstream for PP-071 rate limiting
