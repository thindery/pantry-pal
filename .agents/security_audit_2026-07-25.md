# Security Audit Report — Pantry Hub (mypantryhub.com)

| Field | Value |
|-------|-------|
| **Audit Date** | 2026-07-25 |
| **Auditor Role** | Security agent (static review + passive production probes) |
| **Scope** | NextAuth + FastAPI monorepo on OVH Docker + nginx/Cloudflare |
| **Production** | https://www.mypantryhub.com · build `253ee6b` (probed) |
| **Methodology** | `project-director/playbooks/agent_paige_security_audit.md` + `ovh_security_baseline.md` |
| **Prior audits** | `.agents/docs/security_audit_2026-07-10.md`, `.agents/docs/security_audit_2026-07-11.md` |
| **Remediation wave** | PP-044–PP-058 (prior findings largely closed) |

---

## 1. Executive Summary

### Risk Posture: **LOW–MEDIUM**

Auth, multi-tenant isolation, Stripe webhook verification, and edge routing are solid. Prior P0/P1 issues from 2026-07-11 (Gemini client key, client-errors auth, Stripe open redirects, item tier caps on `POST /api/items`, HSTS/CSP) are fixed in code and confirmed on production probes where applicable.

This re-audit found **no production auth bypass or cross-tenant IDOR**. New residual issues are mainly **economic-abuse gaps** (shopping-session inventory import bypassing free-tier item cap) and **defense-in-depth** (long-lived API bearer JWT, CSP `unsafe-eval`, missing gitleaks CI, nginx CF snippet not in repo template).

### Top findings

| Rank | ID | Severity | Title | Status |
|------|-----|----------|-------|--------|
| 1 | SEC-201 | **P1** | Free-tier item cap bypass via shopping-session add-to-inventory | **Fixed this audit (PP-065)** |
| 2 | SEC-202 | **P1** | API bearer JWT TTL 30 days (theft impact) | **Fixed this audit (PP-066)** |
| 3 | SEC-203 | **P2** | CSP allows `'unsafe-inline'` + `'unsafe-eval'` | Open → PP-067 |
| 4 | SEC-204 | **P2** | No gitleaks / secret-scan in CI | Open → PP-068 |
| 5 | SEC-205 | **P2** | Stripe webhook error responses could leak exception strings | **Hardened this audit (PP-069)** |
| 6 | SEC-206 | **P2** | nginx vhost lacks `require-cloudflare.conf` include (repo) | Open → PP-070 (ops) |
| 7 | SEC-207 | **P2** | Unauthenticated rate-limit key uses `request.client.host` (proxy IP) | Open → PP-071 |
| 8 | SEC-208 | **P3** | Public `/design-system` | Open → PP-072 |
| 9 | SEC-209 | **P3** | No `/.well-known/security.txt` | Open → PP-073 |
| 10 | SEC-210 | **P3** | Clerk JWT fallback still `verify_aud: False` | Open → PP-074 |

### Findings by severity

| Severity | Count | Notes |
|----------|-------|-------|
| P0 | 0 | No critical auth/IDOR/secret exposure in production |
| P1 | 2 | Both fixed in this audit |
| P2 | 5 | 1 hardened; 4 residual |
| P3 | 3 | Backlog |
| **Total new** | **10** | |

---

## 2. Scope & Methodology

### In scope

- `backend/routers/**`, `backend/auth_session.py`, `backend/clerk_auth.py`
- `backend/middleware/rate_limit.py`, `backend/services/**`, `backend/lib/url_validation.py`
- `frontend/middleware.ts`, `frontend/lib/auth*.ts`, `frontend/lib/auth-token.ts`, `frontend/next.config.ts`
- `deploy/nginx/pantry-pal.conf`, `docker-compose.yml`, Dockerfiles
- `.env.example`, `.env.prod.example`, `.github/workflows/*`
- Production passive probes only on https://www.mypantryhub.com

### Out of scope

- Active brute force, credential stuffing, destructive writes
- Full dependency CVE / SCA (track via Dependabot/Semgrep playbook)
- Cloudflare dashboard or Stripe Dashboard configuration beyond probe inference
- Live OVH host SSH (ops-only); compose reviewed as code

### Techniques

