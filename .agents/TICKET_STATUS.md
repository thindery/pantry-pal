# Ticket Status — Pantry Hub

Last updated: 2026-07-24 (PP-068/070/071/073/074 security hygiene)

**Product:** Pantry Hub (Peak Collective LLC dba Pantry Hub) — smart pantry inventory & ledger  
**Domain:** **mypantryhub.com** (canonical: `www.mypantryhub.com`)  
**Stack:** Next 16 + FastAPI + PG 16 monorepo → OVH Docker  
**Gold standards:** `markdown-pdf`, `userkudos`, `agent-paige`

---

## Quick stats

| | Count |
|--|-------|
|| Done | 51+ |
|| In progress | 0 |
|| Ready | 0 |
|| Security open | 2 (PP-067 CSP, PP-072 design-system) |
|| User action pending | Deploy security fixes to OVH (nginx + TRUST_PROXY + security.txt) |

---

## Phase 0 — Bootstrap

| Ticket | Title | Status |
|--------|-------|--------|
| PP-000 | Scaffold .agents tickets + refactor plan | ✅ Done |

## Phase 1 — Monorepo merge

| Ticket | Title | Status |
|--------|-------|--------|
| PP-007 | Pre-commit quality gate | ✅ Done |
| PP-001 | Monorepo layout | ✅ Done |
| PP-002 | Root scripts / workspaces | ✅ Done |
| PP-003 | Env templates + gitignore | ✅ Done |
| PP-004 | AGENTS.md + README rewrite | ✅ Done |
| PP-005 | Archive pantry-pal-api + portfolio map | ✅ Done |
| PP-006 | Smoke: install, typecheck, unit tests | ✅ Done |

## Phase 2 — Playbook structure

| Ticket | Title | Status |
|--------|-------|--------|
| PP-010 | docker-compose + PG 16 | ✅ Done |
| PP-011 | Multi-stage Dockerfiles | ✅ Done |
| PP-012 | switch-env.sh | ✅ Done |
| PP-013 | deploy/deploy-docker.sh | ✅ Done |
| PP-014 | nginx vhost template | ✅ Done |
| PP-015 | GitHub Actions CI | ✅ Done |
| PP-016 | Postgres-first DATABASE_URL | ✅ Done |
| PP-017 | Global rules compliance audit | ✅ Done |
| PP-018 | Remove Railway deploy docs | ✅ Done (moved to docs/legacy/railway/) |
| PP-019 | Postgres integration + linting | ✅ Done |

## Phase 3 — Gold-standard modernization

| Ticket | Title | Status |
|--------|-------|--------|
| PP-020 | Scaffold Next 16 frontend | ✅ Done |
| PP-021 | Port Vite SPA → App Router | ✅ Done |
| PP-022 | Clerk Next.js + middleware | ✅ Done |
| PP-023 | Split App.tsx god component | ✅ Done |
| PP-024 | Tailwind 4 + design system | ✅ Done |
| PP-025 | Deploy version toast | ✅ Done |
| PP-026 | Express → FastAPI backend | ✅ Done |
| PP-027 | OpenAPI + frontend types | ✅ Done (`openapi.json`) |
| PP-028 | Stripe billing on FastAPI | ✅ Done |
| PP-029 | database migrations (Python) | ✅ Done |
| PP-030 | Rate limiting | ✅ Done (in-memory) |
| PP-031 | SEO / social / AEO baseline | ✅ Done |
| PP-032 | Pre-OVH security audit | ✅ Done |
| PP-033 | Domain + Cloudflare DNS | ✅ Done |
| PP-034 | OVH production cutover | ✅ Done |
| PP-035 | Decommission Railway | ✅ Done |

> **Note:** PP-021 and PP-026 are marked done for the core migration, but acceptance criteria remain incomplete — tracked in follow-up tickets PP-036 (missing FastAPI routes) and PP-039 (migration 013 + ticket sync).

## Phase 3 — Post-migration fixes (audit follow-ups)

| Ticket | Title | Status |
|--------|-------|--------|
| PP-036 | Port missing FastAPI routes | ✅ Done |
| PP-037 | Deploy, Docker, env, and test fixes | ✅ Done |
| PP-038 | Security and validation hardening | ✅ Done |
| PP-039 | Migration 013 + ticket status sync | ✅ Done |

