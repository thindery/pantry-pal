# PantryPal Refactor Plan — Monorepo + Playbook Alignment

**Created:** 2026-07-10  
**Domain:** TBD (purchase pending)  
**Gold standards:** `markdown-pdf`, `userkudos`, `agent-paige`  
**Playbooks:** `project-director`  
**Source repos (pre-merge):** `pantry-pal` (Vite SPA) + `pantry-pal-api` (Express)

---

## Goals

1. **Single product repo** — only `pantry-pal`; API lives inside it; archive `pantry-pal-api`.
2. **Portfolio layout** — same conventions as markdown-pdf / userkudos:
   - `frontend/` (Next.js 16 end state)
   - `backend/` (FastAPI end state; Express interim)
   - `database/`, `deploy/`, `docker-compose.yml`, `switch-env.sh`
3. **OVH-ready** — Docker Compose + nginx templates + deploy script; domain cutover when purchased.
4. **Off Railway** — decommission Railway after local monorepo is solid (PP-035).
5. **Ticket-driven work** — all implementation tracked in `.agents/tickets/` (this folder).

---

## End-state stack (Phase 3 complete)

| Layer | Target |
|-------|--------|
| Frontend | Next.js **16.2**, React **19**, Tailwind **4**, `@clerk/nextjs` |
| Backend | FastAPI + uvicorn (Python 3.11), Zod-equivalent Pydantic v2 |
| Database | PostgreSQL **16** (`DATABASE_URL`); SQLite only for contract tests |
| Auth | Clerk (JWT middleware, webhook sync) |
| Payments | Stripe (checkout + webhooks) |
| Runtime | Node **22** (frontend Docker), `python:3.11-slim` (backend) |
| Hosting | OVH Docker + central nginx (domain TBD) |
| Quality | CI typecheck/tests, deploy version toast, security audit |

**Interim (Phase 1–2):** Vite React SPA in `frontend/` + Express in `backend/` so the monorepo and Docker path work before rewrites.

---

## Target tree

```
pantry-pal/
├── .agents/
│   ├── TICKET_STATUS.md
│   ├── REFACTOR_PLAN.md          ← this file
│   ├── PLAYBOOK_COMPLIANCE.md
│   ├── docs/
│   └── tickets/                  ← PP-XXX.md
├── AGENTS.md
├── README.md
├── DESIGN.md
├── .env.example
├── switch-env.sh
├── docker-compose.yml
├── Dockerfile.backend
├── frontend/
│   ├── Dockerfile
│   ├── package.json
│   └── …                         ← Next 16 (after PP-020+)
├── backend/
│   ├── …                         ← FastAPI (after PP-026+)
├── database/
│   └── migrations/
├── deploy/
│   ├── deploy-docker.sh
│   └── nginx/pantry-pal.conf
├── docs/
└── tests/                        ← optional root contract tests
```

---

## Phases & ticket map

### Phase 0 — Bootstrap

| Ticket | Title |
|--------|-------|
| [PP-000](tickets/PP-000-agents-ticket-scaffold.md) | Scaffold `.agents/` tickets + refactor plan |

### Phase 1 — Monorepo merge (keep Vite + Express)

| Ticket | Title |
|--------|-------|
| [PP-001](tickets/PP-001-monorepo-layout.md) | Monorepo layout: `frontend/` + `backend/` clean copy |
| [PP-002](tickets/PP-002-root-scripts-workspaces.md) | Root scripts / workspaces / single dev entry |
| [PP-003](tickets/PP-003-env-and-gitignore.md) | Env templates + gitignore portfolio standard |
| [PP-004](tickets/PP-004-docs-agents-readme.md) | AGENTS.md + README monorepo rewrite |
| [PP-005](tickets/PP-005-archive-api-repo-portfolio.md) | Archive pantry-pal-api + project-director map |
| [PP-006](tickets/PP-006-smoke-tests-monorepo.md) | Smoke: install, typecheck, unit tests both packages |

### Phase 2 — Playbook structure (Docker / env / OVH scaffold)