1. Auth & IDOR — JWT/session path, `user_id` scoping, admin gating  
2. Cross-tenant — client identity headers/body never trusted in production  
3. Webhooks — Stripe signature fail-closed  
4. Economic abuse — tier limits on all write paths that create items  
5. Infrastructure — expose-only Docker, nginx, headers, health/docs  
6. Production probes — unauthenticated `curl` only  

---

## 3. Architecture (auth flow)

```
Browser
   │
   ▼
Cloudflare (TLS, bot/edge) → central nginx (app-network)
   │
   ├─ /api/* ──► pantry-pal-frontend:38472
   │                middleware: strip x-user-id/email
   │                mint short-lived HS256 Bearer (AUTH_SECRET + aud)
   │                rewrite ──► pantry-pal-backend:52841
   │
   └─ /* ──► pantry-pal-frontend
```

Backend never trusts `x-user-id` when `NODE_ENV=production` (`ALLOW_TEST_AUTH` hard-disabled).

---

## 4. Production probe results

**Base:** `https://www.mypantryhub.com` · **Build:** `253ee6b` · **Date:** 2026-07-25

| Probe | Expected | Actual | Status |
|-------|----------|--------|--------|
| Security headers (HSTS, CSP, XFO, nosniff, Referrer, Permissions) | Present | Present (HSTS+CSP duplicated nginx+Next) | ✅ |
| Apex → www | 301 | 301 https://www… | ✅ |
| `GET /api/items` (no auth) | 401/redirect | 307 → `/auth/signin` | ✅ |
| `GET /api/items` + `x-user-id` spoof | 401/redirect | 307 → sign-in | ✅ |
| `GET /api/admin/dashboard` (no auth) | 401/redirect | 307 → sign-in | ✅ |
| `GET /api/auth/token` (no auth) | 401 | 401 `{"error":"Unauthorized"}` | ✅ |
| `POST /api/client-errors` (no auth) | 401/redirect | 307 → sign-in | ✅ (was 422 in prior audit) |
| `GET /health` | Not public backend detail | 307 → sign-in (frontend catch-all) | ✅ |
| `GET /docs`, `/redoc`, `/openapi.json` | Blocked | 307 → sign-in | ✅ |
| `POST /api/webhooks/stripe` no sig | 400 | 400 missing signature | ✅ |
| `POST /api/webhooks/stripe` bad sig | 400 | 400 signature mismatch | ✅ |
| `POST /api/subscription/checkout` no auth | 401/redirect | 307 → sign-in | ✅ |
| Spoofed `CF-Connecting-IP` | Block/ignore | **403** from Cloudflare | ✅ edge |
| `GET /build-id.txt` | Present | `253ee6b` | ℹ️ ops: behind latest main |
| `GET /.well-known/security.txt` | Optional | 404 | ⚠️ SEC-209 |
| `GET /design-system/` | Prefer gated | 200 public | ⚠️ SEC-208 |

---

## 5. Prior findings remediation matrix (2026-07-11)

| ID | Title | Status |
|----|-------|--------|
| SEC-101 | Gemini key in client bundle | ✅ Fixed (PP-058 decommission) |
| SEC-102 | Unauthenticated client-errors | ✅ Fixed (auth + session-bound userId) |
| SEC-103 | Stripe redirect open redirect | ✅ Fixed (`validate_redirect_url`) |
| SEC-104 | Item tier client-only | ⚠️ Partial → residual SEC-201 on shopping sessions |
| SEC-105 | AI quotas | ✅ N/A after Gemini decommission |
| SEC-106 | Public admin emails | ✅ Fixed (server-only `ADMIN_EMAILS`) |
| SEC-107 | Missing HSTS/CSP | ✅ Fixed (nginx + Next headers live) |
| SEC-108 | In-memory rate limit | ✅ Postgres store (PP-052) |
| SEC-109 | receiptUrl validation | ✅ Fixed |
| SEC-110 | Public `/health` detail | ✅ Not edge-exposed to backend |
| SEC-111 | JWT aud verification | ✅ NextAuth path verifies aud |
| SEC-112 | Dangerous OAuth linking | ✅ Disabled |
| SEC-113–117 | Errors / CORS / webhook tests / placeholders | ✅ / residual backlog |

---

## 6. Findings (new)

### SEC-201 — P1: Free-tier item cap bypass via shopping-session import

**Evidence:** `backend/services/shopping_sessions_service.py` `add_session_to_inventory` called `create_item` in a loop without `can_add_items`. `POST /api/items` and barcode save already enforced tier (PP-047).

