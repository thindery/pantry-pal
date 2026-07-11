# Security Audit Report — Pantry Hub (mypantryhub.com)

| Field | Value |
|-------|-------|
| **Audit Date** | 2026-07-11 |
| **Auditor Role** | Security agent (static review + passive production probes) |
| **Scope** | NextAuth v5 + FastAPI monorepo, nginx/Docker deploy, production https://www.mypantryhub.com |
| **Methodology** | `project-director/playbooks/agent_paige_security_audit.md` (adapted for NextAuth, not Clerk) |
| **Prior audit** | `.agents/docs/security_audit_2026-07-10.md` (PP-032 / PP-038) |

---

## 1. Executive Summary

### Risk Posture: **MEDIUM**

Core auth and tenancy controls are sound after PP-044 (nginx routes all `/api/*` through Next.js middleware). No cross-tenant IDOR or production `x-user-id` spoofing was found. Stripe webhooks reject unsigned payloads.

The highest remaining risks are **economic abuse**: Gemini API key shipped in the client bundle (`NEXT_PUBLIC_GEMINI_API_KEY`), server-side tier limits not enforced on item creation, and AI/visual-usage quotas bypassed via direct API calls. Secondary gaps include unauthenticated client-error ingestion, open redirect on Stripe checkout URLs, and missing HSTS/CSP.

### Top 5 Findings

| Rank | ID | Severity | Title |
|------|-----|----------|-------|
| 1 | SEC-101 | **P0** | Gemini API key exposed via `NEXT_PUBLIC_*` in client bundle |
| 2 | SEC-104 | **P1** | Free-tier item cap enforced client-side only |
| 3 | SEC-105 | **P1** | AI/visual-usage quotas not enforced server-side |
| 4 | SEC-102 | **P1** | Unauthenticated `POST /api/client-errors` accepts spoofed `userId` |
| 5 | SEC-103 | **P1** | Stripe checkout/portal redirect URLs not origin-validated |

### Findings by Severity

| Severity | Count |
|----------|-------|
| P0 | 1 |
| P1 | 4 |
| P2 | 6 |
| P3 | 6 |
| **Total** | **17** |

---

## 2. Scope & Methodology

### In Scope

- `frontend/middleware.ts`, `frontend/lib/auth*.ts`, `frontend/app/api/**`
- `frontend/services/**`, `frontend/next.config.ts`
- `backend/routers/**`, `backend/auth_session.py`, `backend/clerk_auth.py`
- `backend/middleware/rate_limit.py`, `backend/services/**`
- `deploy/nginx/pantry-pal.conf`, `docker-compose.yml`, Dockerfiles
- `.env.example`, `.env.prod.example`
- Production passive probes on https://www.mypantryhub.com

### Out of Scope

- Active brute force, destructive writes, data exfiltration
- Cloudflare dashboard / Google Cloud Console configuration
- Full dependency CVE scan (track via PP-015 CI + `github_actions_security_scanning.md`)

### Review Techniques

1. Auth & IDOR — session/JWT flow, user_id scoping, admin gating
2. Cross-tenant — client-supplied identity headers and body fields
3. Webhooks — Stripe signature verification
4. Economic abuse — tier limits, AI key exposure, rate limits
5. Infrastructure — nginx routing, security headers, health exposure
6. Production probes — `curl` against live endpoints (no auth)

---

## 3. Architecture (Auth Flow)

```
Browser
   │
   ▼
Cloudflare → nginx (TLS)
   │
   ├─ /api/* ──► pantry-pal-frontend (Next.js middleware)
   │                  │ injects Authorization: Bearer <JWT>
   │                  └─ rewrite ──► pantry-pal-backend:52841
   │
   ├─ /health ──► pantry-pal-backend (direct)
   └─ /* ──► pantry-pal-frontend
```

PP-044 fixed nginx bypass where `/api/` skipped middleware (root cause of dashboard 401s).

---

## 4. Production Probe Results

**Base:** `https://www.mypantryhub.com` · **Build:** `2d54cae` · **Date:** 2026-07-11

| Probe | Expected | Actual | Status |
|-------|----------|--------|--------|
| Security headers (HSTS, CSP) | Present | Only X-Frame-Options, nosniff, Referrer-Policy | ⚠️ SEC-107 |
| `GET /api/items` (no auth) | 401/403 | 307 → sign-in | ✅ |
| `GET /api/items` + `x-user-id: spoof` | 401 | 307 → sign-in | ✅ |
| `GET /api/admin/dashboard` (no auth) | 401/403 | 307 → sign-in | ✅ |
| `GET /api/auth/token` (no auth) | 401 | 401 | ✅ |
| `POST /api/client-errors` (no auth) | 401 | 422 (body accepted path) | ❌ SEC-102 |
| `GET /health` | Restricted/minimal | 200 + JSON detail | ⚠️ SEC-110 |
| `GET /docs` | 404/disabled | 307 | ✅ |
| `POST /api/webhooks/stripe` (no sig) | 400/401 | 400 | ✅ |

