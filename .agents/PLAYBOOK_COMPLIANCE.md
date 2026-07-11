# Playbook Compliance — PantryPal

**Gold standard:** `markdown-pdf`  
**Reference also:** `userkudos`, `agent-paige`  
**Server (target):** OVH `15.204.254.25` (`ssh ovh`)  
**Domain:** TBD  
**Status:** Refactor epic — Phases 1–3

Agents must read the linked playbook before starting each ticket.

| Ticket | Playbook / rule | Phase | Priority |
|--------|-----------------|-------|----------|
| [PP-017](tickets/PP-017-global-rules-audit.md) | `rules/global_rules.md` | 2 | P0 |
| [PP-001](tickets/PP-001-monorepo-layout.md) | `playbooks/new_project_scaffold.md` | 1 | P0 |
| [PP-003](tickets/PP-003-env-and-gitignore.md) | `playbooks/env_var_conventions.md` | 1 | P0 |
| [PP-012](tickets/PP-012-switch-env.md) | `playbooks/env_var_conventions.md` | 2 | P0 |
| [PP-010](tickets/PP-010-docker-compose-postgres.md) | `playbooks/portfolio_stack_baseline.md` | 2 | P0 |
| [PP-011](tickets/PP-011-dockerfiles-node22.md) | `playbooks/ovh_deployment.md` | 2 | P0 |
| [PP-013](tickets/PP-013-deploy-script.md) | `playbooks/ovh_deployment.md` | 2 | P0 |
| [PP-014](tickets/PP-014-nginx-template.md) | `playbooks/ovh_deployment.md` | 2 | P0 |
| [PP-016](tickets/PP-016-postgres-first.md) | `playbooks/postgresql_integration_testing.md` (config) | 2 | P0 |
| [PP-019](tickets/PP-019-postgres-integration-and-linting.md) | `playbooks/postgresql_integration_testing.md` (full suite + lint) | 2 | P0 |
| [PP-020](tickets/PP-020-scaffold-next16.md) | `playbooks/portfolio_stack_baseline.md` + `nextjs_config_and_conventions.md` | 3 | P0 |
| [PP-022](tickets/PP-022-clerk-nextjs.md) | `playbooks/clerk_authentication.md` + `clerk_middleware_pattern.md` | 3 | P0 |
| [PP-024](tickets/PP-024-tailwind4-design.md) | `playbooks/markdown2pdf_design_system.md` | 3 | P1 |
| [PP-025](tickets/PP-025-deploy-version-toast.md) | `playbooks/frontend_deploy_version_toast.md` | 3 | P1 |
| [PP-026](tickets/PP-026-fastapi-backend.md) | `playbooks/fastapi_backend_patterns.md` | 3 | P0 |
| [PP-027](tickets/PP-027-openapi-types.md) | `playbooks/openapi_type_generation.md` | 3 | P2 |
| [PP-028](tickets/PP-028-stripe-billing-fastapi.md) | `playbooks/billing_and_database.md` | 3 | P0 |
| [PP-029](tickets/PP-029-database-migrations.md) | `playbooks/database_migration_python.md` | 3 | P0 |
| [PP-030](tickets/PP-030-rate-limiting.md) | `playbooks/rate_limiting.md` | 3 | P1 |
| [PP-031](tickets/PP-031-seo-aeo.md) | `playbooks/seo_social_aeo_metadata.md` | 3 | P1 |
| [PP-032](tickets/PP-032-security-audit.md) | `playbooks/agent_paige_security_audit.md` + SEC rules | 3 | P0 |
| [PP-033](tickets/PP-033-domain-cloudflare-dns.md) | `playbooks/cloudflare_dns.md` | 3 | P0 (blocked) |
| [PP-034](tickets/PP-034-ovh-production-cutover.md) | `playbooks/ovh_deployment.md` | 3 | P0 (blocked) |
| [PP-044](tickets/PP-044-nginx-api-auth-routing.md) | `playbooks/ovh_deployment.md`, `clerk_middleware_pattern.md` | 3 | P0 |
| [PP-045](tickets/PP-045-gemini-server-proxy.md) | `playbooks/agent_paige_security_audit.md`, `ssrf_protection.md` | 3 | P0 |
| [PP-046](tickets/PP-046-backend-ai-quotas.md) | `playbooks/agent_paige_security_audit.md`, `billing_and_database.md` | 3 | P1 |
| [PP-047](tickets/PP-047-server-item-tier-limits.md) | `playbooks/agent_paige_security_audit.md`, `billing_and_database.md` | 3 | P1 |
| [PP-048](tickets/PP-048-harden-client-errors.md) | `playbooks/agent_paige_security_audit.md`, `rate_limiting.md` | 3 | P1 |
| [PP-049](tickets/PP-049-stripe-redirect-validation.md) | `playbooks/agent_paige_security_audit.md`, `billing_and_database.md` | 3 | P1 |
| [PP-050](tickets/PP-050-remove-public-admin-emails.md) | `playbooks/agent_paige_security_audit.md` | 3 | P2 |
| [PP-051](tickets/PP-051-hsts-csp-headers.md) | `playbooks/agent_paige_security_audit.md`, `nextjs_config_and_conventions.md` | 3 | P2 |
| [PP-052](tickets/PP-052-redis-rate-limiting.md) | `playbooks/rate_limiting.md` | 3 | P2 |
| [PP-053](tickets/PP-053-validate-receipt-url.md) | `playbooks/ssrf_protection.md` | 3 | P2 |
| [PP-054](tickets/PP-054-restrict-health-endpoint.md) | `playbooks/ovh_deployment.md` | 3 | P2 |
| [PP-055](tickets/PP-055-sanitize-api-errors.md) | `playbooks/agent_paige_security_audit.md` | 3 | P3 |
| [PP-056](tickets/PP-056-stripe-webhook-tests.md) | `playbooks/billing_and_database.md` | 3 | P3 |
| [PP-057](tickets/PP-057-jwt-aud-oauth-hardening.md) | `playbooks/clerk_authentication.md` | 3 | P3 |

## Out of scope (for now)

| Playbook | Reason |
|----------|--------|
| `carbon_ads_monetization.md` | Not a launch requirement |
| `r2_private_attachment_storage.md` | Optional unless receipt images go private R2 |
| `resend_email.md` | Wire when transactional email is product-required |
| `agent_paige_recommendations.md` | Paige-specific |
| `guest_freemium_tier.md` | Revisit after freemium UX decision |
| `admin_panel.md` | Existing admin dashboard; re-gate after Next migrate |

## See also

- [REFACTOR_PLAN.md](./REFACTOR_PLAN.md)
- [TICKET_STATUS.md](./TICKET_STATUS.md)
