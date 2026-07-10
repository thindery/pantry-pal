# Security Audit — PantryPal (PP-032)

**Date:** 2026-07-10  
**Scope:** Pre-OVH cutover review of FastAPI + Next.js monorepo

## Summary

| Area | Status | Notes |
|------|--------|-------|
| SEC-001 Clerk JWT | ✅ Pass | `backend/clerk_auth.py` verifies Bearer tokens; no `X-User-Id` trust |
| Stripe webhooks | ✅ Pass | Signature verification via `STRIPE_WEBHOOK_SECRET` |
| Secrets in git | ✅ Pass | `.env*` gitignored; `.env.example` placeholders only |
| Docker non-root | ✅ Pass | Frontend `USER node`; backend `USER app` in Dockerfile |
| CORS | ✅ Pass | Configurable `ALLOWED_ORIGINS`; production defaults tight |
| Rate limiting | ⚠️ Partial | In-memory limits; Redis recommended at scale |
| Admin gating | ✅ Pass | Clerk + admin email allowlist |
| Security headers | ✅ Pass | Next.js `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy` |
| SSRF (webhooks) | ✅ N/A | No user-supplied webhook URLs |
| API docs exposure | ✅ Pass | `/docs` disabled when `ENVIRONMENT=production` |

## Findings

### P1 — Rate limiter is process-local
In-memory rate limits reset on deploy/restart. Acceptable for launch; track Redis-backed limits post-cutover.

### P2 — Legacy Express tree retained
`backend-legacy/` is reference-only. Ensure it is not deployed (Dockerfile uses Python backend only).

### P2 — OCR receipt endpoint accepts base64 images
Validate image size limits (10MB) and monitor abuse via rate limits.

## Pre-cutover checklist

- [ ] Domain + TLS (PP-033)
- [ ] Rotate all test keys to production Clerk/Stripe keys
- [ ] `TRUST_PROXY_HEADERS` only behind Cloudflare/nginx
- [ ] Run `npm run test:postgres` in CI before deploy
- [ ] Confirm Railway decommissioned (PP-035)