---

## 5. Findings

### SEC-101 — P0: Gemini API key in client bundle

**Evidence:** `frontend/services/geminiService.ts`, `frontend/components/dashboard/voice-assistant.tsx`, `frontend/Dockerfile` (`NEXT_PUBLIC_GEMINI_API_KEY`)

**Impact:** Any user can extract the key from JS and run unlimited Gemini Live / vision calls → direct cost abuse.

**Remediation:** Server-side proxy route; `GEMINI_API_KEY` server-only; per-user rate limits and tier checks. → **PP-045**

---

### SEC-102 — P1: Unauthenticated client-errors POST

**Evidence:** `frontend/middleware.ts:86-88` (bypasses auth), `backend/routers/client_errors.py:26-40` (no `Depends`), accepts `body.userId`

**Impact:** DB pollution, storage DoS, spoofed user attribution in admin diagnostics.

**Remediation:** Auth or HMAC token; payload size cap; dedicated rate limit; bind `userId` to session. → **PP-048**

---

### SEC-103 — P1: Stripe redirect URL open redirect

**Evidence:** `backend/routers/subscription.py:74-94`, `CheckoutRequest.successUrl` / `cancelUrl` / `PortalRequest.returnUrl` passed to Stripe without origin check

**Impact:** Phishing redirect after legitimate payment.

**Remediation:** Allowlist to `AUTH_URL` / `FRONTEND_URL` origin. → **PP-049**

---

### SEC-104 — P1: Item tier limit client-only

**Evidence:** `backend/routers/items.py:49-57` (no `can_add_items`), `frontend/contexts/pantry-provider.tsx:612-617` (client check only)

**Impact:** Free users bypass 50-item cap via direct `POST /api/items`.

**Remediation:** Call `subscription_service.can_add_items()` before create; 403 when exceeded. → **PP-047**

---

### SEC-105 — P1: AI/visual-usage quota bypass

**Evidence:** Client-side Gemini in `scan-usage-view.tsx`; `backend/routers/scan.py` does not increment `ai_calls`; `subscription_service` counters unused on scan routes

**Impact:** Unlimited vision AI and inventory mutations without payment.

**Remediation:** Server-side AI proxy + enforce quotas on `/api/visual-usage` and voice sessions. → **PP-046**

---

### SEC-106 — P2: Admin emails in `NEXT_PUBLIC_ADMIN_EMAILS`

**Evidence:** `frontend/middleware.ts:65`, `frontend/components/dashboard/views/account-view.tsx`, `.env.prod.example`

**Impact:** Admin identities exposed in client bundle → targeted attacks.

**Remediation:** Server-only `ADMIN_EMAILS`; `isAdmin` from JWT/session only. → **PP-050**

---

### SEC-107 — P2: Missing HSTS and CSP

**Evidence:** `frontend/next.config.ts` (partial headers), `deploy/nginx/pantry-pal.conf` (no security headers); production probe confirms absence

**Remediation:** Add HSTS, CSP, Permissions-Policy at nginx + Next.js. → **PP-051**

---

### SEC-108 — P2: In-memory rate limiting

**Evidence:** `backend/middleware/rate_limit.py` — process-local, resets on deploy

**Remediation:** Redis-backed limits keyed on verified `user_id`. → **PP-052**

---

### SEC-109 — P2: `receiptUrl` not validated

**Evidence:** `backend/models/schemas.py`, `frontend/components/SessionHistory.tsx`

**Impact:** Arbitrary external URLs stored and rendered.

**Remediation:** `https://` only + domain allowlist. → **PP-053**

---

### SEC-110 — P2: Public `/health` exposes internals

**Evidence:** `deploy/nginx/pantry-pal.conf:56-62`, probe returns 200 with DB status

**Remediation:** Internal-only or minimal unauthenticated payload. → **PP-054**

---

### SEC-111 — P2: JWT `aud` verification disabled

**Evidence:** `backend/auth_session.py:34` (`verify_aud: False`)

**Remediation:** Set and verify `aud` claim on minted tokens. → **PP-057**

---

### SEC-112 — P2: `allowDangerousEmailAccountLinking`

