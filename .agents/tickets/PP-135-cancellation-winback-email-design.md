# PP-135: Cancellation and win-back email design

**Status:** 📋 Open
**Priority:** P2
**Phase:** Email design (2026-11-22)
**Created:** 2026-11-22
**Depends on:** PP-131, PP-100
**Doc:** `.agents/docs/email-design-plan.md`

---

## Problem

`cancellation_scheduled` and `subscription_ended` are plain status notices. They should stay honest about access dates and offer a clear keep/resubscribe path, without guilt copy.

## Fix Plan

- [ ] Scheduled: access through {period end}; CTA “Keep my plan” (reactivate / account)
- [ ] Ended: now on Free, and only list Free limits that are on the pricing page; CTA “Resubscribe” → `/pricing/`
- [ ] Still skip mail when a non-linked duplicate sub is canceled (PP-089 / PP-100)
- [ ] Preview to `thindery@gmail.com` only; no invented social proof

## Acceptance Criteria

- [ ] Both templates use the PP-131 shell and `hello@`
- [ ] Idempotency keys unchanged (`cancel.scheduled:` / `cancel.ended:`)
