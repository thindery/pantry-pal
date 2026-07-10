# AGENTS.md — PantryPal

> **Global rules:** Read [`project-director/rules/global_rules.md`](../project-director/rules/global_rules.md) before any work.  
> **Tickets:** [`.agents/TICKET_STATUS.md`](.agents/TICKET_STATUS.md)  
> **Plan:** [`.agents/REFACTOR_PLAN.md`](.agents/REFACTOR_PLAN.md)

## Product

**PantryPal** — smart pantry inventory & ledger: inventory CRUD, activity ledger, barcode scanning, AI receipt/usage scanning, Clerk auth, Stripe subscriptions, admin dashboard.

## Stack (current)

| Layer | Technology |
|-------|------------|
| Frontend | Next.js **16.2**, React **19**, Tailwind **4**, `@clerk/nextjs` |
| Backend | FastAPI + uvicorn (Python **3.11**) |
| Database | PostgreSQL **16** (`DATABASE_URL`) |
| Auth | Clerk JWT middleware |
| Payments | Stripe checkout + webhooks |
| Hosting (target) | OVH Docker + nginx (domain TBD) |

**Legacy reference:** `backend-legacy/` (Express), `docs/legacy/vite-spa/` (Vite SPA).

## Layout

```
pantry-pal/
├── .agents/           # tickets, status, audits
├── frontend/          # Next 16 App Router
├── backend/           # FastAPI routers + services
├── database/          # migrations + migrate.py
├── deploy/            # deploy-docker.sh, nginx
├── docker-compose.yml
├── switch-env.sh
└── openapi.json
```

## Quality gate

```bash
npm run check   # typecheck + lint + vitest + pytest
```

Husky pre-commit runs `npm run check`. Requires `.venv` with `pip install -r requirements.txt`.

## Ticket workflow

1. Pick next open ticket in [`.agents/TICKET_STATUS.md`](.agents/TICKET_STATUS.md)
2. Branch: `feature/PP-XXX-brief-description`
3. Commit: `PP-XXX: description`
4. Update ticket status when done

## Domain

Domain not purchased yet (PP-033). Use placeholders — do not hardcode production hostnames.

## Gold standards

- `markdown-pdf`, `userkudos`, `agent-paige`
- Playbooks: `project-director/playbooks/`

## What not to do

- Do not develop against standalone `pantry-pal-api` (archived)
- Do not commit secrets
- Do not start OVH live cutover (PP-034) before domain (PP-033) and security audit (PP-032)