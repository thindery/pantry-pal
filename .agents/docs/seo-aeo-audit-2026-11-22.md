# Pantry Hub SEO / AEO / marketing audit

**Date:** Sunday, Nov 22, 2026 (America/Chicago)  
**Site:** https://www.mypantryhub.com  
**Repo:** `/Users/thindery/projects/pantry-pal` on the Mac Mini (`8a223c3e-6b17-4a6f-abeb-282f4439c0c6`)  
**Repo copy:** `.agents/docs/seo-aeo-audit-2026-11-22.md` in pantry-pal (same content).
**Auditor:** SEO & AEO Desk  
**Scope:** Live site from the box (curl/WebFetch, not the Mini), read-only repo audit on the Mini, content/AEO gaps, $0 marketing plan, PP tickets. No deploy. No public posts, signups, or outreach. No invented search volumes or analytics numbers.

**Live HEAD at audit time:** after later check, origin/main included `78427fd` (PP-089 Stripe checkout cleanup). Public marketing issues below were still live on the site when fetched.

**Related prior work:** PP-031 and REMY-610–616 (July 2026) were marked complete and described the site as “fully optimized.” This audit finds several of those items broken or inaccurate on the live site. New tickets PP-101–PP-111 supersede that “done” claim for marketing SEO/AEO. Do not treat the July tickets as current truth.

---

## 1. Live-site technical SEO

### What is indexed / public today

`robots.txt` allows `/` and disallows `/dashboard/`, `/admin/`, `/api/`. Sitemap lists only five URLs:

- `https://www.mypantryhub.com` (no trailing slash)
- `/pricing/`, `/privacy/`, `/terms/`, `/auth/signin/`

Homepage canonical is `https://www.mypantryhub.com/` (with slash). Sitemap loc and canonical disagree for the home URL.

A `site:` query through the available web search tool returned no hits (tool limitation — not proof of zero indexation). A broader web search did surface the homepage, Privacy, and Terms. Pricing is weaker/absent in those results, which is consistent with the broken canonical (below). There is no verified Google Search Console count in this audit; do not invent one.

### HTTPS, host, and HTTP

- `https://mypantryhub.com` → 301 to `https://www.mypantryhub.com/` (good).
- `https://www.mypantryhub.com` and the trailing-slash homepage both 200 (no slash redirect).
- `http://mypantryhub.com/` and `http://www.mypantryhub.com/` return **HTTP 500** from Pingora, empty body. They should 301 to HTTPS. HSTS is set on HTTPS responses (`max-age=31536000; includeSubDomains`) but HTTP never gets a chance to redirect.

### Trailing slashes

`next.config.ts` sets `trailingSlash: true` and `skipTrailingSlashRedirect: true`. Live, `/pricing` and `/pricing/` (and the same for privacy, terms, sign-in) both return 200 with duplicate HTML. That is duplicate-URL risk.

### Titles, descriptions, canonicals

| Page | Title | Canonical | Notes |
|------|-------|-----------|--------|
| Home | Pantry Hub: Smart Inventory & Shopping Lists | `https://www.mypantryhub.com/` | Unique title/description. OG title differs: “Pantry Hub \| Smart Home Inventory”. |
| Pricing | **Simple Pricing - Start Free \| Pantry Hub \| Pantry Hub** | **`https://www.mypantryhub.com/`** (homepage) | Brand doubled. Canonical points at home, so Google may treat pricing as a home duplicate. |
| Privacy | Privacy Policy \| Pantry Hub | `/privacy/` | OK; uses `createPageMetadata`. |
| Terms | Terms of Service \| Pantry Hub | `/terms/` | OK. |
| Sign in | **Sign In — Pantry Hub \| Pantry Hub** | **homepage** | Indexable, in the sitemap, but canonicalized to home. |
| Auth error | Sign In Error — Pantry Hub \| Pantry Hub | homepage | `index, follow`. |
| Checkout success | inherits default home-style title | homepage | H1 “Welcome to Pro!”. `index, follow`. |
| Checkout cancel | same | homepage | H1 “Checkout Cancelled”. `index, follow`. |
| Design system | Design System (PP-042) \| Pantry Hub | homepage | `noindex, nofollow` (good), but the page is a public 200. Overlaps open PP-072. |

