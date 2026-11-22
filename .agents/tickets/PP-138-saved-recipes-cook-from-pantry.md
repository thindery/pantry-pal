# PP-138: Saved recipes and cook-from-pantry

**Status:** 📋 Open
**Priority:** P1
**Phase:** Revenue options (research 2026-11-22)
**Created:** 2026-11-22
**Updated:** 2026-11-22, 4:48 PM America/Chicago
**Depends on:** —
**Blocks:** PP-139 (public recipes can reuse the recipe model)
**Doc:** `.agents/docs/revenue-options.md`
**Source:** Tylor, 2026-11-22 (saved recipes; cook-from-pantry as the foundation for later affiliates and ads)

---

## Problem

Pantry Hub tracks what is in the pantry and on the shopping list, but it cannot save a recipe, compare ingredients to inventory, or add only the missing items to the list. That is the hook Tylor wants, and it is the cleanest Pro upsell that does not depend on traffic, ads, or a partner approval.

This ticket is the build plan for that feature. No implementation is required in the research pass that filed it. No vendor signup.

## Behavior

- A signed-in user can save a recipe (at least: title, ingredient list, optional instructions and servings). A first slice may be paste-or-manual entry; import from a URL can come later.
- The app matches ingredients to pantry items as honestly as it can, and shows what is already on hand vs missing. Imperfect name matching is expected; do not invent confident matches.
- The user can add missing ingredients to the shopping list in one action, without duplicating lines that are already on the list.
- Free vs Pro (or Family): cap how many recipes a Free account can save; Pro / Family get a meaningfully higher or unlimited cap. Do not put the matcher itself behind a hard paywall on the first try — Free should feel the value, then hit a cap.
- Saved recipes are private to the account (and Family inventory if that is the plan). Public, SEO-facing recipes are PP-139, not this ticket.
- No affiliate buttons or ads are required here. Leave hooks that PP-139 / PP-140 can use later (a stable recipe record, a list of ingredients).

## Acceptance Criteria

- [ ] Short build plan in this ticket or the revenue doc: data model, matcher approach, Free cap, and how shopping-list add works
- [ ] Implementation (later, agy / Hermes): user can save a recipe, see pantry coverage, and add missing ingredients to the shopping list
- [ ] Free cap is enforced on the server, with a clear, honest upgrade prompt (no fake scarcity)
- [ ] Tests cover the cap, the add-missing-items path, and a missed ingredient match (no silent wrong match)
- [ ] No affiliate, ad, or third-party account is created from this ticket
