# PP-070: nginx require-cloudflare include + host verify

**Status:** 📋 Open  
**Priority:** P2  
**Phase:** Security remediation (audit 2026-07-25)  
**Finding:** SEC-206  
**Created:** 2026-07-25  
**Playbook:** `project-director/playbooks/ovh_security_baseline.md`

---

## Problem

Repo `deploy/nginx/pantry-pal.conf` does not include `/etc/nginx/snippets/require-cloudflare.conf`. Live CF still 403'd spoofed CF-Connecting-IP; residual risk if origin is hit directly.

## Fix Plan

- [ ] Add `include /etc/nginx/snippets/require-cloudflare.conf;` to each `server { }` in template  
- [ ] Deploy/reload nginx on OVH  
- [ ] Verify origin rejects non-CF traffic

## Acceptance Criteria

- [ ] Template matches OVH baseline  
- [ ] Host reload verified  
- [ ] Product remains reachable via CF proxy