Root cause: `frontend/app/layout.tsx` sets `alternates.canonical: SITE_URL` and a title template `%s | Pantry Hub`. Privacy/terms override canonical via `createPageMetadata`. Pricing and sign-in do not, so they inherit the homepage canonical. Pricing’s title already includes “\| Pantry Hub”, so the template doubles it.

### Open Graph / Twitter / assets

- Home OG/Twitter image is `https://www.mypantryhub.com/og-image`. That route **exists in the repo** (`app/og-image/route.tsx`, Next `ImageResponse`) but middleware is not on the public allowlist, so live it **307s to `/auth/signin?callbackUrl=/og-image`**.
- Pricing `og:image` is `/pricing/og-image` — same 307-to-signin bug. Pricing Twitter image still points at the broken `/og-image`.
- `https://www.mypantryhub.com/logo.png` → 404 (Organization JSON-LD logo).
- `https://www.mypantryhub.com/og-image.png` → 404 (SoftwareApplication screenshot).
- `favicon.ico`, `apple-touch-icon.png`, and other common icons → 404. `frontend/public/` only has `build-id.txt` and `.well-known/security.txt`.
- `/.well-known/security.txt` is live 200 (PP-073).

Social shares and crawlers that fetch the OG URL will land on a sign-in page, not a 1200×630 image.

### JSON-LD

Four blocks on the homepage: Organization, WebSite, SoftwareApplication, FAQPage.

Problems:

1. **SoftwareApplication.aggregateRating** is `4.8` with **`ratingCount: 50000`**. The product has one paying subscriber. There is no evidence of 50,000 ratings, and no App Store listing for this Pantry Hub (a different “Kitchen Hub” app appeared in search). This is policy-risking review markup, not a cosmetic issue.
2. `operatingSystem` is `"Web, iOS, Android"` for a web app.
3. `logo` and `screenshot` URLs 404.
4. **WebSite SearchAction** points at `/search?q={search_term_string}`, which 307s to sign-in. There is no public search.
5. Organization `sameAs` is empty (fine until real profiles exist).
6. FAQPage lists 5 questions. Only the first answer is in the visible FAQ HTML. Answers 2–5 exist in JSON-LD only until the client accordion is opened, so the schema does not match visible HTML. Google’s FAQ rich-result rules expect the answers to be present on the page (collapsed markup is OK if the text is in the HTML).
7. Testimonials use `itemProp="reviewBody"` / `name` but there is no standalone Review JSON-LD. The quotes read as placeholders (Sarah M., James K., Alex T.).
8. `AggregateRatingSchema` exists in source (`4.8` / `50000`) though it did not appear as a fifth script on the live homepage.

Pricing/legal pages only get Organization + WebSite from the root layout (including the broken SearchAction).

### Indexable vs app-gated routes

Public marketing surface is very small: home, pricing, privacy, terms, plus an indexable sign-in page.

Middleware `PUBLIC_PATHS` includes `/`, `/pricing`, `/privacy`, `/terms`, `/checkout`, `/checkout/success`, `/checkout/cancel`, `/auth/signin`, `/auth/error`, `/build-id.txt`, `/sitemap.xml`, `/robots.txt`, `/design-system`. It does **not** include `/og-image` or `/pricing/og-image`.

Anything else, if the visitor is logged out, **307s to sign-in**, including:

- Unknown URLs such as `/this-page-does-not-exist-xyz` (should be 404)
- `/blog`, `/features`, `/about`, `/help`, `/docs`, `/faq` (as a path), `/search`
- The OG image routes

Real 404s do exist for some static files (`favicon.ico` returns Next’s 404 with `noindex`). Most missing *pages* never get a 404.

`/dashboard` and `/admin` correctly redirect to sign-in. Robots already disallows those prefixes.

### Headings, links, media, speed basics

