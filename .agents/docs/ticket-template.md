# Ticket template and priority

Every new Pantry Hub ticket (`PP-NNN` in `.agents/tickets/`) must include a priority in the header so Pantry Hub Lead can triage.

**Priority:** `P0` | `P1` | `P2` | `P3`

| Priority | Meaning |
|----------|---------|
| **P0** | Broken or blocking revenue/customers now. |
| **P1** | Next up, high impact. |
| **P2** | Soon. |
| **P3** | Someday. |

Open work is grouped by these four levels at the top of `.agents/TICKET_STATUS.md`. Do not invent a fifth label (for example "High"). Status (Open, Backlog, Done) is separate from priority.

## Template

```markdown
# PP-NNN: Short title

**Status:** 📋 Open
**Priority:** P2
**Phase:** …
**Created:** YYYY-MM-DD
**Depends on:** —
**Blocks:** —
**Doc:** `.agents/docs/…` (if there is one)

---

## Problem

Why this ticket exists.

## Behavior

What should change for the user or operator.

## Acceptance Criteria

- [ ] …
```

## Public recipe library

Standing rule (Tylor): every public recipe ships with its real WebP illustration at `frontend/public/recipes/<slug>.webp`, in the same pipeline as batches 1 and 2 (real-world food-photography look, about 1152×864, under ~150KB). Recipe JSON-LD includes the absolute `image` URL only when that file is present. **No placeholders may go live.** Add the image before or with the recipe's deploy, never in a follow-up after the page is already public.