| Ticket | Title |
|--------|-------|
| [PP-010](tickets/PP-010-docker-compose-postgres.md) | docker-compose: frontend + backend + PG 16 |
| [PP-011](tickets/PP-011-dockerfiles-node22.md) | Multi-stage Dockerfiles (Node 22 interim backend) |
| [PP-012](tickets/PP-012-switch-env.md) | switch-env.sh + env var conventions |
| [PP-013](tickets/PP-013-deploy-script.md) | deploy/deploy-docker.sh scaffold |
| [PP-014](tickets/PP-014-nginx-template.md) | nginx vhost template (placeholder domain) |
| [PP-015](tickets/PP-015-ci-pipeline.md) | GitHub Actions CI (Node 22 + both packages) |
| [PP-016](tickets/PP-016-postgres-first.md) | Postgres-first DATABASE_URL; SQLite tests only |
| [PP-017](tickets/PP-017-global-rules-audit.md) | Global rules compliance audit |
| [PP-018](tickets/PP-018-remove-railway-docs.md) | Remove/replace Railway-centric deploy docs |

### Phase 3 — Gold-standard stack modernization

| Ticket | Title |
|--------|-------|
| [PP-020](tickets/PP-020-scaffold-next16.md) | Scaffold Next 16 frontend (templates + markdown-pdf) |
| [PP-021](tickets/PP-021-port-spa-to-next.md) | Port Vite SPA routes/views into App Router |
| [PP-022](tickets/PP-022-clerk-nextjs.md) | Clerk Next.js + middleware JWT pattern |
| [PP-023](tickets/PP-023-modularize-app-tsx.md) | Split App.tsx god component |
| [PP-024](tickets/PP-024-tailwind4-design.md) | Tailwind 4 + design system alignment |
| [PP-025](tickets/PP-025-deploy-version-toast.md) | Frontend deploy version toast |
| [PP-026](tickets/PP-026-fastapi-backend.md) | Express → FastAPI backend port |
| [PP-027](tickets/PP-027-openapi-types.md) | OpenAPI export + frontend type generation |
| [PP-028](tickets/PP-028-stripe-billing-fastapi.md) | Stripe billing + webhooks on FastAPI |
| [PP-029](tickets/PP-029-database-migrations.md) | database/migrations + migrate.py pattern |
| [PP-030](tickets/PP-030-rate-limiting.md) | Rate limiting production patterns |
| [PP-031](tickets/PP-031-seo-aeo.md) | SEO / social / AEO metadata baseline |
| [PP-032](tickets/PP-032-security-audit.md) | Pre-OVH security audit |
| [PP-033](tickets/PP-033-domain-cloudflare-dns.md) | Domain purchase + Cloudflare DNS (**blocked**) |
| [PP-034](tickets/PP-034-ovh-production-cutover.md) | OVH production cutover (**blocked on domain**) |
| [PP-035](tickets/PP-035-decommission-railway.md) | Decommission Railway |

---

## Dependency DAG

```
PP-001 → PP-002 → PP-003 → PP-004 → PP-006 → PP-005
                ↘
                  PP-010 → PP-011 → PP-012 → PP-013 → PP-014
                         → PP-015 → PP-016 → PP-017 → PP-018

PP-006 ──────────────────────────────────────────────┐
                                                     ↓
PP-020 → PP-021 → PP-022 → PP-023 → PP-024 → PP-025
                ↘
PP-016 → PP-026 → PP-027 → PP-028 → PP-029 → PP-030
                         → PP-031 → PP-032
                                    ↓
              PP-033 (domain) → PP-034 (OVH live) → PP-035 (kill Railway)
```

---

## Conventions (match portfolio)

- **Ticket IDs:** `PP-XXX`
- **Branches:** `feature/PP-XXX-brief-description`
- **Commits:** `PP-XXX: description`
- **Status file:** update `.agents/TICKET_STATUS.md` when starting/closing tickets
- **Playbooks:** read linked playbook before implementing playbook tickets
- **No secrets** in tickets or docs — placeholders only
- **Domain:** leave placeholders (`pantry-pal.example` / `YOUR_DOMAIN`) until PP-033

---

## Explicit non-goals (until tickets say otherwise)

- Buying/configuring production domain before PP-033
- Live OVH traffic before PP-034
- Feature product work unrelated to refactor (new pantry features)

---

## Decision log

| Date | Decision |
|------|----------|
| 2026-07-10 | Do all 3 phases |
| 2026-07-10 | Layout matches markdown-pdf/userkudos (`frontend/` + `backend/`) |
| 2026-07-10 | Clean copy of API (no git history import) |
| 2026-07-10 | Leave Railway; prepare OVH; domain TBD |
| 2026-07-10 | Track work in `.agents/tickets` like agent-paige / userkudos |