- H1: “Smart Inventory & Ledger for Your Home” — “Ledger” is product jargon, not how people search.
- Heading order is otherwise sensible (H1 → feature H2/H3, pricing, FAQ).
- Internal links are thin: nav/footer are Features (`/#features`), Pricing, FAQ (`/#faq`), Privacy, Terms, Sign in. No guides, no feature pages, no blog. Pricing is a near-duplicate of the home pricing block.
- **No `<img>` tags on the homepage.** No screenshots of Quick Scan, the pantry list, or receipt flow — the strongest real product work from PP-075–088 is not shown.
- Fonts are self-hosted (PP-079). From the box (PDX): homepage TTFB ~136 ms, HTML ~61 KB, CSS ~69 KB, prerender cache HIT. This is not a Lighthouse run and not a Core Web Vitals claim.
- CSP does not allow Google Analytics or GTM. Root layout has a commented GSC `verification` placeholder. No analytics or Search Console tags were observed on the live HTML.
- Keywords meta is copied across pages (low value; not harmful).

---

## 2. Repo audit (read-only)

Relevant files:

- `frontend/app/layout.tsx` — global metadata, homepage canonical, title template, OG `/og-image`
- `frontend/lib/site-metadata.ts` — `createPageMetadata` (used by privacy/terms only)
- `frontend/app/sitemap.ts` — five paths; `lastModified: new Date()` on every generation (every deploy/request looks freshly updated)
- `frontend/app/robots.ts` — dashboard/admin/api only
- `frontend/middleware.ts` — public allowlist + catch-all sign-in redirect
- `frontend/next.config.ts` — `trailingSlash` + `skipTrailingSlashRedirect`
- `frontend/components/SchemaMarkup.tsx` — Organization, WebSite SearchAction, SoftwareApplication + fake AggregateRating, unused AggregateRatingSchema
- `frontend/components/LandingPage.tsx` — stats, voice feature, placeholder testimonials, FAQs (client accordion renders only the open answer)
- `frontend/app/og-image/route.tsx` and `frontend/app/pricing/og-image/route.tsx` — implemented, blocked live
- `frontend/public/` — no favicon or logo
- No `app/blog`, no marketing feature/how-to routes

Product truth vs marketing (important for AEO honesty):

- Barcode scan, Quick Scan, receipt OCR (Tesseract, not Gemini), shopping lists, and the inventory ledger are real and recently improved (PP-075–088).
- **Voice Assistant was removed in PP-058** (`voice-assistant.tsx` deleted; scan-usage decommissioned). PP-058’s checkbox “Update marketing, privacy, and pricing copy” was marked done, but the landing page, pricing (“Voice assistant with Gemini”), and schema `featureList` still advertise it. `UpgradePrompt.tsx` still has a Voice Assistant lock screen.
- Landing advertises “4.8★ App Store Rating” and “50K+ Active Users” in `STATS`. There is no app-store presence for this product in the repo or in a straightforward web search.
- Dashboard UI has “Expiring Soon” / “Expired” filters with **hardcoded `value: 0`** in `dashboard-home.tsx`. Do not publish expiration-tracking content as a current product strength until that feature is actually implemented. This is a content-gap *opportunity*, not a claim to make today.
- Household sharing / Family plan is described in Stripe/marketing copy; this audit did not fully verify the sharing implementation. Comparison pages should only claim what is shipped.

Git convention does commit `.agents/tickets/` and `TICKET_STATUS.md`. Unrelated dirty file at audit start: untracked `2026-07-30` (left untouched).

---

## 3. Content gaps and AEO answer targets

Qualitative only. No Keyword Planner or GSC volumes were available; nothing below is a search-volume figure.

The live site has almost no indexable content besides a feature-list homepage, a pricing page that may not be indexed as its own URL, and legal pages. There is nothing for:

- How barcode pantry scanning works (and what to do when a code is missing or wrong)
- Quick Scan as a real differentiator
- Receipt scanning vs barcode vs manual entry — when to use which
- Shopping lists from low stock
- Honest pricing / free-tier limits (50 items, 5 receipt scans/month, single device)
- Comparisons people already read on other sites
- Food waste and expiry (only after the product supports it, or as clearly labeled general advice)

**Questions people actually ask** (from competitor guides, help centers, and comparison articles opened this audit — Pantry Check, NoWaste, Grocy, KitchenPal, What Is In My Pantry, Pantrifuge, PantryPrix, Pantry Raider, and similar 2026 roundups):

