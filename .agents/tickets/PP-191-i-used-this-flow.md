# PP-191: "I used this" / "I cooked this" pantry consumption flow (design)

**Status:** ✅ Live MVP (eeb003f, [#148](https://github.com/thindery/pantry-pal/pull/148)); design in [#133](https://github.com/thindery/pantry-pal/pull/133)
**Priority:** P2
**Phase:** Recipes / cook-from-pantry
**Created:** 2026-11-26, 11:15 AM America/Chicago
**Source:** Tylor (voice call, 2026-11-26). After cooking a casserole with cheddar cheese soup, the only way to mark it used was to find the item, open it, and minus one.
**Depends on:** PP-189 (robust recipe-to-pantry ingredient matching; on `origin/main` as of 11:17 AM CT Nov 26, [#131](https://github.com/thindery/pantry-pal/pull/131); live deploy may still be pending). "I cooked this" pre-checks matches from the same coverage function.
**Related:** PP-138 (saved recipes and cook-from-pantry coverage), PP-183 (AI recipe builder; deduct after a recipe is saved), PP-160 (item groups), PP-162 / PP-163 (remove from pantry vs. keep history), PP-156 (shopping-list need = target − have), reserved PP-190 (combine similar pantry items, if that ticket lands).
**Doc:** `.agents/docs/i-used-this-flow-design.md`
**Coding agent:** Coding may be done with agy (`~/.local/bin/agy -p --model gemini-3.8-flash-medium`, run in `/Users/thindery/projects/pantry-pal` on the Mac Mini) or with Grok Bot directly. Hermes and the Grok CLI are banned for this work.

---

## Numbering

Taken as **PP-191**. At write time, origin/main's last committed ticket was PP-187. In-flight / uncommitted tickets found across `pantry-pal*` worktrees:

- PP-178 site-QA hook (untracked clash with Instacart PP-178; not reused)
- PP-188 recipe sharing (`pantry-pal-pp188`, uncommitted)
- PP-189 recipe pantry matching (merged to main 11:17 AM CT, [#131](https://github.com/thindery/pantry-pal/pull/131))
- PP-190 left free for the in-flight "combine similar pantry items" ticket, which had not appeared yet
- PP-192 recipes page compact layout (`pantry-pal-pp192`, already taken)

---

## Problem

Today, after cooking, a user has to hunt the item in the pantry list and tap minus (or open Item Details, which shows quantity as a read-only "Quantity in Stock" line). There is no "I used it" action, no scan-to-deduct, and no "I cooked this" path on a recipe.

The pantry list already has +/- on each row (`PantryListRow`), and barcode scan (`/dashboard/scan-barcode/`) only **adds**. `/dashboard/scan-usage` is a dead redirect from the decommissioned visual-usage feature (PP-058) and must not be revived. Recipe detail (`recipe-detail-view.tsx`) shows Have / Missing badges and **Add Missing to Shopping List**, but it never deducts what was cooked.

Tylor wants something faster: a quick "I used it" action, scanning the item again to deduct it, or a quick search to mark something used in one tap — especially the recipe-to-pantry path after cooking (e.g. the cheddar cheese soup in a casserole).

## Goal

Publish a UX/UI design (this ticket + the doc) for a mobile-first consumption flow that fits the current UI, including the inline typeahead style Tylor already liked on the must-use picker. No code changes in this ticket.

## Scope

Design only. Allowed paths:

- `.agents/tickets/PP-191-i-used-this-flow.md`
- `.agents/TICKET_STATUS.md`
- `.agents/docs/i-used-this-flow-design.md`
- `.agents/docs/README.md` (index row for the design doc)

A later implementation ticket (or a follow-up on this one after Tylor signs off) will do the build.

## Out of scope

- Any application or test code
- Changing PP-189 matching behavior (consume this design; do not re-specify the matcher)
- Building the reserved combine-similar-items setting (PP-190)
- Reviving Gemini / visual-usage scanning or `/dashboard/scan-usage`
- User-facing model or vendor names (PP-185: say "AI" only)

## Recommended direction (one line)

Add **"I cooked this"** on the recipe detail page as an on-page checklist of matched pantry items, pre-checked, with one-tap deduct and an undo toast; add a pantry **"I used it"** typeahead (same inline dropdown pattern as the must-use picker, no full-screen popup); and add an **Add / Used** toggle on the existing barcode scanner.

Full write-up, options, entry points, amounts, zero-stock / shopping-list behavior, free vs Pro, and edge cases: `.agents/docs/i-used-this-flow-design.md`.

## Behavior (summary for the later build)

See the design doc for the full proposal. The later build should:

- Keep +/- on pantry rows; this flow is the faster path, not a replacement.
- Stay on the page: inline typeahead and an on-page checklist, not a big full-screen picker.
- Log deducts as existing `REMOVE` activities (source `MANUAL` or `BARCODE_SCAN`). Do not reuse `VISUAL_USAGE`.
- Clamp quantity at 0 and leave the item in the pantry (PP-162 remains the explicit remove).
- Respect shopping-list thresholds: auto-list already uses need = max(target − have, 0). Confirm when a used item is auto-added; only prompt "Add to shopping list?" when the target would not add it.
- Offer an 8–10s Undo toast that restores the previous quantities (and rolls back list rows this flow just added).
- Be free for all signed-in users (core pantry UX). AI recipe *generation* stays Pro (PP-183). Free users can deduct on their saved recipes (cap unchanged: 10).
- User-facing text says "AI" only, never a model name.

## Acceptance Criteria

- [ ] Design doc is in `.agents/docs/i-used-this-flow-design.md` and is linked from this ticket and `.agents/docs/README.md`.
- [ ] Doc recommends one clear direction, lists alternatives, and covers entry points, scan-to-use, quick search, undo, partial amounts, zero-stock + shopping list / thresholds, free vs Pro, and edge cases.
- [ ] Doc notes the PP-189 dependency and the inline typeahead (no full-screen popup) constraint.
- [ ] No application code is changed in this ticket.
- [ ] Tylor signs off on the direction before any implementation work starts.

## Rules for the coding agent

- This ticket is design only. Do not change application or test code under this number.
- Coding may be done with agy (`~/.local/bin/agy -p --model gemini-3.8-flash-medium`, run in `/Users/thindery/projects/pantry-pal` on the Mac Mini) or with Grok Bot directly. Hermes and the Grok CLI are banned for this work.
- No dependency changes unless truly needed. If one is, stop and explain why.
- No secrets. Commit with explicit paths only; never `git add -A`.
- Don't touch the stray `2026-07-30` file, `.agents/email-previews/`, or GROWTH-010.
- PP-188 is reserved for recipe sharing (uncommitted in `pantry-pal-pp188`). PP-190 is left free for the combine-similar-items ticket. PP-192 is the compact recipes page, already in progress in `pantry-pal-pp192`.


---

## Shipped MVP (2026-11-26, 1:25 PM CT)

Built from the recommended scope:

- **I cooked this** on the recipe page: on-page "Mark what you used" checklist, matched in-stock items pre-checked (optional lines unchecked), amount stepper, item picker when several pantry items match, "You'll have 0 left" hint, Deduct / Cancel.
- **I used it** typeahead on the pantry page (inline listbox, one tap deducts 1 pantry unit, out-of-stock rows say "Already out").
- **Add / Used** toggle on the barcode scanner. Used deducts 1 from a known item and never creates items; an unknown barcode shows "This isn't in your pantry" with the typeahead.
- **Undo toast** (9s, bottom on phones). Deducts log `REMOVE` (`MANUAL` / `BARCODE_SCAN`), clamp at 0, items stay in the pantry, all-or-nothing with rollback.
- Tests: `frontend/tests/i-used-this.test.tsx`.

Not in the MVP (follow-ups): attaching pantry items to Missing/Unsure recipe lines, recipe-unit conversion (default is 1 pantry unit), the "Add to shopping list?" prompt for target-0 items, an "I used it" button on Item Details.
