# PP-023: Split App.tsx god component

**Status:** 🔄 To Do  
**Priority:** P0  
**Phase:** 3 — Modernization  
**Created:** 2026-07-10  
**Depends on:** PP-001 (can run after monorepo even before Next)  
**Blocks:** PP-021 (helps)

---

## Description

`App.tsx` is ~3000 lines. Extract views, hooks, and state into maintainable modules before/during Next port.

## Acceptance Criteria

- [ ] App.tsx (or Next layout equivalent) is a thin composition root
- [ ] Views: Dashboard, Inventory, Ledger, Scanner, Pricing, Admin as separate modules
- [ ] Shared hooks for inventory/API state where appropriate
- [ ] No behavior regressions on critical flows
- [ ] Easier code review / test surface for PP-021

## Log

- 2026-07-10: Ticket created