- What is the best pantry inventory app with a barcode scanner?
- How do I take inventory of my pantry with a barcode scanner?
- What happens when the barcode isn’t in the database / is the wrong size?
- Barcode vs receipt vs photo — which is accurate?
- How do I track expiration dates and reduce food waste?
- Can I share a pantry list with my household?
- Pantry Check vs NoWaste vs Grocy (and KitchenPal, Cooklist, spreadsheets)
- Is a self-hosted tool (Grocy) worth it vs a simple web app?
- How do I keep inventory accurate after cooking (scan out / decrement)?
- What is a reasonable free tier?

**Competitor positioning (qualitative, from those same public articles):**

- **Pantry Check** — barcode-first, crowd-sourced catalog, expiry alerts; often cited as the cleanest scan-to-inventory flow; free cap commonly quoted around 200 items; recipes usually not the point.
- **NoWaste** — expiry, waste reduction, reminders; recipes/locations often paid.
- **Grocy** — self-hosted, highly configurable, steeper setup; you can train barcodes.
- **KitchenPal** — broader toolkit (photo/voice/receipt, recipes); higher annual price in 2026 roundups.
- **Cooklist, What Is In My Pantry, Pantrifuge, Pantry Prix**, and others also compete in this space.
- **Name collision:** a separate product “Pantry Pal” (`pntrypal.com`) appears in 2026 roundups. This repo is still named `pantry-pal`. Public brand is correctly “Pantry Hub”; keep that consistent and do not leave “Pantry Pal” in public copy.

**Pantry Hub’s honest angle today (for future pages, not current copy):** a web app with a fast Quick Scan / barcode flow, receipt OCR, a shopping list from low stock, a free tier, Pro at $4.99/mo, Family at $7.99/mo. Do not lead with App Store ratings, 50K users, voice/Gemini, or expiry until those are true.

**Suggested first answer pages** (after technical fixes):

1. `/guides/barcode-pantry-scanner` or `/features/barcode-scanner` — how Quick Scan works, unknown barcodes, Open Food Facts / fallback (PP-087).
2. `/guides/scan-grocery-receipts` — Tesseract receipt flow, limits on Free (5/month), review-before-save.
3. A single honest `/compare/pantry-hub-vs-pantry-check` (and later NoWaste, Grocy) — only shipped features.
4. Expanded on-page FAQ with all answers in the HTML, including “what if a barcode isn’t found?”, “is there an iOS/Android app?” (honest: mobile web), “what happened to voice?” if anyone saw old copy.
5. Hold “expiration dates / food waste” until the feature is real, or write a careful general guide that does not claim Pantry Hub tracks expiry today.

---

## 4. Free-only ($0) marketing plan

**Status: plan and drafts only. No submissions, posts, signups, or outreach until Tylor says yes.** Same rule as JWA link building.

Source for directory names: Mini skill `~/.agents/skills/marketing/directory-submissions` (directory-list.md + alice-83 pack). DR figures there are approximate and drift; re-check before prioritizing. Prefer free listings. No PBNs, paid link farms, or paid expedites (BetaList expedite is paid — skip).

### Before any public listing

Do the P0 honesty and metadata fixes first. Do not launch or submit a site that claims 50K users, a 4.8 App Store rating, or a Gemini voice assistant. Product Hunt and review directories will punish that, and it is unfair to the first paying customer.

Also add a real favicon, a working OG image, and at least one product screenshot. Destination URL is the homepage (and later a specific guide), not `/auth/signin`.

### Directory layer (when Tylor approves)

Track in a new `docs/seo/backlink-tracker.md` (or the skill’s CSV template). Log only real submissions. Never invent `link_url` rows.

**First wave (fit, mostly free):**

- AlternativeTo — list as an alternative to Pantry Check, NoWaste, Grocy, KitchenPal (nofollow but high referral/SEO value).
- SaaSHub, SourceForge, Indie Hackers product page, Uneed, Peerlist, Fazier, Microlaunch, OpenHunts, Tiny Launch / similar low-competition launch dirs (free tiers only).
- Slant / “best pantry app” style pages only with honest copy.

**Hold until a real launch moment:**