## Phase 3 — Brand & polish

| Ticket | Title | Status |
|--------|-------|--------|
| PP-040 | Brand consolidation — Pantry Hub (DBA) | ✅ Done |
| PP-041 | Marketing pages & legal links audit | ✅ Done |
| PP-042 | Dashboard UX & design kit — designer handoff | ✅ Approved |
| PP-043 | Dashboard UI implementation | ✅ Done |
| PP-044 | nginx API routing through Next.js (JWT auth) | ✅ Done |

## Phase 3 — Security remediation (audit 2026-07-11)

**Report:** `.agents/docs/security_audit_2026-07-11.md`  
**Playbook:** `project-director/playbooks/agent_paige_security_audit.md`  
**Risk posture:** MEDIUM (no IDOR; economic abuse + headers gaps)

| Ticket | Title | Priority | Status |
|--------|-------|----------|--------|
| PP-045 | Proxy Gemini API server-side | P0 | ❌ Cancelled → PP-058 |
| PP-046 | Enforce AI/voice quotas on backend | P1 | ❌ Cancelled → PP-058 |
| PP-047 | Server-side item tier limits | P1 | ✅ Done |
| PP-048 | Harden client-errors ingestion | P1 | ✅ Done |
| PP-049 | Validate Stripe redirect URLs | P1 | ✅ Done |
| PP-050 | Remove public admin email env | P2 | ✅ Done |
| PP-051 | Add HSTS + CSP headers | P2 | ✅ Done |
| PP-052 | Postgres rate limiting | P2 | ✅ Done |
| PP-053 | Validate receiptUrl | P2 | ✅ Done |
| PP-054 | Restrict /health exposure | P2 | ✅ Done |
| PP-055 | Sanitize API error responses | P3 | ✅ Done |
| PP-056 | Stripe webhook signature tests | P3 | ✅ Done |
| PP-057 | JWT aud + OAuth linking hardening | P3 | ✅ Done |
| PP-058 | Decommission Gemini client integration | P0 | ✅ Done |
| PP-059 | Research voice/usage without AI tokens | P2 | ✅ Done |

**Remaining:** Security remediation complete — schedule follow-up re-audit; optional PP-060/PP-061 from voice-usage research

## Phase 3 — Security re-audit (2026-07-25)

**Report:** `.agents/security_audit_2026-07-25.md`  
**Playbook:** `agent_paige_security_audit.md` + `ovh_security_baseline.md`  
**Risk posture:** LOW–MEDIUM (no IDOR; residual CSP/CI/ops)

| Ticket | Title | Priority | Status |
|--------|-------|----------|--------|
| PP-065 | Shopping-session add-to-inventory tier limits | P1 | ✅ Done |
| PP-066 | Shorten API bearer JWT TTL to 1h | P1 | ✅ Done |
| PP-067 | Tighten CSP (unsafe-eval/inline) | P2 | 📋 Open |
| PP-068 | Gitleaks secret scan in CI | P2 | ✅ Done |
| PP-069 | Sanitize Stripe webhook error responses | P2 | ✅ Done |
| PP-070 | nginx require-cloudflare include (ops) | P2 | ✅ Done (template; host reload pending deploy) |
| PP-071 | Trusted proxy IP for rate limiting | P2 | ✅ Done |
| PP-072 | Gate public design-system | P3 | 📋 Open |
| PP-073 | Add security.txt | P3 | ✅ Done (live 200 after deploy) |
| PP-074 | Remove/harden Clerk JWT fallback | P3 | ✅ Done |

**Ship:** Deploy main so production picks up PP-065–074 (nginx require-cloudflare, TRUST_PROXY=1, security.txt).

---

## Verification

```bash
npm run check          # typecheck + lint + 3 vitest + 28 pytest
npm run test:sql-safety
npm run test:postgres  # requires docker compose up -d db
npm run build:frontend
```

## Next steps (human)

1. **PP-033:** `cd deploy/terraform && terraform apply` · Cloudflare SSL Full · Clerk/Stripe prod URLs
2. **PP-034:** Copy `.env.prod.example` → `.env.prod` on OVH · install nginx vhost · `./deploy/deploy-docker.sh main`
3. **PP-035:** Stop Railway services after production smoke passes

See **`deploy/CUTOVER.md`** for the full checklist.