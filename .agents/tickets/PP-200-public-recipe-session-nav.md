# PP-200: Session-aware public recipe chrome (logged-in header + one-app feel)

**Status:** 🟡 In progress
**Priority:** P1
**Phase:** Public recipes / logged-in UX
**Created:** 2026-11-26, 1:10 PM America/Chicago
**Source:** Tylor (t84u phone screenshot of /recipes/leftover-rice-fried-rice/; t85u "feels disconnected when we go from dashboard recipes to the public recipes")
**Related:** PP-184 (public recipe library), PP-189 (pantry matcher)

Priority is P1 because a signed-in customer is shown "Sign in" / "Get started" on the public recipe pages and the library feels like a separate marketing site from the app.

---

## Problem

Tylor was logged in and opened a public recipe page. The marketing header still showed **Sign in** and **Get started**. Signup CTAs are already supposed to hide via `useSession()` once status is `unauthenticated` is false; the header never checked the session.

Going from **My recipes** in the dashboard to the public library also felt disconnected: different chrome, no way back, no pantry match, no save.

## Behavior

1. Keep `/recipes/` and recipe pages static/SSG. Do not resolve the session on the server. Signed-out HTML for the recipe body, JSON-LD, and crawler-facing content stays unchanged.
2. `MarketingNav` (recipes, legal, design-system, and any other page that uses it) is session-aware on the client:
   - While session status is unknown: render a neutral header (brand + Recipes/Pricing links, placeholder on the right). No flash of Sign in for a logged-in user.
   - Signed out: **Sign in** and **Get started**, as today.
   - Signed in: **Dashboard** (link to `/dashboard/`) and the account avatar/menu (`UserButton`) instead of Sign in / Get started.
3. On `/recipes/`, `/recipes/[slug]/`, and `/recipes/tag/[tag]/`, a signed-in user sees the app nav (same `DashboardNavbar` as the dashboard, including the mobile bottom tabs) plus a clear **Back to my recipes** link to `/dashboard/recipes/`.
4. The dashboard recipes page already has **Browse the public recipe library** → `/recipes/`. Keep that two-way link.
5. Each public recipe page, for signed-in users only (client-side):
   - Pantry match using the PP-189 matcher (`calculateRecipeCoverage`) against their pantry: **You have 6 of 9 ingredients**.
   - **Save to my recipes** via the existing `createRecipe` API. If the recipe is already saved (matching public source URL), show **Open in my recipes** instead.
6. Signup CTAs stay hidden for authenticated users (existing `RecipeSignupCta` logic). If the session is not recognized on `/recipes/` at all (missing `SessionProvider`, cookie domain/path, www vs apex), fix the root cause. (Provider is already in the root layout.)

## Out of scope

- Making recipe pages dynamic or changing `PUBLIC_RECIPES_INDEXABLE`
- Sending newsletter email, AdSense, or combine-similar-items (PP-190)
- Building the PP-191 "I used this" flow

## Acceptance Criteria

- [ ] Signed-out visitors still see the marketing header with Sign in / Get started
- [ ] Signed-in visitors on public recipe pages see the app nav (or at minimum Dashboard + account) and do not see Sign in / Get started
- [ ] No Sign in flash while the session is loading
- [ ] **Back to my recipes** links to `/dashboard/recipes/`
- [ ] Dashboard recipes page still links to `/recipes/`
- [ ] Signed-in recipe pages show a pantry match count from the PP-189 matcher, only after inventory loads
- [ ] Signed-in users can save a public recipe to My recipes, or open it if it is already saved
- [ ] Pages remain SSG; signup CTAs stay hidden when authenticated