**Evidence:** `frontend/lib/auth-providers.ts:11`

**Remediation:** Disable unless multi-provider linking is required. → **PP-057**

---

### SEC-113 — P3: Internal exception strings in API responses

**Evidence:** `backend/routers/admin.py`, `receipts.py`, `subscription.py`

**Remediation:** Generic client messages; log details server-side. → **PP-055**

---

### SEC-114 — P3: `/api/receipts/health` unauthenticated

**Evidence:** `backend/routers/receipts.py:18-22`

**Remediation:** Require auth or disable in production. → **PP-055**

---

### SEC-115 — P3: CORS wildcard in non-production

**Evidence:** `backend/app/config.py` defaults to `["*"]` when not production

**Remediation:** Explicit origins in staging. → backlog

---

### SEC-116 — P3: No Stripe webhook signature tests

**Evidence:** `backend/routers/webhooks.py`, no tests in `tests/`

**Remediation:** Add valid/invalid/missing signature tests. → **PP-056**

---

### SEC-117 — P3: `.env.prod.example` contains real-looking identifiers

**Evidence:** `.env.prod.example` admin email and OAuth client ID placeholders

**Remediation:** Use generic placeholders only. → backlog

---

## 6. Positive Controls

| Control | Status |
|---------|--------|
| FastAPI `require_authenticated_user_id` on user-scoped routers | ✅ |
| SQL parameterized; column allowlists on dynamic updates | ✅ |
| Cross-tenant IDOR checks (`user_id` in WHERE clauses) | ✅ |
| NextAuth middleware + Bearer JWT injection (PP-044) | ✅ |
| `x-user-id` stripped in middleware; test auth disabled in prod | ✅ |
| Stripe webhook signature verification | ✅ |
| Receipt scan 10MB server-side limit | ✅ |
| API docs disabled in prod (`ENABLE_API_DOCS=0`) | ✅ |
| Partial security headers (X-Frame-Options, nosniff, Referrer-Policy) | ✅ |
| Rate limiting middleware (in-memory) | ✅ partial |
| Contract tests for 401 without auth | ✅ |

---

## 7. Attack Chains

1. **Gemini key theft → unlimited AI spend** (SEC-101 + SEC-105)
2. **Free tier bypass → paid features** via direct `POST /api/items` + `/api/visual-usage` (SEC-104 + SEC-105)
3. **Client-errors spam → admin noise** (SEC-102)
4. **Checkout phishing redirect** via crafted `successUrl` (SEC-103)

---

## 8. Ticket Backlog

| Ticket | Priority | Finding | Title | Status |
|--------|----------|---------|-------|--------|
| PP-044 | P0 | — | nginx API routing through Next.js (auth injection) | ✅ Done |
| PP-045 | P0 | SEC-101 | Proxy Gemini API server-side | 📋 Open |
| PP-046 | P1 | SEC-105 | Enforce AI/voice quotas on backend | 📋 Open |
| PP-047 | P1 | SEC-104 | Server-side item tier limits | 📋 Open |
| PP-048 | P1 | SEC-102 | Harden client-errors ingestion | 📋 Open |
| PP-049 | P1 | SEC-103 | Validate Stripe redirect URLs | 📋 Open |
| PP-050 | P2 | SEC-106 | Remove public admin email env | 📋 Open |
| PP-051 | P2 | SEC-107 | Add HSTS + CSP headers | 📋 Open |
| PP-052 | P2 | SEC-108 | Redis rate limiting | 📋 Open |
| PP-053 | P2 | SEC-109 | Validate `receiptUrl` | 📋 Open |
| PP-054 | P2 | SEC-110 | Restrict `/health` exposure | 📋 Open |
| PP-055 | P3 | SEC-113/114 | Sanitize API error responses | 📋 Open |
| PP-056 | P3 | SEC-116 | Stripe webhook signature tests | 📋 Open |
| PP-057 | P3 | SEC-111/112 | JWT `aud` + OAuth linking hardening | 📋 Open |

---

## 9. Re-Audit Checklist (after PP-045–049 ship)

- [ ] No `NEXT_PUBLIC_GEMINI_*` in bundle (`rg NEXT_PUBLIC_GEMINI frontend/`)
- [ ] `POST /api/items` returns 403 when free tier at cap
- [ ] `POST /api/client-errors` returns 401 without session
- [ ] Stripe checkout rejects off-origin `successUrl`
- [ ] `curl -sI https://www.mypantryhub.com` shows HSTS + CSP
- [ ] Re-run production probe table (Section 4)