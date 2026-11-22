# PP-140: Free-tier and public-recipe ads (Bragle rules)

**Status:** 📋 Open
**Priority:** P2
**Phase:** Revenue options (research 2026-11-22)
**Created:** 2026-11-22
**Updated:** 2026-11-22, 4:48 PM America/Chicago
**Depends on:** Public content (PP-108 / PP-139) before any AdSense application; privacy work in PP-122 and PP-130
**Blocks:** —
**Doc:** `.agents/docs/revenue-options.md`
**Source:** Tylor, 2026-11-22 (ads on the free tier; ads on our recipe pages regardless of plan). Placement model from Bragle.

---

## Problem

Display ads can support the free tier and can run on public recipe pages, but they will earn little until those pages have real traffic, and they will harm trust if they show up in a paid workspace or on scan / checkout. Bragle’s rule is the right default for the app: calm surfaces only, never during a critical action, never for paying customers. Tylor also wants ads on **public recipe pages** even if the reader is on Pro.

Mediavine and Raptive are not in reach yet (Journey starts at 5,000 premium-country sessions/month and a 4-month-old domain; Raptive at 25,000 pageviews/month with country-mix and domain-age rules). AdSense has no published traffic minimum but still needs original public content and policy compliance.

**Do not sign up for AdSense or any ad network until Tylor says yes.**

## Behavior

- **In-app (signed-in product):** ads only for Free, and only on calm surfaces (for example a dashboard or list footer — exact slots to be designed). Never on barcode scan, checkout, the paywall, or destructive flows. Pro and Family see no in-app ads.
- **Public recipe pages:** ads may show to all visitors, including paying customers, but the recipe must remain readable (limited units, no blocking interstitials).
- Prefer **non-personalized** ads at first (Bragle launch choice) to reduce tracking prompts and CCPA “sharing” exposure. If we later serve personalized ads to EEA / UK / Switzerland, use a Google-certified CMP (PP-130).
- Honor GPC and keep the privacy policy current (PP-122 / PP-130). If we sell or share personal information, include a “Your Privacy Choices” path.
- Ship any ad code behind a flag that defaults off until the account is approved and Tylor is ready.

## Acceptance Criteria

- [ ] Written placement policy in this ticket or the revenue doc (Free in-app slots, Pro/Family suppression, public-recipe rules) — done as the Behavior section above, refine if design review disagrees
- [ ] A “needs Tylor’s yes” checklist for AdSense (and, much later, Journey / Mediavine / Raptive) with the official thresholds from the revenue doc
- [ ] Implementation (later, only after yes and after public content exists): flag-gated ad slots, Pro/Family suppression covered by tests, privacy copy updated
- [ ] No AdSense, AdMob, Mediavine, or Raptive account is created from this ticket without a recorded yes from Tylor
