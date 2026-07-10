# PP-019: Postgres integration tests + linting standards

**Status:** 🔄 To Do  
**Priority:** P0  
**Phase:** 2 — Playbook structure (do when monorepo + compose are green)  
**Playbooks:**  
- `project-director/playbooks/postgresql_integration_testing.md`  
- `project-director/playbooks/portfolio_stack_baseline.md`  
- `project-director/rules/global_rules.md` (TS/lint standards)  
**Created:** 2026-07-10  
**Depends on:** PP-001 (monorepo), PP-010 (compose + PG), PP-007 (local unit gate)  
**Blocks:** PP-034 (OVH cutover should not ship without PG integration in CI)  
**Related:** PP-015 (CI wires these jobs), PP-016 (Postgres-first config), PP-026 (FastAPI port — re-home tests as needed)

---

## Description

PantryPal already has a **local pre-commit unit gate** (PP-007: typecheck + lint errors + Vitest). That is **not** enough for production Postgres.

This ticket is the portfolio three-layer safety net + linting maturity — implement **when monorepo layout and Docker Postgres exist**, not before.

Gold standard: `markdown-pdf` (`tests/test_postgres_integration.py`, SQL upsert guard, CI postgres job, deploy gate).

**Do not start this ticket until:**
1. API lives under monorepo `backend/` (PP-001+)
2. `docker-compose` has `postgres:16` (PP-010)
3. App can run against `DATABASE_URL` (PP-016)

---

## Part A — PostgreSQL integration testing

### Acceptance Criteria

#### Layer 1 — Static SQL safety (fast, no Docker)
- [ ] Static guard for unsafe SQL patterns that fail on Postgres but pass on SQLite  
  - Especially unqualified `ON CONFLICT … DO UPDATE SET col = col + …` style upserts  
  - For Express interim: scan `backend/**/*.{ts,js}` SQL strings / query builders  
  - For FastAPI (after PP-026): match markdown-pdf `test_sql_upsert_safety.py` on `backend/**/*.py`
- [ ] Runnable via `npm run test:sql-safety` (or `pytest …`) in &lt; few seconds
- [ ] Optional: hook into pre-commit **only if** it stays fast (unit suite already runs there)

#### Layer 2 — Postgres integration suite
- [ ] Integration tests that hit a real Postgres 16 instance (`RUN_POSTGRES_TESTS=1` + `DATABASE_URL`)
- [ ] Cover critical write paths (not just mocked unit tests), e.g.:
  - Item create / update / quantity adjust
  - Activity log writes
  - Any upsert / conflict paths (subscriptions, barcode cache, usage counters)
  - Migrations apply cleanly on empty DB
- [ ] Tests isolated (ephemeral DB or truncated schemas); safe to re-run
- [ ] Documented local run:

```bash
docker compose up -d db
export RUN_POSTGRES_TESTS=1
export DATABASE_URL=postgresql://…@localhost:5432/pantry_pal_test
npm run test:postgres   # or pytest equivalent after FastAPI
```

#### Layer 3 — CI + deploy gate
- [ ] CI job (owned with PP-015) with Postgres service container runs integration suite on every PR
- [ ] Deploy script gate (PP-013) can run integration tests against ephemeral PG before cutover (align with markdown-pdf)
- [ ] SQLite remains allowed for **fast unit/contract** tests only — never as sole production confidence

### Out of scope for Part A
- Migrating production data
- Replacing all unit tests with integration tests
- Live OVH deploy (PP-034)

---

## Part B — Linting standards (monorepo-ready)

Local pre-commit already fails on **ESLint errors** (frontend). Mature the lint story when packages are split.

### Acceptance Criteria

- [ ] **Frontend** lint script stable under monorepo path (`frontend/`)
- [ ] **Backend** lint (or equivalent) for Express TS interim and/or Python (ruff/flake8) after FastAPI
- [ ] Root `npm run lint` (or workspace script) runs all package linters
- [ ] Document intentional warning budget vs errors:
  - Errors: fail pre-commit + CI
  - Warnings: track; optional follow-up for `--max-warnings=0` once noise is cleared
- [ ] ESLint config ignores build artifacts (`dist/`, `.next/`, coverage)
- [ ] CI lint job matches local (no “passes on laptop, fails on CI”)
- [ ] Optional later: `lint-staged` for faster commits (shipinaday pattern) — only if full suite stays in CI

### Out of scope for Part B
- Big-bang rewrite of 250+ existing frontend warnings
- Enabling `strictNullChecks` + fixing all fallout (separate ticket if needed)

---

## Suggested implementation order

```
PP-001 monorepo
  → PP-010 compose + PG
  → PP-016 DATABASE_URL default
  → PP-019 (this ticket): sql-safety + postgres integration suite + lint scripts
  → PP-015 CI: wire unit + lint + postgres integration jobs
  → PP-013 deploy gate uses same postgres tests
```

---

## Definition of done

- [ ] `npm run check` still green (unit gate)
- [ ] `npm run test:postgres` (or documented pytest) green against local PG 16
- [ ] SQL safety check green
- [ ] Lint scripts documented in README + AGENTS.md
- [ ] CI job exists or explicit handoff checklist completed inside PP-015
- [ ] Ticket status → Done; note any follow-ups (e.g. max-warnings=0)

---

## Log

- 2026-07-10: Ticket created — deferred until monorepo + Docker Postgres; captures portfolio PG integration + lint maturity so it is not forgotten
