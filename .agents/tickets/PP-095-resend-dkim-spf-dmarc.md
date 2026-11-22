# PP-095: Finish Resend DNS — DKIM, apex SPF, and tighter DMARC

**Status:** ✅ Done
**Priority:** P2
**Phase:** Billing & email audit (2026-11-22)
**Created:** 2026-11-22
**Completed:** 2026-11-22
**Depends on:** PP-096 (send a test message after DNS)

---

## Problem

Resend is the intended provider (`resend` in `requirements.txt`). Live public DNS as of the morning of 2026-11-22 (America/Chicago) was incomplete: no Resend DKIM, apex SPF was Cloudflare-only (terraform still listed `amazonses.com`), and `send.mypantryhub.com` still had Amazon SES MX/TXT from an earlier setup.

## What shipped

- A **new, separate free Resend account** for `mypantryhub.com` only (owner `hello@mypantryhub.com`, which forwards to Tylor via Cloudflare Email Routing). The existing `user-Resend` connector account (`justwithai.com`, `peak-collective.com`, `getmd2pdf.com`) was not used.
- Cloudflare DNS (DNS-only / not proxied):
  - `TXT resend._domainkey` — Resend DKIM
  - `CNAME send` → `send.forge.rmta.net`
  - `CNAME rsend` → `rsend.forge.rmta.net`
- Removed the conflicting SES records on `send` (MX `feedback-smtp.us-east-1.amazonses.com` and TXT `v=spf1 include:amazonses.com ~all`) so the Forge CNAME could exist. Apex MX (Cloudflare Email Routing), apex SPF (`include:_spf.mx.cloudflare.net` only), existing `_dmarc` (`p=none`), and `cf2024-1._domainkey` were left alone. No Resend receiving MX was added.
- Domain verified in Resend at 4:21 PM America/Chicago (DKIM + both Forge CNAMEs).
- Production env on OVH (names only): `RESEND_API_KEY` (send-only key `pantry-hub-backend`, restricted to `mypantryhub.com`) and `RESEND_FROM_EMAIL=Pantry Hub <hello@mypantryhub.com>`. Backend recreated; healthy.
- One test `send_payment_confirmation` (idempotency `invoice.paid:pp095-resend-test-20261122`) to `thindery@gmail.com` at 4:38 PM America/Chicago. Arrived in Gmail **Inbox** (not spam). Google `Authentication-Results`: `dkim=pass` (`@mypantryhub.com` / `s=resend`, plus SES), `spf=pass` (`rsend.mypantryhub.com`), `dmarc=pass` (`p=NONE`).
- Terraform in `deploy/terraform/main.tf` now matches live DNS. **Do not apply until a planned DNS change window** — records are already live.

## DMARC plan

Stay at `p=none` for now. The domain was just verified and we have one passing test; tighten to `quarantine` (then `reject` if reports stay clean) after a stretch of real transactional mail. `rua=mailto:dmarc-reports@mypantryhub.com` is already on the record (that address forwards through Cloudflare Email Routing).

## Acceptance Criteria

- [x] Resend domain shows verified (DKIM + Forge CNAMEs)
- [x] A test message from `Pantry Hub <hello@mypantryhub.com>` landed in the inbox and passed SPF, DKIM, and DMARC
- [x] Terraform matches live DNS (apply later; not run in this pass)
- [x] DMARC plan documented; stay at `p=none` until a clean stretch of mail
