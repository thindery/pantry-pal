# PP-141: Fix logged-out /pricing/ CTAs and the sign-in upgrade path

**Status:** ✅ Done (pending deploy)
**Priority:** P0
**Phase:** Design review (2026-11-22)
**Created:** 2026-11-22
**Updated:** 2026-11-22, 4:55 PM America/Chicago
**Depends on:** —
**Blocks:** Honest conversion on the public pricing page
**Doc:** `.agents/docs/design-review-2026-11-22.md`

---

## Problem

On production `/pricing/`, a logged-out visitor sees **“Downgrade”** on the Free plan. `getCtaText` in `frontend/components/PricingPage.tsx` returns “Current Plan” only when `isFree` is true, and `useSubscription()` sets `isFree` only when `tierInfo?.tier === 'free'`. Logged-out (and still-loading) users have `tierInfo == null`, so Free falls through to “Downgrade.”

“Upgrade to Pro / Family” also does not take a logged-out visitor to sign-in. `handleUpgrade` sets an inline error (“Please sign in to upgrade”) and leaves them on the page. The public page is also an in-app modal (X close, H1 “Upgrade Your Pantry Experience”), which is the wrong chrome for a marketing URL.

## Behavior

- If the user is not signed in, or subscription has not loaded, Free CTA is “Get started free” (or equivalent) and starts sign-in / the free path. Never show “Downgrade” unless the user is actually on a paid plan and this control would move them to Free.
- “Current plan” only when that plan is confirmed for the signed-in user.
- Pro / Family CTAs, when logged out, go to `/auth/signin?callbackUrl=...` (back to pricing or straight into checkout after sign-in). Do not only show an error.
- Logged-out `/pricing/` should read as a marketing page (no “Downgrade,” a start-free H1 or “Simple, transparent pricing”), not an in-app upgrade modal. The in-app upsell can keep a close control.
- Do not invent features. “Family meal planning” is not in the app today — remove or do not promise it (see also PP-108 for other unshipped claims).

## Acceptance Criteria

- [ ] Logged-out GET `/pricing/` does not show the word “Downgrade”
- [ ] Logged-out Free CTA is a start-free action
- [ ] Logged-out Upgrade CTAs start sign-in (or checkout after sign-in), not only an inline error
- [ ] “Downgrade” appears only for a signed-in paid user
- [ ] “Family meal planning” is not listed unless the feature ships

## Out of scope

- Token / contrast work (PP-142)
- Landing H1 / product screenshots (PP-108)
- Title and canonical fixes (PP-103)
- Do not `git add -A`. Do not commit `2026-07-30`.
