# Ticket Status — Pantry Hub

Last updated: 2026-11-26, 7:25 PM CT (PP-235 weekly recipe newsletter live at `95ce29d` / #159, approval-gated; journeys live since 6:33 PM CT)

**Product:** Pantry Hub (Peak Collective LLC dba Pantry Hub) — smart pantry inventory & ledger  
**Domain:** **mypantryhub.com** (canonical: `www.mypantryhub.com`)  
**Stack:** Next 16 + FastAPI + PG 16 monorepo → OVH Docker  
**Gold standards:** `markdown-pdf`, `userkudos`, `agent-paige`

**Priority:** P0 = broken or blocking revenue/customers now. P1 = next up, high impact. P2 = soon. P3 = someday. Every open ticket needs a `Priority: P0|P1|P2|P3` header line; see `.agents/docs/ticket-template.md`.

---

## Quick stats

| | Count |
|--|-------|
| Done | 139 (previous 110 plus 29 shipped overnight 2026-11-25: PP-067, 072, 123–128, 135, 144–147, 149–151, 154, 155, 168–177; PP-148, 152, 153 partly) |
| In progress | 1 (PP-200) |
| Ready | 25 (PP-119 Bing and PP-121 API keys still open; PP-144–PP-146 design leftovers) |
| Backlog | 12 (PP-114, PP-115, PP-129, plus PP-147–PP-155 e2e regression suite) |
| Security open | 0 (PP-067, PP-072 and new PP-172 shipped overnight) |
| Open by priority | P0: 5 · P1: 7 · P2: 12 · P3: 2 (26 on the board below) |
| User action pending | Tylor: Bing Webmaster import (PP-119); add GA4 Viewer for the read-only SA (PP-121); create a Resend read key in the mypantryhub Resend account (PP-129); OK the low-stock email copy (PP-137); AdSense in-app ad unit (PP-140); recipes and photos (PP-139) |

---


## Afternoon 2026-11-25 (after Tylor's "agree with all of this. get it done", 1:54 PM CT)

| Ticket | PR | State |
|--------|----|-------|
| PP-166 $1 first month on Pro monthly | [#108](https://github.com/thindery/pantry-pal/pull/108) | ✅ Live 1:57 PM CT. Live coupon `pro-monthly-first-month-1usd` ($3.99 off once, Pro product); env set on OVH; `/api/public/offer` enabled; banner on `/pricing` and the homepage verified in a browser. Live Checkout Session dry run showed $4.99 → $1.00 and was expired; no charge. GA4 `purchase` no longer falls back to 4.99. |
| PP-136 Renewal reminder after a promo | [#109](https://github.com/thindery/pantry-pal/pull/109) | ✅ Live. `invoice.upcoming` added to `we_1Twvx9RHCLA4QETrTSnoc38P`. Dry run over live subs: only Tylor's comp sub qualifies (renews Dec 21 at $4.99); the paying customer's full-price sub gets nothing. |
| PP-137 Weekly opt-in low-stock email | [#112](https://github.com/thindery/pantry-pal/pull/112) | ✅ Built and deployed, **switched off** (`LOW_STOCK_DIGEST_ENABLED` unset; toggle hidden). OVH cron Sun 15:00 UTC (9 AM CST) no-ops until the flag is set. Copy in the ticket for Tylor. |
| PP-164 Local weekly-ads hub v1 | [#113](https://github.com/thindery/pantry-pal/pull/113) | ✅ Live at `/dashboard/weekly-ads/` (migration 030, Springfield-area seed, national fallback). |
| PP-140 Free-only in-app ad slot | [#114](https://github.com/thindery/pantry-pal/pull/114) | 🟡 Code live, switched off; needs an AdSense ad unit from Tylor. |
| PP-139 Public recipes + affiliate plan | [#115](https://github.com/thindery/pantry-pal/pull/115) | 🟡 Plan done; build waits on Tylor's recipes/photos; no signup. |
| PP-121 GA4 read-only SA | — | 🟡 SA `pantry-hub-ga4-reader@gen-lang-client-0502314230.iam.gserviceaccount.com` created; key in Mini Keychain (`pantry-hub` / `pantry-hub-ga4-service-account-json`). Tylor adds it as Viewer. |
| PP-119 Bing import | — | Needs Tylor's Microsoft sign-in. |
| PP-129 Resend read key | this PR | 🟡 `RESEND_READ_API_KEY` placeholder added. The connected Resend account is not the mypantryhub one, so Tylor creates the key. |
| GROWTH-010 Search Console | — | ✅ All 4 `sc-domain` properties (flowruns, getmd2pdf, agentpaige, userkudos) already show `siteOwner` (verified); sitemaps submitted for all 4 (userkudos today). No DNS tokens needed. |
| PP-181 Don't cache 1–2 character product names | [#117](https://github.com/thindery/pantry-pal/pull/117) | ✅ Live 3:19 PM CT, build `d70df3c`. Cache for `810035212374` already had the real UPCitemdb name; pantry item had been removed. `F` cache left (no provider name). |
| PP-182 Privacy discloses AdSense and analytics | [#120](https://github.com/thindery/pantry-pal/pull/120) | ✅ Live 4:11 PM CT, build `1fab3f1`. `/privacy/` no longer claims we do not use third-party advertising cookies; it discloses Google AdSense on public marketing pages, opt-out links (partner-sites, Ads Settings, aboutads.info), GA4 `G-LEW78LC3EF` (consent-gated), and Cloudflare Web Analytics. Deployed after PP-186 (`32cb176`) was live; no rollback. Status docs: this PR. |

## Overnight 2026-11-25

Sweep by Pantry Hub Lead, about 12:00–6:45 AM CT. Every PR ran backend pytest, vitest, typecheck, lint and build locally plus CI, and was squash-merged when green. Deploys ran `./deploy/deploy-docker.sh main` from an up-to-date worktree, with a `pg_dump` into `/opt/pantry-pal/backups/` before each one. Build ids were read from the frontend container; smoke checked `/`, `/pricing/`, `/checkout/success/`, `/checkout/cancel/`, `/auth/signin/`, `/privacy/` (200), `/admin/`, `/dashboard/`, `/design-system/` (307 to sign-in), the Resend webhook (503, no secret yet) and the Stripe webhook without a signature (400). No rollbacks were needed. From about 1:40 AM the public build-id.txt is behind a Cloudflare challenge for the Mini, so build ids are read inside the frontend container and smoke runs from the Lead's box. agy ran out of credits at about 12:50 AM and Hermes was already out (HTTP 429), so later tickets were coded by the Lead.

### Shipped

| Ticket | PR | Merge commit | Live in build |
|--------|----|--------------|---------------|
| PP-167 renumber (docs only; PP-166 stays the $1 offer) | — | dd67017 | docs |
| PP-168 Success page confirms the purchase with the backend | [#65](https://github.com/thindery/pantry-pal/pull/65) | ed5aaf6 | e58fc58 and later |
| PP-169 Deploy runs migrations before `up -d` | [#66](https://github.com/thindery/pantry-pal/pull/66) | 723d3d6 | e58fc58 and later |
| PP-170 Checkout idempotency key includes the redirect URLs | [#67](https://github.com/thindery/pantry-pal/pull/67) | fa09890 | e58fc58 and later |
| PP-123 Log every email_sends attempt (migration 027) | [#68](https://github.com/thindery/pantry-pal/pull/68) | e58fc58 | e58fc58 (backup overnight-pre-027-20261125-0016.sql) |
| PP-147 Playwright harness and pre-deploy smoke gate | [#74](https://github.com/thindery/pantry-pal/pull/74) | 8575f0c | 6372881 |
| PP-144 Branded checkout success / cancel screens | [#75](https://github.com/thindery/pantry-pal/pull/75) | 6cfa7de | 6372881 |
| PP-128 Admin auth hardening leftovers | [#77](https://github.com/thindery/pantry-pal/pull/77) | 64340ad | 6372881 |
| PP-171 Quick Scan test flake | [#79](https://github.com/thindery/pantry-pal/pull/79) | 5cfc003 | 6372881 |
| PP-124 Signed Resend webhook + email_events (migration 028) | [#80](https://github.com/thindery/pantry-pal/pull/80) | 6372881 | 6372881 (backup overnight-pre-028-20261125-0033.sql) |
| PP-126 Subscription funnel tiles in admin | [#81](https://github.com/thindery/pantry-pal/pull/81) | 0a76827 | ee1bbd7 |
| PP-145 Desktop Pantry layout and 44px icon targets | [#82](https://github.com/thindery/pantry-pal/pull/82) | 132d36b | ee1bbd7 |
| PP-135 Cancellation / ended email copy (real tier, never guessed) | [#83](https://github.com/thindery/pantry-pal/pull/83) | 0b473da | ee1bbd7 |
| PP-155 E2E analytics consent path | [#84](https://github.com/thindery/pantry-pal/pull/84) | ee1bbd7 | ee1bbd7 |
| PP-146 /design-system refreshed to the shipped UI | [#86](https://github.com/thindery/pantry-pal/pull/86) | 0d1035c | e02f14a |
| PP-125 Admin Marketing / email view (replaces closed #85) | [#87](https://github.com/thindery/pantry-pal/pull/87) | 33fce85 | e02f14a |
| PP-067 Production CSP without `unsafe-eval` | [#88](https://github.com/thindery/pantry-pal/pull/88) | e02f14a | e02f14a |
| PP-072 /design-system gated to admins | [#89](https://github.com/thindery/pantry-pal/pull/89) | 3ffaa73 | 3981b53 |
| PP-127 Admin links to GA4 / Search Console / Cloudflare | [#90](https://github.com/thindery/pantry-pal/pull/90) | 3981b53 | 3981b53 |
| PP-172 (new, P1) Middleware fails closed if Auth.js is misconfigured | [#91](https://github.com/thindery/pantry-pal/pull/91) | b20bf7f | b20bf7f |
| PP-150 E2E inventory +/- (minted test session + in-memory API; test-only) | [#92](https://github.com/thindery/pantry-pal/pull/92) | 8c857f4 | test-only, no runtime change |
| PP-151 E2E shopping list (same harness; test-only) | [#93](https://github.com/thindery/pantry-pal/pull/93) | 0366501 | test-only, no runtime change |
| PP-173 (new, P2) Scan page hydration error when Quick Scan is off | [#94](https://github.com/thindery/pantry-pal/pull/94) | 1094760 | 1094760 (read from the frontend container) |
| PP-149 E2E barcode lookup and add, normal mode (partly done: camera Quick Scan add still open) | [#95](https://github.com/thindery/pantry-pal/pull/95) | cfe329e | test-only, no runtime change |
| PP-149 Quick Scan camera add (finishes ticket, generated fake webcam) | [#96](https://github.com/thindery/pantry-pal/pull/96) | 28fe947 | test-only, no runtime change |
| PP-154 transactional email triggers (Postgres integration: welcome + 4 signed Stripe webhooks, Resend and Stripe faked) | [#97](https://github.com/thindery/pantry-pal/pull/97) | 0e05f4b | test-only, no runtime change |
| PP-174 (new, P0) Billing portal 500: `stripe.billing_portal` namespace (Manage billing + already-subscribed redirect) | [#98](https://github.com/thindery/pantry-pal/pull/98) | a614caf | a614caf (deployed about 2:33 AM CT, read from the frontend container) |
| PP-152 / PP-153 backend part: Postgres billing integration (checkout → webhook → Pro, no duplicate, confirm, cancel/reactivate, portal, subscription.deleted); Stripe faked, test-only. Browser run with Stripe test keys still blocked | [#99](https://github.com/thindery/pantry-pal/pull/99) | b014bd0 | test-only, no runtime change |
| PP-148 local part: e2e auth paths (legacy redirects, Google start with fake client, signed-in redirect + welcome once, sign-out). Real Google round trip still blocked. Filed PP-175 (P2 sign-out race) | [#100](https://github.com/thindery/pantry-pal/pull/100) | 616c0cc | test-only, no runtime change |
| PP-175 (new, P2) Sign-out sticks when session refreshes are in flight (`signOutCompletely`; e2e 20/20 vs 4/20 failing before) | [#101](https://github.com/thindery/pantry-pal/pull/101) | 16ec349 | d33df7a (deployed about 3:05 AM CT) |
| PP-176 (new, P1) Postgres guard: removing an item keeps its history, product cache, owner-only, empty group dropped | [#102](https://github.com/thindery/pantry-pal/pull/102) | fa719f3 | test-only, no runtime change |
| PP-177 (new, P2 billing data) Refunds find their invoice via InvoicePayment (live dahlia `charge.refunded` has no `invoice`, verified read-only), so the paid row is marked refunded and the PP-094 rule runs | [#103](https://github.com/thindery/pantry-pal/pull/103) | 2cbf0e4 | 2cbf0e4 (deployed about 3:14 AM CT) |
| PP-177 backfill: 3 refunded Nov 21 duplicate invoices set `succeeded` → `refunded` in admin_transactions (backup pre-pp177-admin-transactions-20261125-0916.sql; nothing deleted; entitlement untouched) | — | data fix | live DB |
| Docs: 38 stale ticket files (PP-001–PP-056) had To Do / Open status lines although this board marks them Done; synced so the fix-and-test routine does not pick them up | [#104](https://github.com/thindery/pantry-pal/pull/104) | 6889416 | docs only |

Offer branch: commit 30c61c4 on `pp-offer-1dollar` adds a test that an offer session reports amount_total 100, so GA4 gets $1.

### Final state (3:30 AM CT)

- Live build: **2cbf0e4** (read from the pantry-pal-frontend container and the public build-id.txt), which is the last code commit on origin/main; later commits are docs only, so no further deploy was needed. Frontend and backend containers healthy; smoke from the Lead's box: `/`, `/pricing/`, `/checkout/success/`, `/checkout/cancel/`, `/auth/signin/`, `/privacy/` 200; `/admin/`, `/dashboard/`, `/design-system/` 307; Stripe webhook unsigned 400; `/api/public/offer` `enabled: false`.
- Every open ticket left on the board is blocked or backlog (see below). Nothing unblocked remains for the 9:00 AM fix-and-test run.

### Not done by the Lead: PR #62 ($1 offer, PP-166)

PR #62 was merged at 12:39 AM CT under the thindery account (not by this sweep) and is live from build 86c57ec onward. `STRIPE_PRO_FIRST_MONTH_COUPON_ID` is unset in `.env.prod` and `/api/public/offer` returns `enabled: false`, so the offer is dormant. Left as is: no revert and no coupon created.

### Still open

- PP-136: ✅ done Nov 25 — `invoice.upcoming` enabled on the live webhook; renewal reminder before the first full-price renewal after a promo.
- PP-137: ✅ built Nov 25, switched off (`LOW_STOCK_DIGEST_ENABLED`). First send waits for Tylor to OK the copy.
- PP-115, PP-114: backlog (research / real data first).

### Blocked, and why

- PP-164 (local ads hub): ✅ v1 link-out shipped Nov 25 at /dashboard/weekly-ads/ (Springfield-area seed; national fallback elsewhere).
- PP-139 (plan done), PP-140 (slot built, off): approved Nov 25; waiting on recipes/photos and an AdSense ad unit.
- PP-166: ✅ live Nov 25 1:57 PM CT after Tylor's yes.
- GROWTH-010 (Search Console, other domains): blocked on verification tokens.
- PP-101–PP-111: owned by the SEO & AEO Desk (PRs #69–#73, #76, #78 merged 2026-11-25 and deployed; AdSense PR #106 live).
- PP-148 (real Google sign-up / login E2E), PP-152–PP-153 (Stripe checkout, cancel): need a Google test account and Stripe test-mode keys. (PP-154 shipped as a backend integration test with signed local webhooks.)
- PP-119 (Bing import), PP-121 (GA4 Viewer for the read-only service account, SA created Nov 25): need Tylor's sign-in.
- PP-129 (Resend read key): approved Nov 25; Tylor creates it in the mypantryhub Resend account (connector is a different account).
- PP-124 operator step: create the Resend webhook for `https://www.mypantryhub.com/api/webhooks/resend` in the mypantryhub Resend account and put `RESEND_WEBHOOK_SECRET` in `/opt/pantry-pal/.env.prod`. The Resend connector here is on a different account. Until then, email rates show "Pending webhook".
- Coding agents: agy out of credits since ~12:50 AM; Hermes out (HTTP 429). Topping up costs money, so not done.

### Notes

- Data: the 3 refunded Nov 21 duplicate invoices are now `refunded` in admin_transactions (PP-177 backfill), so paid-conversion counts no longer include them.
- Pre-existing deploy warning "nginx container not running; skipped vhost reload" comes from the script's compose path; nginx is up.
- After PP-067, a signed-in check of the barcode scanner and a Stripe redirect is still worth doing by hand. Rollback is a one-line revert.

---

## Open tickets by priority

Triage board for work that is not done. Area inventories later in this file stay as historical context. PP-109 was split into PP-117–PP-122 and is not listed here.

### P0 — broken or blocking revenue/customers now (5)

| Ticket | Title | Status | Area |
|--------|-------|--------|------|
| PP-101 | Remove unverifiable social proof, ratings schema, and placeholder testimonials | ✅ Done (live 2026-11-25; Tylor copy follow-up remains) | SEO / AEO |
| PP-103 | Fix inherited canonicals, doubled titles, and page-level social metadata | ✅ Done (live 2026-11-25) | SEO / AEO |
| PP-104 | Allow public OG images and add favicon/logo assets | ✅ Done (live 2026-11-25) | SEO / AEO |
| PP-152 | E2E: checkout to Pro (Stripe test mode + webhook → plan active) | 🟡 Partly done (backend integration #99; Stripe test-mode browser run blocked on test keys) | E2E |
| PP-153 | E2E: cancel subscription and billing portal | 🟡 Partly done (backend integration #99; Stripe test-mode browser run blocked on test keys) | E2E |

### P1 — next up, high impact (7)

| Ticket | Title | Status | Area |
|--------|-------|--------|------|
| PP-238 | Holiday recipe collection and first holiday batch (/recipes/holiday/) | ✅ Live (build `f73f60a`, [#166](https://github.com/thindery/pantry-pal/pull/166)) | Growth / recipes |
| PP-239 | Public recipe library expansion (~60 more recipes, images with each batch) | ✅ Live (build `336b82a`, [#171](https://github.com/thindery/pantry-pal/pull/171); also #167–#170) | Growth / recipes |
| PP-182 | Privacy must disclose AdSense ad cookies and analytics accurately (legal audit 2026-11-25) | ✅ Done (live 4:11 PM CT, `1fab3f1`, [#120](https://github.com/thindery/pantry-pal/pull/120)) | Legal |
| PP-181 | Don't cache or serve 1–2 character product names | ✅ Done (live 3:19 PM CT, `d70df3c`) | User-reported |
| PP-183 | AI recipe builder (Pro): recipes from my pantry, adjust, save, add missing; metered weekly tokens, fail closed | ✅ Live 4:34 PM CT, `c5cbe9a` ([#122](https://github.com/thindery/pantry-pal/pull/122)); on for Pro, caps 40k/user, 200k global per week | Pro AI |
| PP-105 | Indexation hygiene: 404 unknown routes, slash/sitemap/robots, noindex auth/checkout | ✅ Done (live 2026-11-25) | SEO / AEO |
| PP-106 | Honest, valid JSON-LD and FAQ answers present in the HTML | ✅ Done (live 2026-11-25) | SEO / AEO |
| PP-107 | HTTP should 301 to HTTPS (the "500" came from the checker's proxy) | ✅ Closed — already satisfied (301 verified 2026-11-25) | SEO / AEO |
| PP-108 | First public content set and truthful landing (Quick Scan, receipts, screenshots) | ✅ Done (live 2026-11-25) | SEO / AEO |
| PP-166 | $1 first-month offer test on Pro monthly (live Nov 25, 1:57 PM CT) | ✅ Done (live) | Revenue |
| PP-148 | E2E: sign-up and login | 📋 Backlog | E2E |
| PP-230 | Security dependency bumps: Next 16.4.6, next-auth beta.32, @auth/core 0.41.3, zod 4.6.7 (npm audit: 4 critical, 5 high → 0) | P0 | ✅ Live Nov 26, build `2946760` ([#145](https://github.com/thindery/pantry-pal/pull/145)) |
| PP-231 | Backend security bumps: FastAPI 0.165 / Starlette 1.10, Pillow 13, python-jose 3.5 (pip-audit: 93 advisories fixed) | P0 | ✅ Live Nov 26, build `2946760` ([#147](https://github.com/thindery/pantry-pal/pull/147)) |
| PP-232 | Replace python-jose with PyJWT (pip-audit now clean) | P2 | ✅ Live Nov 26, build `2946760` ([#153](https://github.com/thindery/pantry-pal/pull/153)) |
| PP-233 | Nightly database backup (cron 2:30 AM CT, 14 days, restore tested). Off-server copy is Tylor's call | P0 | ✅ Live Nov 26 |
| PP-189 | Robust recipe-to-pantry ingredient matching (butter / heavy cream false Missing badges) | ✅ Done (live 11:21 AM CT, `bd8cf4f`, [#131](https://github.com/thindery/pantry-pal/pull/131)) | User-reported |
| PP-200 | Session-aware public recipe chrome: logged-in header, app nav, pantry match, save to My recipes | 🟡 In progress | User-reported |

### P2 — soon (12)

| Ticket | Title | Status | Area |
|--------|-------|--------|------|
| PP-193 | Capture-only public recipe newsletter signup (no emails sent) | ✅ Live behind flags (build `92a55d6`, #144) | Growth / recipes |
| PP-192 | Compact recipes page: tabs for the AI generator, denser recipe cards | ✅ Live (build c053497) | Recipes UX |
| PP-190 | Combine similar pantry items (display only, on by default, opt-out; PP-189 normalizer) | ✅ Live (79012f3, #143) | User-reported |
| PP-186 | Receipt scan AI: Ollama Cloud default, Gemini fallback, admin toggle ([#119](https://github.com/thindery/pantry-pal/pull/119); live 4:10 PM CT Nov 25, build `32cb176`, migration 031 app_settings, `AI_RECEIPT_SCAN_ENABLED=1`) | ✅ Done | Pro AI |
| PP-110 | AEO content cluster and comparison pages | ✅ Done (live 2026-11-25) | SEO / AEO |
| PP-111 | Free directory/community plan — drafts only until Tylor approves | 📋 Open (drafts filed; nothing submitted) | SEO / AEO |
| PP-114 | Revisit social proof with real data (testimonials, counts, Review schema) | 📋 Backlog | SEO / AEO |
| PP-115 | Nearby grocery weekly ads / deals search | 📋 Backlog | Features |
| PP-119 | Import mypantryhub.com into Bing Webmaster Tools from Search Console | 📋 Open — needs Tylor sign-in | Analytics / GSC |
| PP-121 | Mint read-only analytics API keys for dashboards / Pantry Hub Lead | 📋 Open (CF token done) | Analytics / GSC |
| PP-136 | Promo or trial-ending reminder (only if relevant) | ✅ Done (Nov 25) | Email design |
| PP-139 | Public first-party recipes and affiliate links | 📋 Open | Revenue options |
| PP-140 | Free-tier and public-recipe ads (Bragle rules) | 📋 Open | Revenue options |
| PP-191 | "I used this" / "I cooked this" pantry consumption flow (MVP built) | ✅ Live (eeb003f, #148) | Recipes / pantry UX |

### P3 — someday (2)

| Ticket | Title | Status | Area |
|--------|-------|--------|------|
| PP-129 | Optional full-access Resend read key | 📋 Backlog — needs Tylor’s yes | Marketing dashboard |
| PP-137 | Low-stock or expiring-items digest (only if relevant) | ✅ Built, off (Nov 25) | Email design |

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
| PP-067 | Tighten CSP (unsafe-eval/inline) | P2 | ✅ Done (#88, overnight 2026-11-25) |
| PP-068 | Gitleaks secret scan in CI | P2 | ✅ Done |
| PP-069 | Sanitize Stripe webhook error responses | P2 | ✅ Done |
| PP-070 | nginx require-cloudflare include (ops) | P2 | ✅ Done (template; host reload pending deploy) |
| PP-071 | Trusted proxy IP for rate limiting | P2 | ✅ Done |
| PP-072 | Gate public design-system | P3 | ✅ Done (#89, overnight 2026-11-25) |
| PP-073 | Add security.txt | P3 | ✅ Done (live 200 after deploy) |
| PP-074 | Remove/harden Clerk JWT fallback | P3 | ✅ Done |

**Ship:** Deploy main so production picks up PP-065–074 (nginx require-cloudflare, TRUST_PROXY=1, security.txt).

---


## User-reported bugs

| Ticket | Title | Priority | Status |
|--------|-------|----------|--------|
| PP-075 | Barcode scan manual name commits after first letter | P1 | ✅ Done |
| PP-076 | Quick Scan mode on the Scan Barcode screen | P1 | ✅ Done |
| PP-077 | Enable Stripe promotion codes on Checkout | P1 | ✅ Done |
| PP-078 | Fix Stripe webhook crash on current period fields | P0 | ✅ Done |
| PP-079 | Self-host fonts and fail loudly on deploy build errors | P1 | ✅ Done |
| PP-080 | Improve barcode scanner reliability (partial reads, focus, shadows) | P1 | ✅ Done |
| PP-081 | Quick Scan running session ledger with +/− | P1 | ✅ Done |
| PP-082 | Single top image toast in Quick Scan | P1 | ✅ Done |
| PP-083 | Compact Scan header and pinned session ledger | P1 | ✅ Done |
| PP-084 | Fix oversized Scan camera hiding the session ledger | P1 | ✅ Done |
| PP-085 | Compact pantry list, thumbnails, and sort options | P1 | ✅ Done |
| PP-086 | Compact camera controls and wrapping session names | P1 | ✅ Done |
| PP-087 | Barcode lookup fallback when Open Food Facts is down | P0 | ✅ Done |
| PP-088 | One pantry row per product, quantities summed | P0 | ✅ Done |
| PP-089 | Refund extra Stripe charges and stop duplicate checkouts | P0 | ✅ Done |
| PP-156 | Unify shopping-list products and default the need/target to 1 | P1 | ✅ Done |
| PP-158 | Paste fallback when a recipe site blocks URL import | P1 | ✅ Done (live `f7c43f4`) |
| PP-159 | Replace native browser dialogs with in-app confirm and toasts | P2 | ✅ Done (live `f388d55`) |
| PP-160 | Item groups: combine different SKUs that are the same thing | P1 | ✅ Done (live `e739760`) |
| PP-161 | Suggested matches at the top of the Group with… picker | P2 | ✅ Done (live `67a20c9`) |
| PP-162 | Remove from pantry button in the Item Details sheet | P1 | ✅ Done (live `67a20c9`) |
| PP-163 | Keep activity history when an item is removed; log a Removed activity | P1 | ✅ Done (live `613d37d`) |
| PP-165 | GA4 key events (sign_up, begin_checkout, purchase) and login_events rows | P1 | ✅ Done (live `9b19fa8`) |
| PP-167 | Handle customer.subscription.created before enabling it on the live webhook (commit messages say PP-166) | P0 | ✅ Done (live `0753f20`) |
| PP-166 | $1 first-month offer on Pro monthly ([PR #62](https://github.com/thindery/pantry-pal/pull/62), branch `pp-offer-1dollar`) | P1 | ✅ Done — live Nov 25 1:57 PM CT (coupon `pro-monthly-first-month-1usd`) |
| GROWTH-001 | Duplicate subscription checkout (Remy report) | P0 | ✅ Closed — duplicate of PP-089 to PP-094; live webhook now includes refund + subscription.created events |

## Billing & email audit (2026-11-22)

**Doc:** `.agents/docs/billing-and-email.md`  
Provider: Stripe billing, Resend for app email (dedicated mypantryhub.com account; domain verified; send helper live).  
Each hardening item and each missing transactional email is its own ticket.

| Ticket | Title | Priority | Status |
|--------|-------|----------|--------|
| PP-090 | Sync Pro entitlement when invoice.paid arrives | P0 | ✅ Done |
| PP-091 | Persist and de-duplicate Stripe webhook events | P1 | ✅ Done |
| PP-092 | Set the Stripe customer email from the signed-in user | P1 | ✅ Done |
| PP-093 | Keep Pro access until cancel-at-period-end actually ends | P1 | ✅ Done |
| PP-094 | Handle Stripe refund webhooks | P2 | ✅ Done |
| PP-095 | Finish Resend DNS — DKIM, apex SPF, and tighter DMARC | P2 | ✅ Done |
| PP-096 | Wire a Resend send helper and env keys | P1 | ✅ Done |
| PP-097 | Send a welcome email on first sign-in | P2 | ✅ Done |
| PP-098 | Send a payment / subscription confirmation email | P1 | ✅ Done |
| PP-099 | Send a payment-failed email | P1 | ✅ Done |
| PP-100 | Send a cancellation confirmation email | P2 | ✅ Done |
| PP-112 | Reconcile Stripe subscriptions with the app DB after the webhook outage | P0 | ✅ Done |
| PP-113 | Fix deploy abort when the Ralph ticket regex misses | P1 | ✅ Done |
| PP-116 | Compact shopping list rows, slimmer chrome, and fix suggested-qty formula | P1 | ✅ Done |


## SEO / AEO / marketing audit (2026-11-22)

**Doc:** `.agents/docs/seo-aeo-audit-2026-11-22.md`  
Live site + repo audit for signups via organic/AEO and a $0 marketing plan. July PP-031 / REMY-610–616 were marked complete; several of those items are still wrong or broken on the live site. These tickets supersede that “done” claim for marketing SEO/AEO. No deploy and no public posts from this audit.

| Ticket | Title | Priority | Status |
|--------|-------|----------|--------|
| PP-101 | Remove unverifiable social proof, ratings schema, and placeholder testimonials | P0 | ✅ Done (live 2026-11-25; Tylor copy follow-up remains) |
| PP-102 | Stop advertising the decommissioned Voice Assistant / Gemini | P0 | ✅ Done |
| PP-103 | Fix inherited canonicals, doubled titles, and page-level social metadata | P0 | ✅ Done (live 2026-11-25) |
| PP-104 | Allow public OG images and add favicon/logo assets | P0 | ✅ Done (live 2026-11-25) |
| PP-105 | Indexation hygiene: 404 unknown routes, slash/sitemap/robots, noindex auth/checkout | P1 | ✅ Done (live 2026-11-25) |
| PP-106 | Honest, valid JSON-LD and FAQ answers present in the HTML | P1 | ✅ Done (live 2026-11-25) |
| PP-107 | HTTP should 301 to HTTPS (the "500" came from the checker's proxy) | P1 | ✅ Closed — already satisfied (301 verified 2026-11-25) |
| PP-108 | First public content set and truthful landing (Quick Scan, receipts, screenshots) | P1 | ✅ Done (live 2026-11-25) |
| PP-109 | Add Search Console and $0 analytics (split into PP-117–PP-122) | P1 | 📋 Split |
| PP-110 | AEO content cluster and comparison pages | P2 | ✅ Done (live 2026-11-25) |
| PP-111 | Free directory/community plan — drafts only until Tylor approves | P2 | 📋 Open (drafts in `.agents/docs/pp-directory-drafts.md`; nothing submitted) |


## Analytics / Search Console (2026-11-22)

**Doc:** `.agents/docs/analytics-and-search-console.md`  
Follow-up to PP-109 after Tylor asked to put analytics and Search Console under tickets. Shipped to production in deploy `db0ef3e` on 2026-11-22 (analytics commit `4d58e1f`). Cloudflare read-only API token is in the Mini Keychain (PP-121 still needs the GA4 Viewer).

| Ticket | Title | Priority | Status |
|--------|-------|----------|--------|
| PP-117 | Create a GA4 property and add a consent-safe tag with key events | P1 | ✅ Done |
| PP-118 | Verify mypantryhub.com in Search Console and submit the sitemap | P1 | ✅ Done |
| PP-119 | Import mypantryhub.com into Bing Webmaster Tools from Search Console | P2 | 📋 Open — needs Tylor Microsoft login |
| PP-120 | Ship the Cloudflare Web Analytics beacon and allow it in CSP | P1 | ✅ Done |
| PP-121 | Mint read-only analytics API keys for dashboards / Pantry Hub Lead | P2 | 📋 Open (CF token done; GA4 SA still open) |
| PP-122 | Update the privacy policy to disclose analytics | P1 | ✅ Done |
| PP-130 | Privacy compliance (CCPA/CPRA, GPC, EU consent) | P1 | ✅ Done |
| PP-165 | GA4 key events (sign_up, begin_checkout, purchase) and login_events rows | P1 | ✅ Done (live `9b19fa8`) |


## Marketing dashboard (2026-11-22)

**Doc:** `.agents/docs/marketing-dashboard.md`  
Tylor asked for the same email-send visibility another project already has in admin. The match is the User Kudos **Emails** tab and Agent Paige **Recent Emails Sent** (gold standards). shipinaday `/ship-ops/marketing` is a blog/SEO page, not email stats. Pantry Hub already has `/admin` and the PP-096 send helper; `email_sends` is only an idempotency table, and the mypantryhub Resend key is send-only, so stats must come from the app DB plus a signed webhook — not the Resend read API. No feature code in this pass (agy / Hermes later).

| Ticket | Title | Priority | Status |
|--------|-------|----------|--------|
| PP-123 | Extend `email_sends` and log every helper attempt | P1 | ✅ Done (#68, overnight 2026-11-25) |
| PP-124 | Resend webhook (signature + idempotency) and `email_events` | P1 | ✅ Done (#80, overnight 2026-11-25) |
| PP-125 | Admin Marketing section (sends, rates, failures, opt-outs) | P2 | ✅ Done (#87, overnight 2026-11-25) |
| PP-126 | Subscription funnel tiles (signups, trials, Pro, churn) | P2 | ✅ Done (#81, overnight 2026-11-25) |
| PP-127 | Links out to GA4 / Search Console / Cloudflare (do not duplicate PP-117–PP-122) | P2 | ✅ Done (#90, overnight 2026-11-25) |
| PP-128 | Admin auth hardening leftovers | P2 | ✅ Done (#77, overnight 2026-11-25) |
| PP-129 | Optional full-access Resend read key | P3 | 📋 Backlog — needs Tylor’s yes |

## Email design (2026-11-22)

**Doc:** `.agents/docs/email-design-plan.md`  
Tylor liked the first live payment-confirmation mail but found it visually bare, and asked that contact be `hello@mypantryhub.com` (not `info@`). The branded layout and P1 templates shipped to production in deploy `db0ef3e` on 2026-11-22 (commits `4a37701` and `9aeb045`). Bragle’s reference is the table-based Supabase auth templates (Brevo), not React Email. PP-130 is reserved for another worker’s privacy ticket and is not part of this set.

| Ticket | Title | Priority | Status |
|--------|-------|----------|--------|
| PP-131 | Shared branded email layout | P1 | ✅ Done |
| PP-132 | Welcome / onboarding email with first-scan tips | P1 | ✅ Done |
| PP-133 | Payment confirmation — what the plan unlocks | P1 | ✅ Done |
| PP-134 | Payment-failed email design | P1 | ✅ Done |
| PP-135 | Cancellation and win-back email design | P2 | 📋 Open |
| PP-136 | Promo or trial-ending reminder (only if relevant) | P2 | ✅ Done Nov 25 (`invoice.upcoming` live) |
| PP-137 | Low-stock or expiring-items digest (only if relevant) | P3 | ✅ Built, off until Tylor OKs the copy |

## Revenue options (2026-11-22)

**Doc:** `.agents/docs/revenue-options.md`  
Tylor asked for more revenue ideas (saved recipes, first-party recipes with affiliate links, ads on the free tier and on recipe pages) and to look at what Bragle did. Research only in this pass: no code, no deploy, and no program signups. Official program terms are cited in the doc; dollar figures are published rates or labeled estimates, not forecasts.

| Ticket | Title | Priority | Status |
|--------|-------|----------|--------|
| PP-138 | Saved recipes and cook-from-pantry | P1 | ✅ Done (live `edf52c0`) |
| PP-158 | Paste fallback when a recipe site blocks URL import | P1 | ✅ Done (live `f7c43f4`) |
| PP-139 | Public first-party recipes and affiliate links | P2 | 📋 Open |
| PP-140 | Free-tier and public-recipe ads (Bragle rules) | P2 | 📋 Open |


## Design review (2026-11-22)

**Doc:** `.agents/docs/design-review-2026-11-22.md`  
**Shots:** `.agents/design-review/2026-11-22/`  
Tylor asked for a designer-style review of every screen, in the same spirit as Bragle’s design critique, and for updates that refine brand and UI/UX. Production marketing pages were captured at 390 and 1440; logged-in screens used a local fixture of the real components with generic sample items (no customer data). Do not duplicate PP-103 (titles) or PP-108 (H1, screenshots, unshipped claims).

| Ticket | Title | Priority | Status |
|--------|-------|----------|--------|
| PP-141 | Fix logged-out `/pricing/` CTAs and the sign-in upgrade path | P0 | ✅ Done (live; in every deploy since db0ef3e) |
| PP-142 | Accessible color tokens (primary / accent / danger split) | P1 | ✅ Done (live; in every deploy since db0ef3e) |
| PP-143 | Marketing UX: sticky-nav overlap, CTA weight, numeral contrast | P1 | ✅ Done (live; in every deploy since db0ef3e) |
| PP-144 | Sign-in and checkout brand + contrast | P1 | ✅ Done (#75, overnight 2026-11-25) |
| PP-145 | Desktop Pantry layout and 44px icon targets | P2 | ✅ Done (#82, overnight 2026-11-25) |
| PP-146 | Refresh `/design-system` to the shipped UI and brand guide | P2 | ✅ Done (#86, overnight 2026-11-25) |


## E2E regression suite (2026-11-22)

Tylor asked for Pantry Hub to keep working with no regressions. Tickets only in this pass (no implementation, no installs, no deploys). Coding later is agy or Hermes. All path tickets depend on the PP-147 harness. Billing/entitlement paths (PP-152, PP-153) are P0. Stripe keys are TEST mode from server/CI env only; Resend assertions use a mock or test sink and must never email real customers.

| Ticket | Title | Priority | Status |
|--------|-------|----------|--------|
| PP-147 | E2E harness (official Playwright) and pre-deploy smoke gate | P1 | ✅ Done (#74, overnight 2026-11-25) |
| PP-148 | E2E: sign-up and login | P1 | 📋 Backlog |
| PP-149 | E2E: barcode scan including Quick Scan | P1 | ✅ Done (#95 + #96, overnight 2026-11-25) |
| PP-150 | E2E: inventory quantity +/- | P1 | ✅ Done (#92, overnight 2026-11-25) |
| PP-151 | E2E: shopping list | P1 | ✅ Done (#93, overnight 2026-11-25) |
| PP-152 | E2E: checkout to Pro (Stripe test mode + webhook → plan active) | P0 | 🟡 Partly done (backend integration #99; Stripe test-mode browser run blocked on test keys) |
| PP-153 | E2E: cancel subscription and billing portal | P0 | 🟡 Partly done (backend integration #99; Stripe test-mode browser run blocked on test keys) |
| PP-154 | E2E: transactional emails triggered | P1 | ✅ Done (#97, overnight 2026-11-25) |
| PP-155 | E2E: analytics consent path | P2 | ✅ Done (#84, overnight 2026-11-25) |

## Future / backlog

Documented for later; no implementation in this pass.

| Ticket | Title | Priority | Status |
|--------|-------|----------|--------|
| PP-114 | Revisit social proof with real data (testimonials, counts, Review schema) | P2 | 📋 Backlog |
| PP-115 | Nearby grocery weekly ads / deals search | P2 | 📋 Backlog |
| PP-129 | Optional full-access Resend read key (needs Tylor’s yes) | P3 | 📋 Backlog |
| PP-147 | E2E harness (official Playwright) and pre-deploy smoke gate | P1 | ✅ Done (#74, overnight 2026-11-25) |
| PP-148 | E2E: sign-up and login | P1 | 📋 Backlog |
| PP-149 | E2E: barcode scan including Quick Scan | P1 | ✅ Done (#95 + #96, overnight 2026-11-25) |
| PP-150 | E2E: inventory quantity +/- | P1 | ✅ Done (#92, overnight 2026-11-25) |
| PP-151 | E2E: shopping list | P1 | ✅ Done (#93, overnight 2026-11-25) |
| PP-152 | E2E: checkout to Pro (Stripe test mode + webhook → plan active) | P0 | 🟡 Partly done (backend integration #99; Stripe test-mode browser run blocked on test keys) |
| PP-153 | E2E: cancel subscription and billing portal | P0 | 🟡 Partly done (backend integration #99; Stripe test-mode browser run blocked on test keys) |
| PP-154 | E2E: transactional emails triggered | P1 | ✅ Done (#97, overnight 2026-11-25) |
| PP-155 | E2E: analytics consent path | P2 | ✅ Done (#84, overnight 2026-11-25) |

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

## Instacart handoff (2026-11-25)

| Ticket | Title | Priority | Status |
|--------|-------|----------|--------|
| PP-178 | Send to Instacart (Beta) button on the shopping list (hidden until `INSTACART_API_KEY` is set) | P2 | ⛔ Blocked: Instacart IDP applications closed. Code merged ([#110](https://github.com/thindery/pantry-pal/pull/110)), dormant without `INSTACART_API_KEY` |

## Tickets from Tylor's Nov 25 voice call

| Ticket | Title | Priority | Status |
|--------|-------|----------|--------|
| PP-179 | Favorite (star) stores per ZIP code on the weekly-ads hub | P2 | ✅ Done (live 9:10 AM CT Nov 26, build `ceb4b7b`, migration 033) |
| PP-180 | Item Details modal title hidden under the desktop navbar (modal rendered inside `relative z-0` wrapper) | P2 | ✅ Done (live 5:03 PM CT, build `5fec893`, [#125](https://github.com/thindery/pantry-pal/pull/125)) |
| PP-184 | Free public recipe library for SEO: /recipes browse + recipe pages, AI images, ½×/2× serving scaler (coordinate with SEO & AEO Desk) | P2 | 🟢 Live (PUBLIC_RECIPES_INDEXABLE=true). Batch 2 illustrations shipped (PP-193). Signup CTAs on recipe pages. Tag pages still noindex. Newsletter capture is PP-193 |
| PP-185 | Generic "AI" wording, no model/vendor names (audit: none on the live site; 2 code comments + README) | P3 | ✅ Done (Nov 26, comments + README + a test that fails if a model name shows in customer-facing code) |
| PP-187 | Shopping list: tap name/picture for product info popup; clearer "Have X · need Y" reason line | P2 | ✅ Done (live 5:26 PM CT, build `a356ed4`, [#128](https://github.com/thindery/pantry-pal/pull/128)) |
| PP-188 | Run shared site-qa after every deploy (local step at the end of deploy/deploy-docker.sh; never fails the deploy; SITE_QA_SKIP=1 skips) | P2 | ✅ Done (Nov 26; hook run 12:51 PM CT: 0 findings) |

## Tickets from Tylor's Nov 26 reports

| Ticket | Title | Priority | Status |
|--------|-------|----------|--------|
| PP-189 | Robust recipe-to-pantry ingredient matching on the saved-recipe Ingredients card | P1 | ✅ Done (live 11:21 AM CT, build `bd8cf4f`, [#131](https://github.com/thindery/pantry-pal/pull/131)) |
| PP-190 | Combine similar pantry items using the PP-189 normalizer (display grouping, default on, opt-out) | P2 | ✅ Live (79012f3) |
| PP-192 | Compact recipes page: move the AI generator into a **Suggest with AI** tab; dense list cards so more recipes fit on a phone | P2 | ✅ Done (live Nov 26, build c053497, [PR #132](https://github.com/thindery/pantry-pal/pull/132)) |

## Tickets from Tylor's Nov 26 "I used this" request

| Ticket | Title | Priority | Status |
|--------|-------|----------|--------|
| PP-191 | "I used this" / "I cooked this" flow: recipe checklist, pantry typeahead, scan-to-use (design only; see `.agents/docs/i-used-this-flow-design.md`) | P2 | ✅ Live MVP (eeb003f) |

## Email journeys (Tylor Nov 26, t79u / t80u / t81u)

| Ticket | Title | Priority | Status |
|--------|-------|----------|--------|
| PP-194 | Email journeys foundation: send gate (`EMAIL_JOURNEYS_ENABLED`), journey state, click/confirm/unsubscribe endpoints | P2 | ✅ Live and on Nov 26, 6:33 PM CT (code since build `92a55d6`, [#144](https://github.com/thindery/pantry-pal/pull/144)). `EMAIL_JOURNEYS_ENABLED=true`; 15-min cron; first run sent 0 |
| PP-195 | Recipe newsletter double opt-in + 3-email welcome journey + one-click unsubscribe | P2 | ✅ Live Nov 26, 6:33 PM CT. Copy approved (t96u). No confirm emails to existing PP-193 subscribers (0 pending rows on prod; first run `confirmations: 0`) |
| PP-196 | Onboarding journey for new app signups (scan first item, recipes, Pro) | P2 | ✅ Live Nov 26, 6:33 PM CT. Copy approved (t96u). `EMAIL_ONBOARDING_SINCE=2026-11-27T00:32:58+00:00`; existing 3 users not enrolled; first run `enrolled_users: 0` |
| PP-197 | Activate the Resend webhook (PP-124) + first-party click tracking | P2 | ✅ Live Nov 26. Webhook on the mypantryhub Resend account; secret in `.env.prod` only; `email.sent`/`email.delivered` landed in Marketing. Tracking CNAME `links.mypantryhub.com` ([#157](https://github.com/thindery/pantry-pal/pull/157)) |
| PP-198 | Admin email dashboard: subscribers, journeys, clicks, events | P2 | ✅ Live. Admin -> Marketing is in production and showed live webhook events from a [TEST] send |
| PP-199 | Imagery in emails: heroes, recipe cards, credits, AI gap list | P2 | ✅ Live. Heroes on build `596be58`; Cloudflare `/email/*` skip verified with GoogleImageProxy UA; copy approved (t96u); journeys on 6:33 PM CT Nov 26 |
| PP-234 | Ship approved real Pexels photos on R3 / O1 / O3 hero slots; keep welcome as-is | P2 | ✅ Live Nov 26, 3:51 PM CT, build `596be58`, [#155](https://github.com/thindery/pantry-pal/pull/155). Journeys went live 6:33 PM CT the same day (copy approved, t96u) |
| PP-235 | Weekly recipe newsletter: 3 rotating recipes + 1 tip, Wed 9 AM CT draft + [TEST] copy to Tylor, admin Approve & send, `EMAIL_WEEKLY_AUTO_SEND` (off), per-issue stats | P2 | ✅ Live Nov 26, ~7:25 PM CT, build `95ce29d`, [#159](https://github.com/thindery/pantry-pal/pull/159). Cron installed; 2026-W48 draft + [TEST] copy to Tylor only. Nothing sent to the list until approved |
| PP-236 | Admin dashboard 401: admin client sent no bearer token (relied on middleware injection); now uses `getBearerToken` + 401 retry. Regular users unaffected | P0 | ✅ Live Nov 26, build `8962809` ([#161](https://github.com/thindery/pantry-pal/pull/161)) |
| PP-237 | /admin crashed once the API returned data: dashboard payload did not match UI types (no `alerts`, cents, etc.); added normalizer + test on live payload shapes | P0 | ✅ Live Nov 26, build `30cac52` ([#163](https://github.com/thindery/pantry-pal/pull/163)) |

## Tickets from Tylor's Nov 26 public-recipe session report (t84u / t85u)

| Ticket | Title | Priority | Status |
|--------|-------|----------|--------|
| PP-200 | Public recipe pages show Sign in when he is logged in; signed-in chrome should match the app (dashboard nav, Back to my recipes, pantry match, Save to my recipes) | P1 | 🟡 In progress |
