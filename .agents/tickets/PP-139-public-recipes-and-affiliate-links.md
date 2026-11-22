# PP-139: Public first-party recipes and affiliate links

**Status:** 📋 Open
**Priority:** P2
**Phase:** Revenue options (research 2026-11-22)
**Created:** 2026-11-22
**Updated:** 2026-11-22, 4:48 PM America/Chicago
**Depends on:** PP-138 (reuse the recipe model where it makes sense); PP-108 / PP-110 (public content quality and honest SEO)
**Blocks:** —
**Doc:** `.agents/docs/revenue-options.md`
**Source:** Tylor, 2026-11-22 (our own recipes; recommend products; affiliate links)

---

## Problem

Affiliate income needs **original, public, not-behind-login** pages and a disclosed merchant program. Pantry Hub has neither public recipes nor an affiliate account today. Amazon grocery pays a published 1% and kitchen tools 4.50%; Instacart’s publisher program pays up to a $10 CPA on a new customer’s first qualifying order. The stronger Instacart Developer Platform rate (5% of cart, 7-day window) is closed to new applicants as of 2026-11-22.

This ticket plans the public recipe library and the affiliate path. **Do not sign up for any program until Tylor says yes.** Do not ship thin or spun “recipes” just to apply.

## Behavior

- Publish a small set of original Pantry Hub recipes as public pages (indexable, with real photos and tested instructions when we have them). Private saved recipes (PP-138) stay private.
- If we emit Recipe JSON-LD, it must follow Google’s Recipe structured data rules and stay honest (coordinate with PP-106).
- “Get ingredients” actions may link out to a merchant (Amazon and/or Instacart publisher first, per the research doc). Grocery vs kitchen-tool rates differ; do not imply we earn the kitchen rate on food.
- Clear, conspicuous affiliate disclosure near the links (FTC 16 CFR 255.5 and any network-required language). Footer-only disclosure is not enough.
- Optional later: add the same disclosed link from a shopping list export. Never present an affiliate URL as a neutral search result.
- Recheck official terms on the day of any application. If Instacart IDP reopens, prefer that over ordinary publisher CPA for in-app carts.

## Acceptance Criteria

- [ ] A short content plan: first recipe topics, who writes and photographs them, and how they stay original
- [ ] Public recipe URL design (not behind auth) and an honest disclosure snippet, drafted in-repo, not published until Tylor approves
- [ ] A “needs Tylor’s yes” checklist for Amazon Associates and Instacart (Impact) — no application until he agrees, and not before there is real public content
- [ ] Implementation (later): at least a first public recipe live, with disclosure, before any affiliate links go on it
- [ ] No program account is created from this ticket without a recorded yes from Tylor