**Impact:** Free users at the 50-item cap could complete a shopping session with barcoded items and import unlimited inventory, defeating paid-plan item limits.

**Remediation:** Enforce remaining capacity before import; return `403 TIER_LIMIT_EXCEEDED`. → **PP-065 (fixed this audit)**

---

### SEC-202 — P1: API bearer JWT TTL 30 days

**Evidence:** `frontend/lib/auth-token.ts` `setExpirationTime(... + 30 * 24 * 60 * 60)`. Tokens also issued via `GET /api/auth/token` to the browser for client `fetch`.

**Impact:** Stolen bearer (XSS, shared device, log leak) remains valid for a month. Session cookie maxAge is separate; middleware re-mints every request so short TTL is free.

**Remediation:** 1-hour TTL. → **PP-066 (fixed this audit)**

---

### SEC-203 — P2: CSP `unsafe-inline` + `unsafe-eval`

**Evidence:** Production CSP from Next + nginx:

```
script-src 'self' 'unsafe-inline' 'unsafe-eval'
```

**Impact:** Weakens XSS mitigation if a DOM XSS is introduced.

**Remediation:** Nonces/hashes for Next scripts where possible; remove `unsafe-eval` if build allows. → **PP-067**

---

### SEC-204 — P2: No secret scanning in CI

**Evidence:** `.github/workflows/ci.yml` has typecheck/lint/tests only — no Gitleaks/Trivy secrets job per `github_actions_security_scanning.md`.

**Impact:** Accidental secret commits may reach `main` before human review.

**Remediation:** Add gitleaks workflow. → **PP-068**

---

### SEC-205 — P2: Webhook exception string leakage

**Evidence:** `backend/routers/webhooks.py` previously returned `str(exc)` for all failures.

**Impact:** Low — may expose Stripe SDK/internal detail to unauthenticated POSTs.

**Remediation:** Generic client messages. → **PP-069 (hardened this audit)**

---

### SEC-206 — P2: nginx template missing Cloudflare origin restriction snippet

**Evidence:** `deploy/nginx/pantry-pal.conf` does not `include /etc/nginx/snippets/require-cloudflare.conf;` (OVH baseline). Live edge still returned 403 on spoofed `CF-Connecting-IP` (CF/platform-level).

**Impact:** If CF proxy is misconfigured or origin IP leaked, attackers may hit origin directly unless ops snippet is installed centrally.

**Remediation:** Add include in vhost template; verify on host. → **PP-070 (ops)**

---

### SEC-207 — P2: Rate-limit IP key behind reverse proxy

**Evidence:** `backend/middleware/rate_limit.py` uses `request.client.host` for unauthenticated identifiers. Behind Docker nginx this is often a single internal hop IP.

**Impact:** Unauth rate buckets may collapse to one key (or be ineffective). Authenticated paths key on `user:{id}` (OK).

**Remediation:** Trusted `CF-Connecting-IP` / `X-Forwarded-For` first hop only when behind known proxy. → **PP-071**

---

### SEC-208 — P3: Public design-system page

**Evidence:** `frontend/middleware.ts` `PUBLIC_PATHS` includes `/design-system`; probe 200.

**Impact:** Low information disclosure of internal UI kit.

**Remediation:** Gate to admin or disable in production. → **PP-072**

---

### SEC-209 — P3: Missing security.txt

**Evidence:** `GET /.well-known/security.txt` → 404.

**Impact:** Harder for researchers to report issues.

**Remediation:** Add security.txt with contact. → **PP-073**

---

### SEC-210 — P3: Clerk session fallback without audience check

**Evidence:** `backend/clerk_auth.py` `options={"verify_aud": False}`; `auth_session` still falls back to Clerk after NextAuth JWT fail.

**Impact:** Low if Clerk is cutover-complete and unused; tokens still require Clerk JWKS RS256. Residual attack surface if `CLERK_SECRET_KEY` remains set.

**Remediation:** Remove Clerk path if unused, or verify `iss`/`azp`. → **PP-074**

---

## 7. Positive controls

