# PP-133: Payment confirmation — what the plan unlocks

**Status:** ✅ Done
**Priority:** P1
**Phase:** Email design (2026-11-22)
**Created:** 2026-11-22
**Completed:** 2026-11-22
**Depends on:** PP-131, PP-098
**Doc:** `.agents/docs/email-design-plan.md`

---

## Problem

The live `payment_confirmation` mail (the one Tylor received) is factually correct and visually bare: “Your Pro plan is now active” plus a manage-billing link. It does not say what Pro or Family includes.

## Fix Plan

- [x] Keep receipt facts: plan name, amount or $0 promo wording, access-through date
- [x] Add a short “What’s included” list copied from the live pricing page (Pro vs Family). Do not add features, counts, or quotes that are not on that page
- [x] Primary CTA “Go to your pantry” → `/dashboard/`; secondary manage-billing link
- [x] Preview to `thindery@gmail.com` only

## Acceptance Criteria

- [x] $0 / promo and paid invoices both still use the right wording
- [x] Idempotency remains `invoice.paid:{invoice_id}`
- [x] Layout is the PP-131 shell; no invented social proof
