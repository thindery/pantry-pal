# PP-129: Optional full-access Resend read key (needs Tylor’s yes)

**Status:** 📋 Backlog
**Priority:** P3
**Phase:** Marketing dashboard (2026-11-22)
**Created:** 2026-11-22
**Depends on:** Tylor’s explicit yes; PP-123–PP-124 should ship first
**Blocks:** —
**Design:** `.agents/docs/marketing-dashboard.md`

---

## Problem

The mypantryhub.com Resend account uses a **send-only** API key, which cannot list messages or read stats. That is the right default. PP-123 and PP-124 are the intended source of dashboard data (app DB + signed webhook).

A full-access (or read) key would only be useful as a fallback: backfilling historical stats, comparing our log to Resend, or opening deep links. It is not required for the Marketing section. **Do not mint or store this key until Tylor says yes.**

## Behavior (only after yes)

- Create a **separate** key in the mypantryhub Resend account with the minimum read permission available. Do not replace or widen the send-only key used by `RESEND_API_KEY`.
- Store the value on OVH / the Mini Keychain only. Add a placeholder name (for example `RESEND_READ_API_KEY`) to env templates, never a real value.
- The send path must keep using the send-only key.
- If used at all, use it from server-side admin code only, never from the browser.
- Prefer webhook + DB as the source of truth; treat Resend’s API as a cross-check.

## Acceptance Criteria

- [ ] Tylor has explicitly approved creating a read/full-access key
- [ ] The send-only key remains the only key used to send mail
- [ ] The read key is not committed, not logged, and not exposed to the client
- [ ] The Marketing dashboard still works if the read key is absent (PP-123–PP-124 data)
