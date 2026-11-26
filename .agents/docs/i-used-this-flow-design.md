# "I used this" / "I cooked this" flow — UX design

**Ticket:** [PP-191](../tickets/PP-191-i-used-this-flow.md)  
**Status:** Design proposal, not built. No code in PP-191.  
**Created:** 2026-11-26, 11:15 AM America/Chicago  
**Source:** Tylor, voice call. After cooking a casserole that used cheddar cheese soup, the only way to mark it used was to find the item and minus one. He wants a quicker "I used it" action, a way to scan an item to deduct it, or a quick search to mark something used in one tap, plus an "I cooked this" path on the recipe.  
**Priority:** P2 (real friction after cooking, but the site is not broken; PP-189 matching should land first).  
**Depends on:** PP-189 (recipe-to-pantry matching; on `origin/main` as of 11:17 AM CT Nov 26, [#131](https://github.com/thindery/pantry-pal/pull/131); live deploy may still be pending). This flow pre-checks the same coverage results that the Ingredients card uses.

User-facing copy in this product says "AI" only, never a model or vendor name (PP-185).

---

## 1. What exists today

Read against `origin/main` at the time of writing (includes the must-use typeahead Tylor liked, and the PP-189 matcher after #131).

### Pantry

- The pantry list (`inventory-view.tsx` + `PantryListRow.tsx`) already has **− / +** on every row. The step is 1 for count units, 0.5 for lbs/kg/grams/oz, and 0.25 for cups. Minus is disabled at 0. Items at 0 stay in the list, greyed out, with a red status rail. They are not auto-deleted (PP-162 is the explicit **Remove from pantry** action).
- A search box on the pantry page filters the list. It does not mark anything used.
- Top actions are **Scan item** (add-only barcode scan) and **Add manually**.
- Item Details (`edit-item-modal.tsx`) shows quantity as a read-only "Quantity in Stock" line, plus low-stock alert, Save, and Remove from pantry. There is no "I used it" control on the sheet. This is the hunt-and-edit path Tylor is describing.
- Quantity changes go through `handleAdjustQuantity` in `pantry-provider.tsx`: clamp at 0, log a `REMOVE` (or `ADD`) activity, source default `MANUAL`. There is no undo today.
- The current toast (`Toast.tsx`) is message-only (3s, top-right, no action button).

### Recipes

- Recipe detail (`/dashboard/recipes/[id]/`, `recipe-detail-view.tsx`) shows **Pantry Coverage**, Have / Missing / Unsure badges, and **Add Missing (N) to Shopping List**. There is no deduct / "I cooked this" action.
- Coverage is computed at read time by `calculateRecipeCoverage` in `frontend/lib/recipe-coverage.ts`. **PP-189** (now on main, #131) normalizes quantities, units, and descriptors and token-matches the closest pantry item, so butter and heavy cream should match; salt, pepper, and oil are pantry staples. Saved recipes still store `{raw, name}` only; do not store a stale match status. Until that build is live, the production site may still show exact-name Missing badges.
- AI recipe ideas (`AiRecipeBuilder.tsx`, Pro) use the same matcher and can save to a normal PP-138 recipe. Deduct should happen on the saved recipe page, not on the idea cards.
- Free accounts may save 10 recipes; Pro is unlimited. Coverage itself is not paywalled (PP-138).

### Scan

- `/dashboard/scan-barcode/` is add-only: each scan increments quantity and a session ledger, with a short "added" toast. There is no Used / deduct mode.
- `/dashboard/scan-usage` immediately redirects to `/dashboard/` (legacy visual-usage route, decommissioned in PP-058). **Do not revive it.** Activity source `VISUAL_USAGE` is leftover and should not be reused.

### Shopping list and thresholds

- The shopping list auto-rebuilds whenever inventory changes (`generateShoppingList`). Auto rows use **need = max(target − have, 0)** (`buildAutoShoppingListItems`). Default target is 1 when unset.
- If someone uses the last unit and the target is 1, the item appears on the list by itself. If the user set the item or category target to **0**, need stays 0 even at quantity 0, so it will **not** auto-add — that choice must be respected, with an explicit opt-in prompt instead.
- `isItemLowStock` returns false when quantity is already 0 (those rows show as out of stock, not "Low"). The list still uses target/need, not that badge.
- "Add Missing to Shopping List" on a recipe is a separate, manual batch add and should stay as it is.

### Groups

- PP-160 item groups already combine chosen SKUs into one pantry line. A reserved follow-up (PP-190, not filed at this writing) may also combine similar items (e.g. two pie crusts) behind a default-on setting. Deduct must work on a single item, a grouped line, and a future combined line without double-counting.

---

## 2. Recommended direction

Ship **three complementary entry points**, all mobile-first, all staying on the page (no full-screen picker, same spirit as the must-use typeahead):

1. **Recipe: "I cooked this"** — the main path for "I made the casserole, deduct what I used."
2. **Pantry: "I used it" typeahead** — for one-off items with no recipe, like searching "cheddar cheese soup" and marking it used in one tap.
3. **Scan: Add / Used toggle** on the existing barcode scanner — scan a can or box to deduct 1, with a session ledger and undo.

Keep the existing row **− / +** buttons. They stay the precise, always-visible control. This ticket adds faster paths around them, not a replacement.

### Why this, not one of the alternatives

Tylor's examples split into two jobs: "I cooked a recipe" (many items, wants a checklist) and "I used this one thing" (search or scan, one tap). A single modal does not cover both well, and he already rejected a big full-screen picker. Scan-only fails once the can is in the trash. Auto-deducting every "Have" ingredient on a recipe is too aggressive.

---

## 3. Options considered

| Option | Verdict |
|--------|---------|
| **A. Recommended set above** | Build this. |
| **B. Only a louder minus / "Use 1" on each pantry row** | Too hidden for the recipe path; still requires hunting. Keep row minus as-is, do not treat it as the fix. |
| **C. Full-screen "I used it" / "I cooked this" modal or sheet** | Rejected. Same pattern Tylor asked to remove from the must-use picker. Use an on-page card + inline typeahead. |
| **D. Scan-only deduct** | Useful, not sufficient. After cooking, the package may already be gone. Offer scan as one entry point. |
| **E. Auto-deduct all "Have" ingredients when a recipe is opened or saved** | Too easy to deduct by mistake; no review, no undo window that the user chose. Require an explicit "I cooked this" + confirm. |
| **F. "Save & mark cooked" on unsaved AI idea cards** | Too heavy, and mixes save-cap errors into deduct. Save first, then use the recipe page. |

---

## 4. Entry points (mobile first)

### 4.1 Recipe detail — "I cooked this" (primary)

On `/dashboard/recipes/[id]/`, in the existing coverage card, add a primary button **I cooked this** next to **Add Missing to Shopping List**. Hide or disable it when the recipe has no ingredients or is still "Details not imported" (same rule as the coverage card).

Tap opens an **on-page confirmation card** directly under the button (not a full-screen overlay):

- Title: **Mark what you used**
- List every ingredient, with the matched pantry item when coverage status is **Have**. Those rows are **pre-checked**.
- Show the pantry name and current quantity, plus a compact amount stepper (see §6).
- **Missing** and **Unsure** lines are listed separately, unchecked, each with an inline "Find in pantry" typeahead (must-use style: type to filter, popular/recent when the field is empty). The user can attach a pantry item and check the row, or leave it off.
- **Pantry staple** lines from PP-189 (salt, pepper, oil) are omitted, or shown unchecked under "Usually not tracked."
- Recipe lines marked optional are pre-unchecked.
- If two pantry items could match, pre-check the closest one (PP-189) and let the user check the other or switch.
- For an item group (PP-160), show the group line and deduct from the matching member, or from the group total with a member picker when it is ambiguous.
- Primary action: **Deduct from pantry**. Secondary: **Cancel** (closes the card, no changes).
- After success, the card closes, coverage badges refresh, and an undo toast appears (§7).

Example: cheddar cheese soup on a casserole recipe is pre-checked against the pantry can, amount defaults to 1, one tap deducts it. Butter and heavy cream behave the same once PP-189 is in.

### 4.2 Pantry page — "I used it" typeahead

On the pantry page, under the Scan / Add buttons and above or beside the existing list-filter search, add a compact **I used it** typeahead:

- Placeholder: **I used…** or **Search to mark something used**
- Same interaction as `MustUsePicker`: inline `<input>` + listbox under the field as you type; on empty focus, show popular / recently used items as chips and as the first listbox options. No full-screen popup.
- Each result row shows name, quantity, and an **I used it** affordance. Tap deducts the default amount (§6) immediately and shows the undo toast. If the user needs a different amount, a small stepper appears inline on that row (not a new page) before confirm.
- Selecting a result should not fight the existing list-filter search; they are separate fields.
- Items already at 0 appear in results but are disabled, with "Already out."

This is the one-tap path when there is no recipe: type "cheddar," tap the soup, done.

### 4.3 Barcode scan — Add / Used mode

On `/dashboard/scan-barcode/`, add a two-segment control at the top: **Add** (current default) and **Used**.

- **Used**: each successful scan of a known pantry item deducts 1 (or the item's usual step). The session ledger shows used counts. Toasts say "Used 1 × Cheddar cheese soup" with Undo.
- Unknown barcode in Used mode: do **not** create a new item. Show "This isn't in your pantry" and an inline typeahead to match an existing item, or Cancel.
- Scanning an item that is already at 0: toast "Already out," no change.
- Debounce / anti-double-scan should follow the existing Quick Scan session rules, in reverse.
- Do not send users to `/dashboard/scan-usage`. Do not turn the camera into a visual "what did I cook?" AI feature in this ticket.

### 4.4 Item Details (secondary)

Add a single **I used it** button on the Item Details sheet (the overview tab, near the quantity line) that deducts the default amount and closes or stays open with an undo toast. Do not make the sheet the only path. Keep Remove from pantry as a separate, confirmed destructive action.

### 4.5 AI recipe ideas

No deduct on unsaved idea cards. After the user saves an idea, they land on (or can open) the normal recipe detail page and use **I cooked this**. A short hint under **Saved** is enough: "Cooked it? Mark what you used on the recipe page."

---

## 5. Scan-to-use and quick search (detail)

Both are confirm-light: one tap should usually be enough, with undo as the safety net.

**Quick search sheet:** do not use a bottom sheet that covers the whole phone. The dropdown is a `relative` listbox under the input, `min-w-0 w-full`, 44px-tall rows, truncated labels with a `title` for the full name (same rules as the must-use picker). Keyboard: Arrow keys, Enter to use, Escape to close, as in `MustUsePicker`.

**Scan-to-use:** reuse `BarcodeScanner` and the existing session ledger UI, visually inverted (used vs added). Activity source is `BARCODE_SCAN`. If a future batch endpoint is added, scans can still call the same deduct helper as the typeahead and the recipe checklist.

---

## 6. Partial amounts and units

Default amount, in order:

1. If the recipe line has a parseable quantity and the unit is the same as the pantry item's unit (or a tiny, obvious conversion such as 16 oz = 1 lb, 4 tbsp = ¼ cup), use that amount, capped at the current pantry quantity.
2. Otherwise, for count-style units (pieces, cans, packages, items, and the common "unit" / empty unit), default to **1**.
3. For weight or volume with no reliable conversion (e.g. recipe "¾ cup heavy cream" vs pantry "1" carton of Heavy Whipping Cream), default to **1 pantry unit** and let the user edit the stepper. Do not invent a conversion table in v1 beyond the obvious cases in (1). Never silently deduct a fractional cup from a "1 carton" count.

The stepper uses the same steps as pantry rows (1 / 0.5 / 0.25). It cannot go below 0 or above the current quantity; if the chosen amount would empty the item, helper text says **You'll have 0 left**.

v1 does not try to deduct "half a can" as a second unit system. If the user wants 0.5 of a count item, they can set 0.5 on the stepper.

---

## 7. Undo toast

Extend the toast pattern (or add a dedicated consume toast) so a toast can carry an **Undo** action:

- Duration **8–10 seconds**.
- On a phone, pin it **bottom** (above the tab bar), not top-right, so it is in thumb reach and does not sit under the notch.
- Copy examples: **Used Cheddar cheese soup (1).** and **Updated 6 items from Chicken casserole.**
- Undo restores every quantity in that batch to the previous value. If this flow also added shopping-list rows that were not on the list before, undo removes those rows. It must not remove rows the user already had.
- Only the latest consume batch is undoable. A second deduct replaces the toast.
- If undo expires, the activity ledger (PP-163 style history) still shows the `REMOVE` events; the user can tap + on the row if they need to fix it later.
- Failed deducts use the existing error toast, with no Undo.

---

## 8. What happens at 0 (and shopping list / thresholds)

- Quantity **clamps at 0**. The item **stays in the pantry** as out of stock. Do not call Remove from pantry, and do not ask "Delete this item?" in this flow.
- After a successful deduct, the existing shopping-list effect will re-run.
  - If **need = target − have is now greater than 0** (typical case: last can, target 1), the item is already on the list. The toast should **confirm**, not ask again: **Cheddar cheese soup is on your shopping list.** (Skip if it was already there.)
  - If **need is still 0** (still above target, or the user set target to 0 so the item never auto-adds), do **not** auto-add. If the item is now at 0 and it did not auto-add, the toast may include **Add to shopping list?** as a second action. That respects the threshold: we offer, we do not override a target of 0.
- Do not duplicate a row that is already on the list (manual or auto).
- Several items hitting the threshold in one "I cooked this" batch: one toast for the deduct, plus a short line like **3 items were added to your shopping list**, rather than a stack of prompts.

---

## 9. Free vs Pro

This is core pantry UX, not an AI feature.

- **Free and Pro** both get "I used it," scan-to-use, and "I cooked this" on any recipe they can open.
- AI *suggestion* stays Pro (PP-183), with the existing weekly token caps. Free users who saved a recipe (up to 10) can still mark it cooked.
- Do not paywall inventory deduction, undo, or scan-to-use. No new meter for this flow.

---

## 10. Edge cases

- **PP-189 matcher:** it is on main (#131) but may not be live yet. Unmatched ingredients must always be fixable with the "Find in pantry" typeahead. Do not deduct a Missing line. Implement "I cooked this" against the post-PP-189 coverage function so pre-checks are trustworthy; the typeahead is the fallback either way.
- **False matches / multiple matches:** user can uncheck, switch, or check a second item. Closest match is pre-checked, not locked.
- **Item groups (PP-160) and future combine-similar (PP-190):** deduct once against the underlying member(s). Do not subtract from both the group total and a member. If PP-190 combines two pie crusts into qty 2, "I used it" on that line deducts 1 from the chosen (or first in-stock) member.
- **Already at 0:** cannot be checked; scan and typeahead say "Already out."
- **Cooking the same recipe twice:** allowed. The second pass pre-checks whatever is still in the pantry. Undo covers a double tap.
- **Partial failure:** apply the batch all-or-nothing, or roll back on any failed item, then error toast. Do not leave a half-applied casserole deduct.
- **Stale quantity:** re-read (or use the in-memory inventory already held by `PantryProvider`) at confirm time. If there is no longer enough, cap at what's left and tell the user.
- **Incomplete recipe:** no "I cooked this" until details exist.
- **Activity ledger:** log `REMOVE` with amount and source `MANUAL` (taps) or `BARCODE_SCAN` (scan). Do not revive `VISUAL_USAGE`. A later `RECIPE_COOK` source is optional and not required for v1.
- **Accessibility:** 44px targets, typeahead keyboard support, toast announced politely, Undo is a real button (not swipe-only).
- **Desktop:** same flows; the on-page card can be a narrow column. Still no full-screen modal.
- **Offline / API errors:** existing error toast; no optimistic deduct that cannot be reconciled.

---

## 11. Implementation notes (for the later build, not this ticket)

Likely touch points, when a coding ticket is opened: `recipe-detail-view.tsx`, `inventory-view.tsx`, `edit-item-modal.tsx`, `scan-barcode-view.tsx`, `Toast.tsx` / a consume toast, `pantry-provider.tsx` (`handleAdjustQuantity` batch + undo stack), tests around deduct, undo, and shopping-list side effects. Reuse coverage from `recipe-coverage.ts` (post-PP-189). No new paid services, no secrets, no dependency churn unless a later ticket justifies it.

Suggested copy (user-facing): **I cooked this**, **I used it**, **Mark what you used**, **Deduct from pantry**, **Undo**, **Already out**, **You'll have 0 left**, **Add to shopping list?**, **This isn't in your pantry.**

---

## 12. Open questions for Tylor

The recommendation can ship without these, but his call would help:

1. Is **"I cooked this"** on the recipe the main button he wants, with search and scan as backups? (Recommended: yes.)
2. For packaged goods with a recipe amount in cups or tablespoons, is **default 1 pantry unit** (one can, one carton) acceptable in v1?
3. Any objection to leaving items at 0 in the pantry (current behavior) rather than auto-removing them?
