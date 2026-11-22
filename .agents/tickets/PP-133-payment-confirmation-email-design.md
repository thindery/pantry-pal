# PP-133: Payment confirmation — what the plan unlocks

**Status:** 📋 Open
**Priority:** P1
**Phase:** Email design (2026-11-22)
**Created:** 2026-11-22
**Depends on:** PP-131, PP-098
**Doc:** `.agents/docs/email-design-plan.md`

---

## Problem

The live `payment_confirmation` mail (the one Tylor received) is factually correct and visually bare: “Your Pro plan is now active” plus a manage-billing link. It does not say what Pro or Family includes.

## Fix Plan

- [ ] Keep receipt facts: plan name, amount or $0 promo wording, access-through date
- [ ] Add a short “What’s included” list copied from the live pricing page (Pro vs Family). Do not add features, counts, or quotes that are not on that page
- [ ] Primary CTA “Go to your pantry” → `/dashboard/`; secondary manage-billing link
- [ ] Preview to `thindery@gmail.com` only

## Acceptance Criteria

- [ ] $0 / promo and paid invoices both still use the right wording
- [ ] Idempotency remains `invoice.paid:{invoice_id}`
- [ ] Layout is the PP-131 shell; no invented social proof
