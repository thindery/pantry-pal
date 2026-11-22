# PP-136: Promo or trial-ending reminder (only if relevant)

**Status:** 📋 Open
**Priority:** P2
**Phase:** Email design (2026-11-22)
**Created:** 2026-11-22
**Depends on:** PP-131
**Doc:** `.agents/docs/email-design-plan.md`

---

## Problem

The design plan includes a “trial ending” email, but the product does not currently use a Stripe trial. A $0 promo invoice leaves the subscription `active`. Building this mail before we can detect a real end date would be misleading.

## Fix Plan

- [ ] Implement only if we have `trialing` or a reliable “first paid renewal after a $0 promo is in N days” signal
- [ ] Short reminder ~3 days before, with the renewal amount and a manage-billing link
- [ ] PP-131 shell; preview to `thindery@gmail.com` only
- [ ] If that signal never exists, leave this ticket open with a dated note instead of inventing a trial

## Acceptance Criteria

- [ ] No “trial ending” mail ships to users who are simply `active`
- [ ] Copy does not invent a trial if the period is a promotion code