| Control | Status |
|---------|--------|
| `require_authenticated_user_id` on user-scoped FastAPI routes | ✅ |
| SQL parameterized; update column allowlists | ✅ |
| All pantry/activity/session queries include `user_id` | ✅ |
| Middleware strips `x-user-id` / `x-user-email` | ✅ |
| Test auth disabled in production | ✅ |
| Stripe webhook signature required + secret fail-closed | ✅ |
| Redirect/receipt URL origin allowlist | ✅ |
| Item create + barcode save tier checks | ✅ (+ shopping import after PP-065) |
| Client-errors requires session; userId from auth | ✅ |
| Admin routes: auth + `ADMIN_EMAILS` / `ADMIN_USER_IDS` | ✅ |
| API docs disabled in production unless `ENABLE_API_DOCS=1` | ✅ |
| Docker: expose-only ports; non-root `USER app` / `USER node` | ✅ |
| Postgres-backed rate limits (authenticated) | ✅ |
| Receipt image 10MB server limit | ✅ |
| HSTS + CSP + frame/nosniff/referrer/permissions live | ✅ |
| Open Food Facts URL fixed + digit-only barcode (no SSRF) | ✅ |
| OAuth `allowDangerousEmailAccountLinking: false` | ✅ |
| `safeCallbackUrl` rejects open redirects on sign-in | ✅ |

---

## 8. Attack chains (residual)

1. **Tier bypass → free unlimited inventory** via shopping-session import — **broken by PP-065**  
2. **XSS (if introduced) → long-lived bearer** — **TTL reduced by PP-066**; CSP still permissive (SEC-203)  
3. **Origin direct hit if CF bypassed** — mitigated by live CF 403 behavior; harden nginx snippet (SEC-206)  
4. **Webhook spam / error oracle** — signature required; messages sanitized (SEC-205)

---

## 9. Ticket backlog

| Ticket | Priority | Finding | Title | Status |
|--------|----------|---------|-------|--------|
| PP-065 | P1 | SEC-201 | Enforce tier limits on shopping-session add-to-inventory | ✅ Done (this audit) |
| PP-066 | P1 | SEC-202 | Shorten API bearer JWT TTL to 1h | ✅ Done (this audit) |
| PP-067 | P2 | SEC-203 | Tighten CSP (reduce unsafe-eval/inline) | 📋 Open |
| PP-068 | P2 | SEC-204 | Add Gitleaks secret scan to CI | 📋 Open |
| PP-069 | P2 | SEC-205 | Sanitize Stripe webhook error responses | ✅ Done (this audit) |
| PP-070 | P2 | SEC-206 | nginx require-cloudflare include + host verify | 📋 Open (ops) |
| PP-071 | P2 | SEC-207 | Trusted client IP for rate limiting | 📋 Open |
| PP-072 | P3 | SEC-208 | Gate or remove public design-system | 📋 Open |
| PP-073 | P3 | SEC-209 | Add security.txt | 📋 Open |
| PP-074 | P3 | SEC-210 | Remove or harden Clerk JWT fallback | 📋 Open |

---

## 10. Residual ops notes

1. **Deploy this audit’s commit** — production build is `253ee6b`; main has newer Stripe catalog work plus PP-065–069 fixes. Run `./deploy/deploy-docker.sh main` on OVH after merge.  
2. **Confirm nginx** has CF restriction snippet installed under `/opt/nginx/conf.d/` (SEC-206).  
3. **Rotate any historical Gemini keys** that lived in local `.env.local` (gitignored; ensure never used in prod).  
4. **Stripe webhook endpoint** must remain `https://www.mypantryhub.com/api/webhooks/stripe` with live `STRIPE_WEBHOOK_SECRET`.  
5. **AUTH_SECRET / STRIPE_* / Google OAuth** — ensure production values only in host `.env.prod`, never git.  
6. **Host port audit:** `docker ps` should show no `0.0.0.0:3xxx/5xxx` for pantry-pal (expose-only).  
7. **Optional:** HSTS `preload` submission after sustained max-age.  
8. **Dependabot/SCA** still recommended fleet-wide (not product-specific).  

---

## 11. Re-audit checklist (post-deploy)

- [ ] `POST /api/shopping-sessions/{id}/add-to-inventory` returns 403 at free cap  
- [ ] Newly minted bearer JWT `exp - iat` ≈ 3600  
- [ ] Production build-id matches deploy commit  
- [ ] `curl -sI https://www.mypantryhub.com` still shows HSTS + CSP  
- [ ] Stripe test webhook (Dashboard) still delivers 200  
- [ ] No host-published app ports on OVH  

---

*End of report — 2026-07-25*
