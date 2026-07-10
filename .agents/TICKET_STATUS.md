# Ticket Status — PantryPal

Last updated: 2026-07-10 (PP-007)

**Product:** PantryPal — smart pantry inventory & ledger  
**Domain:** TBD (purchase pending)  
**Repos:** Dual repo → monorepo → gold-standard stack (Next 16 + FastAPI + PG 16 + OVH)  
**Gold standards:** `markdown-pdf`, `userkudos`, `agent-paige`  
**Playbooks:** `project-director`  
**Plan:** [REFACTOR_PLAN.md](./REFACTOR_PLAN.md) · [PLAYBOOK_COMPLIANCE.md](./PLAYBOOK_COMPLIANCE.md)

---

## Quick stats

| | Count |
|--|-------|
| Phase 0 done | 1 (PP-000) |
| Phase 1 open | 6 |
| Phase 2 open | 9 |
| Phase 3 open | 16 |
| Blocked (domain) | PP-033, PP-034 |
| Done | 2 |

---

## Phase 0 — Bootstrap

| Ticket | Title | Priority | Status |
|--------|-------|----------|--------|
| [PP-000](./tickets/PP-000-agents-ticket-scaffold.md) | Scaffold .agents tickets + refactor plan | P0 | ✅ Done |

## Phase 1 — Monorepo merge (Vite + Express interim)

| Ticket | Title | Priority | Status |
|--------|-------|----------|--------|
| [PP-007](./tickets/PP-007-pre-commit-quality-gate.md) | Pre-commit quality gate (typecheck + lint + tests) | P0 | ✅ Done |
| [PP-001](./tickets/PP-001-monorepo-layout.md) | Monorepo layout: frontend/ + backend/ clean copy | P0 | 🔄 To Do |
| [PP-002](./tickets/PP-002-root-scripts-workspaces.md) | Root scripts / workspaces / single dev entry | P0 | 🔄 To Do |
| [PP-003](./tickets/PP-003-env-and-gitignore.md) | Env templates + gitignore portfolio standard | P0 | 🔄 To Do |
| [PP-004](./tickets/PP-004-docs-agents-readme.md) | AGENTS.md + README monorepo rewrite | P0 | 🔄 To Do |
| [PP-005](./tickets/PP-005-archive-api-repo-portfolio.md) | Archive pantry-pal-api + portfolio map | P1 | 🔄 To Do |
| [PP-006](./tickets/PP-006-smoke-tests-monorepo.md) | Smoke: install, typecheck, unit tests | P0 | 🔄 To Do |

## Phase 2 — Playbook structure (Docker / env / OVH scaffold)

| Ticket | Title | Priority | Status |
|--------|-------|----------|--------|
| [PP-010](./tickets/PP-010-docker-compose-postgres.md) | docker-compose: frontend + backend + PG 16 | P0 | 🔄 To Do |
| [PP-011](./tickets/PP-011-dockerfiles-node22.md) | Multi-stage Dockerfiles (Node 22 interim) | P0 | 🔄 To Do |
| [PP-012](./tickets/PP-012-switch-env.md) | switch-env.sh + env conventions | P0 | 🔄 To Do |
| [PP-013](./tickets/PP-013-deploy-script.md) | deploy/deploy-docker.sh scaffold | P0 | 🔄 To Do |
| [PP-014](./tickets/PP-014-nginx-template.md) | nginx vhost template (placeholder domain) | P0 | 🔄 To Do |
| [PP-015](./tickets/PP-015-ci-pipeline.md) | GitHub Actions CI (Node 22) | P0 | 🔄 To Do |
| [PP-016](./tickets/PP-016-postgres-first.md) | Postgres-first DATABASE_URL | P0 | 🔄 To Do |
| [PP-017](./tickets/PP-017-global-rules-audit.md) | Global rules compliance audit | P0 | 🔄 To Do |
| [PP-018](./tickets/PP-018-remove-railway-docs.md) | Remove/replace Railway deploy docs | P1 | 🔄 To Do |

## Phase 3 — Gold-standard modernization

| Ticket | Title | Priority | Status |
|--------|-------|----------|--------|
| [PP-020](./tickets/PP-020-scaffold-next16.md) | Scaffold Next 16 frontend | P0 | 🔄 To Do |
| [PP-021](./tickets/PP-021-port-spa-to-next.md) | Port Vite SPA → App Router | P0 | 🔄 To Do |
| [PP-022](./tickets/PP-022-clerk-nextjs.md) | Clerk Next.js + JWT middleware | P0 | 🔄 To Do |
| [PP-023](./tickets/PP-023-modularize-app-tsx.md) | Split App.tsx god component | P0 | 🔄 To Do |
| [PP-024](./tickets/PP-024-tailwind4-design.md) | Tailwind 4 + design system | P1 | 🔄 To Do |
| [PP-025](./tickets/PP-025-deploy-version-toast.md) | Deploy version toast | P1 | 🔄 To Do |
| [PP-026](./tickets/PP-026-fastapi-backend.md) | Express → FastAPI backend port | P0 | 🔄 To Do |
| [PP-027](./tickets/PP-027-openapi-types.md) | OpenAPI + frontend types | P2 | 🔄 To Do |
| [PP-028](./tickets/PP-028-stripe-billing-fastapi.md) | Stripe billing on FastAPI | P0 | 🔄 To Do |
| [PP-029](./tickets/PP-029-database-migrations.md) | database migrations (Python) | P0 | 🔄 To Do |
| [PP-030](./tickets/PP-030-rate-limiting.md) | Rate limiting production | P1 | 🔄 To Do |
| [PP-031](./tickets/PP-031-seo-aeo.md) | SEO / social / AEO baseline | P1 | 🔄 To Do |
| [PP-032](./tickets/PP-032-security-audit.md) | Pre-OVH security audit | P0 | 🔄 To Do |
| [PP-033](./tickets/PP-033-domain-cloudflare-dns.md) | Domain + Cloudflare DNS | P0 | ⏸️ Blocked (domain) |
| [PP-034](./tickets/PP-034-ovh-production-cutover.md) | OVH production cutover | P0 | ⏸️ Blocked (domain) |
| [PP-035](./tickets/PP-035-decommission-railway.md) | Decommission Railway | P1 | 🔄 To Do |

---

## Suggested start order

1. **PP-001** → **PP-002** → **PP-003** → **PP-006** (get monorepo green)
2. **PP-004** (docs) in parallel with smoke fixes
3. **PP-010** → **PP-011** → **PP-012** → **PP-015** → **PP-016**
4. **PP-013** / **PP-014** (deploy scaffold, no live domain needed)
5. **PP-020+** Next migration and **PP-026+** FastAPI (can parallel after monorepo stable)
6. **PP-033** when domain purchased → **PP-034** → **PP-035**

---

## Working rules

1. Read [REFACTOR_PLAN.md](./REFACTOR_PLAN.md) and linked playbook before coding.
2. Branch: `feature/PP-XXX-brief-description`
3. Commit: `PP-XXX: description`
4. Update this file when ticket status changes.
5. Do not start PP-033/034 until domain is purchased.
6. Prefer clean, reversible steps; keep product runnable after each Phase 1–2 ticket.

---

## Quick links

- [REFACTOR_PLAN.md](./REFACTOR_PLAN.md)
- [PLAYBOOK_COMPLIANCE.md](./PLAYBOOK_COMPLIANCE.md)
- [project-director](../../project-director/README.md)
- Legacy root docs: `../README.md`, `../DESIGN.md`, `../TECH_REVIEW.md`
