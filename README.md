# PantryPal

Smart pantry inventory and ledger — Next.js 16 + FastAPI + PostgreSQL 16.

## Quick start

```bash
git clone <repo-url> pantry-pal && cd pantry-pal

# Node 22 + Python 3.11
npm ci
python3.11 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

cp .env.example .env.dev
./switch-env.sh dev
# Fill Clerk, Stripe, Gemini keys in .env.dev

docker compose up -d db
npm run migrate

npm run dev
```

| Service | URL |
|---------|-----|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:8000 |
| Health | http://localhost:8000/health |

## Monorepo layout

```
pantry-pal/
├── frontend/          # Next.js 16 App Router
├── backend/           # FastAPI (Python 3.11)
├── backend-legacy/    # Archived Express (reference only)
├── database/          # SQL migrations + migrate.py
├── deploy/            # OVH deploy script + nginx template
├── docs/legacy/       # Vite SPA archive, Railway docs
└── .agents/           # Refactor tickets (PP-XXX)
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Frontend + backend (hot reload) |
| `npm run check` | typecheck + lint + unit + contract tests |
| `npm run build:frontend` | Next.js production build |
| `npm run migrate` | Apply database migrations |
| `npm run test:postgres` | Postgres integration (needs `docker compose up -d db`) |
| `npm run test:sql-safety` | Static SQL safety guard |
| `npm run openapi:export` | Regenerate `openapi.json` |

## Environment

Use `./switch-env.sh dev|prod` to symlink `.env`. See `.env.example` for all keys.

- `NEXT_PUBLIC_*` — frontend (Clerk, API URL, Gemini)
- `DATABASE_URL` — PostgreSQL (primary store)
- `CLERK_SECRET_KEY`, `STRIPE_*` — backend secrets

## Docker

```bash
docker network create app-network  # once
docker compose up --build
```

## Agents

See [AGENTS.md](./AGENTS.md) and [.agents/TICKET_STATUS.md](./.agents/TICKET_STATUS.md).

## Design

Kitchen utility aesthetic (emerald/sage) — [DESIGN.md](./DESIGN.md).