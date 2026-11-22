# PP-095: Finish Resend DNS — DKIM, apex SPF, and tighter DMARC

**Status:** 📋 Open  
**Priority:** P2  
**Phase:** Billing & email audit (2026-11-22)  
**Created:** 2026-11-22  
**Depends on:** PP-096 (send a test message after DNS)

---

## Problem

Resend is the intended provider (`resend` in `requirements.txt`, `send.mypantryhub.com` MX/SPF in `deploy/terraform/main.tf`). Live public DNS as of 2026-11-22 (America/Chicago):

- Apex SPF is `v=spf1 include:_spf.mx.cloudflare.net ~all` — it does **not** include `amazonses.com`, even though the terraform file does
- `send.mypantryhub.com` SPF + MX (SES feedback) are in place
- `_dmarc.mypantryhub.com` is `p=none`
- No DKIM TXT/CNAME was published for common selectors (`resend._domainkey`, `s1._domainkey`, `s2._domainkey`, `send._domainkey`)

Terraform comments say DKIM is added from the Resend dashboard after domain verify. Until DKIM and apex SPF are correct, messages from `@mypantryhub.com` can fail or land in spam.

## Fix Plan

- [ ] Verify the domain in Resend and publish the DKIM records Resend shows (commit them in terraform once known)
- [ ] Align live apex SPF with terraform: include `amazonses.com` (keep Cloudflare email include if still needed)
- [ ] After a successful test send, tighten DMARC from `p=none` (quarantine first, then reject if clean)
- [ ] Confirm `dmarc-reports@mypantryhub.com` is a mailbox that is actually read, or change `rua`

## Acceptance Criteria

- [ ] Resend domain shows verified (SPF + DKIM)
- [ ] A test message from the chosen From address passes SPF and DKIM
- [ ] Terraform matches live DNS
- [ ] DMARC plan is documented and applied (or a dated reason to stay at `p=none`)
