# PP-137: Low-stock or expiring-items digest (only if relevant)

**Status:** 📋 Open
**Priority:** P3
**Phase:** Email design (2026-11-22)
**Created:** 2026-11-22
**Depends on:** PP-131
**Doc:** `.agents/docs/email-design-plan.md`

---

## Problem

A recurring “expiring items” digest would be useful only if we store expiration dates. `pantry_items` has quantity and in-app low-stock thresholds, but no expiry column. Sending an expiry digest now would be dishonest. A later **opt-in low-stock digest** may be worth it.

## Fix Plan

- [ ] Do not send an expiry digest until an expiration field exists and is populated
- [ ] If a low-stock digest is added: default off, user opt-in, unsubscribe required (this is not a billing receipt)
- [ ] Only include items at or below that user’s threshold; no invented counts
- [ ] Preview to `thindery@gmail.com` only

## Acceptance Criteria

- [ ] No digest is sent to all users by default
- [ ] Marketing-style recurring mail has unsubscribe; transactional mail does not start including it
