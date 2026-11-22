# PP-097: Send a welcome email on first sign-in

**Status:** 📋 Open  
**Priority:** P2  
**Phase:** Billing & email audit (2026-11-22)  
**Created:** 2026-11-22  
**Depends on:** PP-096

---

## Problem

Auth is NextAuth with Google OAuth. New sign-ins are only logged (`isNewUser` in `frontend/lib/auth.config.ts`). The app sends no welcome email. Google may email the Google account; Pantry Hub never does.

## Fix Plan

- [ ] When a new user is created, enqueue/send a short welcome message via the Resend helper
- [ ] Send at most once per user (idempotent on user id)
- [ ] Include a sign-in link to `www.mypantryhub.com` and the contact address `info@mypantryhub.com`
- [ ] Do not send again on later Google sign-ins

## Acceptance Criteria

- [ ] First successful sign-in delivers one welcome email
- [ ] A second sign-in does not send another
- [ ] Missing Resend config in production is visible in logs, not a crashed auth redirect
