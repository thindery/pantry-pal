# Ralph Workflow Standards

## Process (Mandatory)

Every ticket MUST follow this flow:

```
To Research → In Dev → PR Created → Review → Merge → Closed
     ↑          ↑          ↑           ↑       ↑        ↑
   Ticket    Agent     GitHub      Tech    Deploy   Done
   Created   Spawned    Push       Review
```

## Branch Naming (Enforced)
- `feature/PP-XXX-description`
- `fix/PP-XXX-bug-name`
- `hotfix/CRITICAL-description`

## Commit Messages (Enforced)
Format: `PP-XXX: {description}`

Example:
```
PP-061: Quick scan flow - auto-add known items, toast with increment, modal for unknown

Implemented the interactive quick scan that bypasses confirmation:
- Auto-adds qty 1 for known products with toast feedback
- Shows modal only for unknown products to enter name
- Scanner stays active for next item
```

## Pre-Commit Checklist (Enforced via CI)
- [ ] `npm run check` passes (typecheck + lint + unit tests + backend tests)
- [ ] No TypeScript errors
- [ ] Branch includes ticket number (e.g., `PP-061`)
- [ ] Commit message references ticket (e.g., `PP-061: description`)

## Pre-Deploy Checklist (Enforced)
- [ ] `npm run test:sql-safety` passes (SQL injection safety)
- [ ] Backend contract tests pass
- [ ] Database migrations are compatible
- [ ] Branch is `main` or matches `feature/PP-*`

## Time Limits (Monitored)
- To Research → In Dev: 24 hours max
- In Dev → PR: 3 days max
- PR → Review: 1 day max
- Review → Merge: 2 days max

## Violations = Blocked
Any PR not following Ralph will fail CI checks.

## Auto-Actions
- Tickets >24h in To Research → Assigned to dev
- Tickets >3 days no PR → Escalated
- PRs >2 days no review → Auto-approved

---

**Note:** This project uses PantryPal ticket format (PP-XXX) not REMY or PAIGE.
Ticket status tracked in `.agents/TICKET_STATUS.md`.
