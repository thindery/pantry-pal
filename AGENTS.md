# AGENTS.md — PantryPal

> **Global rules:** Read [`project-director/rules/global_rules.md`](../project-director/rules/global_rules.md) before any work.  
> **Tickets:** All refactor work is tracked in [`.agents/TICKET_STATUS.md`](.agents/TICKET_STATUS.md).  
> **Plan:** [`.agents/REFACTOR_PLAN.md`](.agents/REFACTOR_PLAN.md) · [`.agents/PLAYBOOK_COMPLIANCE.md`](.agents/PLAYBOOK_COMPLIANCE.md)

## Product

**PantryPal** is a smart pantry inventory & ledger app: inventory CRUD, activity ledger, barcode scanning, AI receipt/usage scanning, Clerk auth, Stripe subscriptions, admin dashboard.

## Current vs target architecture

| | **Today (pre-refactor)** | **Target (after PP-001…PP-035)** |
|--|--------------------------|----------------------------------|
| Repos | `pantry-pal` + sibling `pantry-pal-api` | **Single** `pantry-pal` monorepo |
| Frontend | Vite + React 19 SPA | Next.js **16** App Router + React **19** + Tailwind **4** |
| Backend | Express (separate repo) | FastAPI under `backend/` |
| DB | SQLite local / Postgres dual | PostgreSQL **16** primary |
| Hosting | Railway-oriented docs | OVH Docker (domain TBD) |

**Interim after Phase 1:** monorepo with `frontend/` (Vite) + `backend/` (Express clean copy). Do not leave dual-repo path hacks (`../pantry-pal-api`).

## Layout (target)

```
pantry-pal/
├── .agents/           # tickets, status, audits
├── frontend/          # Next 16 (Vite until PP-020+)
├── backend/           # FastAPI (Express until PP-026+)
├── database/          # SQL migrations
├── deploy/            # deploy-docker.sh, nginx
├── docker-compose.yml
├── switch-env.sh
├── AGENTS.md
├── DESIGN.md
└── README.md
```

## Quality gate (pre-commit)

Husky runs **`npm run check`** on every commit:

```bash
npm run typecheck   # tsc --noEmit
npm run lint        # ESLint (errors fail; warnings allowed for now)
npm run test:run    # Vitest unit suite
```

- Local verify: `npm run check`
- CI-style (includes frontend build): `npm run check:ci`
- Do **not** use `--no-verify` unless explicitly agreed — fix the failure instead.

## Ticket workflow

1. Open [`.agents/TICKET_STATUS.md`](.agents/TICKET_STATUS.md) and pick the next open ticket in dependency order.
2. Read the ticket file and any linked playbook under `project-director/playbooks/`.
3. Branch: `feature/PP-XXX-brief-description`
4. Commit: `PP-XXX: description`
5. Update ticket status + `TICKET_STATUS.md` when done.

**Next monorepo work:** [PP-001](.agents/tickets/PP-001-monorepo-layout.md) (after PP-007 quality gate is merged).

## Domain

Domain not purchased yet. Use placeholders until [PP-033](.agents/tickets/PP-033-domain-cloudflare-dns.md). Do not hardcode a production hostname.

## Gold standards

- Structure/deploy: `markdown-pdf`, `userkudos`
- Next app patterns: `agent-paige`, `shipinaday`
- Stack versions: `project-director/playbooks/portfolio_stack_baseline.md`

## What not to do

- Do not keep developing against standalone `pantry-pal-api` as source of truth after monorepo merge
- Do not commit secrets (`.env`, keys, tokens)
- Do not start OVH live cutover (PP-034) before domain (PP-033) and security audit (PP-032)
- Do not expand product features mid-refactor unless filed as separate tickets

## Design

See [DESIGN.md](./DESIGN.md) — kitchen utility (emerald/sage), mobile-first, distinct marketing / dashboard / admin surfaces.