- **Product Hunt** — highest leverage and easy to waste. Needs a 3-week warm-up, honest copy, a 60–90s demo, and a product that no longer shows fake social proof. Tue/Wed/Thu 12:01 AM PT is the skill default. Do not ask for upvotes.
- **Show HN** — only with a genuine technical hook (e.g. Quick Scan + lookup fallback + self-hosted fonts / the barcode reliability work). A generic “we launched a SaaS” post will be flagged. Nofollow.
- **BetaList** — free queue only if still eligible; no paid expedite.
- **G2 / Capterra / GetApp / Software Advice** — free listings exist, but they are review-driven and a poor fit with one subscriber and no real review corpus. Do not seed fake reviews. Revisit when there are genuine users willing to review.

**Skip for now:** paid badges, AI-only directories unless pitching a narrow receipt-OCR angle honestly, DevHunt unless the post is clearly technical.

### Communities (90/10; no links in first comments)

Possible homes, only after listening and answering: r/Cooking, r/EatCheapAndHealthy, r/frugal, r/mealprep, r/ZeroWaste, r/organization, r/household, r/SaaS (build-in-public, not spam), relevant Facebook/Reddit homesteading or family-budget threads. Indie Hackers milestones once the marketing claims are true.

Draft posts should offer a useful answer (how to scan a pantry, what to do when barcodes miss store brands) and mention Pantry Hub only when it is actually relevant. Default is draft-for-Tylor, not publish.

### Other $0 work

- Google Search Console + a $0 analytics option (GA4 or a privacy-friendly tool) — needs Tylor’s account and explicit yes. CSP will have to allow the chosen domains.
- Request indexing only after canonicals, OG routes, and honesty fixes are live.
- Comparison and how-to pages (PP-108 / PP-110) so directory and community links have a useful landing page.
- Do not spend on domains, paid tools, or ads.

---

## 5. Tickets filed

A parallel billing/email audit already claimed **PP-090–PP-100** (local commit `5a3fd1f`, ahead of origin at write time). These SEO/AEO tickets start at **PP-101**. New tickets:

| Ticket | Pri | Title |
|--------|-----|-------|
| PP-101 | P0 | Remove unverifiable social proof, ratings schema, and placeholder testimonials |
| PP-102 | P0 | Stop advertising the decommissioned Voice Assistant / Gemini |
| PP-103 | P0 | Fix inherited canonicals, doubled titles, and page-level social metadata |
| PP-104 | P0 | Allow public OG images and add favicon/logo assets |
| PP-105 | P1 | Indexation hygiene: 404 unknown routes, slash/sitemap/robots, noindex auth/checkout |
| PP-106 | P1 | Honest, valid JSON-LD and FAQ answers present in the HTML |
| PP-107 | P1 | HTTP should 301 to HTTPS (now returns 500) |
| PP-108 | P1 | First public content set and truthful landing (Quick Scan, receipts, screenshots) |
| PP-109 | P1 | Add Search Console and $0 analytics (needs Tylor’s yes) |
| PP-110 | P2 | AEO content cluster and comparison pages (no invented volumes; no unshipped features) |
| PP-111 | P2 | Free directory/community plan tracker — drafts only until Tylor approves |

### Top 3 quick wins

1. **PP-101 + PP-102** — Take down fake stats/ratings/testimonials and voice/Gemini claims. Highest trust and policy risk; also blocks any ethical launch.
2. **PP-104** — Allowlist `/og-image` and `/pricing/og-image`, add a favicon and logo. Small code change, fixes every share card and two 404 schema assets.
3. **PP-103** — Give `/pricing/` (and other pages) their own canonicals and clean titles so pricing can actually be indexed.

PP-105’s “404 instead of sign-in” and slash 301s are the next technical win after those three.

### Needs Tylor’s yes

- Replacement homepage proof (any new numbers, quotes, or “trusted by” line). Removing the false claims should not wait on new copy.
- Connecting Google Search Console and analytics (PP-109).
- Any directory submission, Product Hunt / Show HN / Indie Hackers / Reddit post, or outreach (PP-111). Drafts only until then.
- Whether expiration tracking is on the product roadmap (affects PP-110).
- Confirm voice/Gemini stays retired in public copy (already a PP-058 product decision).

JWA standing rules still apply here: $0 services, no invented GSC/GA4 numbers, external messages default to drafts, calm brand, Dev Ops deploys from a clean worktree when work is ready — this audit does not deploy.
