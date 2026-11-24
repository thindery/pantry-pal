# PP-161: Suggested matches at the top of the "Group with…" picker

**Status:** ✅ Done
**Updated:** 2026-11-23, 9:50 PM America/Chicago
**Priority:** P2
**Phase:** User-requested features
**Created:** 2026-11-23
**Depends on:** PP-160 (item groups)
**Blocks:** —
**Source:** Tylor, 2026-11-23 ~9:15 PM CT, mobile screenshot of `Group "Tomato Sauce" with…` showing only a search box and an alphabetical UNGROUPED ITEMS list: "This should show suggested matches automatically at the top based on name."

---

## Problem

`frontend/components/dashboard/GroupWithModal.tsx` lists all groups and ungrouped items alphabetically. With 150+ items the user has to search to find the obvious match.

## Behavior

Add a **SUGGESTED** section above the existing Groups / Ungrouped Items lists in the picker showing up to 5 candidates (groups or ungrouped items) ranked by name similarity to the source item. Tapping a suggestion does exactly what tapping that group/item does today. Hide the section entirely when nothing scores. Search box and the existing lists below stay as-is (suggestions may also be filtered by the search query using the same `includes` match the lists use; when the query is non-empty and nothing matches, hide the section).

### Pure ranking helper (in `frontend/lib/item-group-match.ts`)

Export `rankGroupSuggestions(source: PantryItem, inventory: PantryItem[], groups: ItemGroup[], limit = 5): Array<{ kind: "group"; group: ItemGroup; score: number; tier: 1|2|3 } | { kind: "item"; item: PantryItem; score: number; tier: 1|2|3 }>`.

- Normalize with the existing `productMatchKey(name, brand)` (brand + size stripped, same as PP-160). Do not change `productMatchKey` or `findGroupSuggestion` behavior (existing tests must pass unchanged).
- Significant tokens = key split on spaces minus filler/stopwords: `of, the, a, an, and, with, in, for, 100, pure, condensed, original, classic, style, brand, premium, real, fresh` (keep the list in one exported const).
- Candidates: every group except the source's own group; every ungrouped item except the source itself. A group's comparable names = its name plus each member's name; it scores as its best name.
- Variant modifiers (one exported const): `low, sodium, reduced, fat, free, sugar, no, salt, added, lite, light, diet, zero, unsalted, unsweetened, sweetened, spicy, hot, mild, extra, whole, skim, decaf`.
- Tiers (lower is better):
  - **Tier 1 – exact core match:** keys equal, or significant-token sets equal.
  - **Tier 2 – compatible subset:** one side's significant tokens are a strict subset of the other's, AND the extra tokens contain no variant modifier (e.g. "Tomato Sauce" vs "Tomato Sauce Can" style, "Pumpkin" vs "Pumpkin Puree").
  - **Tier 3 – partial overlap:** at least 1 shared significant token but not tier 1/2 — this includes conflicting variants where both sides have unique tokens ("cream of chicken" vs "cream of mushroom") and subset differences that include a variant modifier ("chicken broth" vs "low sodium chicken broth").
  - No shared significant token → not a suggestion.
- Score within tier = Jaccard of significant tokens (shared / union). Sort by tier asc, score desc, then name asc. Return top `limit`.
- Different flavors/variants therefore always rank below any tier 1/2 match.

### UI

- `GroupWithModal.tsx`: compute suggestions with `useMemo` from data already in props/context (no new API calls). Section header "Suggested" styled like the existing "Ungrouped Items" header; rows reuse the existing row markup; a group row shows the group name with a small "Group" label/member count like the existing group list. Items/groups shown in Suggested may also still appear in the lists below (fine).
- **All hooks must be called unconditionally, before any early return** (PP-160 shipped a hooks-order bug in `edit-item-modal.tsx`; do not repeat it). No native dialogs.

## Tests

`frontend/tests/group-picker-suggestions.test.ts` (Vitest):
- Source "Tomato Sauce": inventory with "Hunt's Tomato Sauce 15 oz", "Great Value Tomato Sauce", "Soy Sauce", "100% Pure Pumpkin", "6 Cracker Assortment" → first two are tier 1 at the top; "Soy Sauce" (if present) ranks below them; pumpkin and crackers are absent.
- Source "Campbell's Cream of Chicken 10.5 oz": inventory with "Cream of Mushroom" and "Great Value Cream of Chicken" → Great Value Cream of Chicken is first; Cream of Mushroom is not first (tier 3 or absent).
- Source "Cream of Chicken" with only "Cream of Mushroom" available → if returned, tier 3 (never tier 1/2).
- "Chicken Broth" vs "Low Sodium Chicken Broth" → tier 3; a plain "Swanson Chicken Broth" ranks above it.
- Group "Pasta Sauce" with member "Hunt's Tomato Sauce" matches source "Tomato Sauce" at tier 1 via member name.
- Excludes the source item and its own group; ungrouped-only for items; respects limit 5; empty result when nothing shares a significant token.

Run: `npm run typecheck -w @pantry-pal/frontend`, `npm run lint -w @pantry-pal/frontend` (0 errors), `npm run test:run -w @pantry-pal/frontend`, `npm run build -w @pantry-pal/frontend`.

## Allowed paths

- `frontend/lib/item-group-match.ts`
- `frontend/components/dashboard/GroupWithModal.tsx`
- `frontend/tests/group-picker-suggestions.test.ts`
- this ticket file

## Hard bans

- NO git commits, `git add`, pushes, or branch changes.
- NO dependency changes (no installs; no package.json / lockfile edits).
- NO secrets / `.env` / backend / migration / deploy changes.
- No auto-grouping.

## Acceptance Criteria

- [x] Ticket + TICKET_STATUS row
- [x] Suggested section (max 5) above existing lists; hidden when nothing scores
- [x] Tomato Sauce shows other tomato sauces on top
- [x] Cream of chicken vs cream of mushroom never on top over a real match; variants never tier 1/2
- [x] Group matches by name or member names; source item and own group excluded
- [x] Vitest coverage; typecheck, lint, vitest, build pass
- [x] Deployed, build-id verified

## Implementation notes (2026-11-23, 9:50 PM America/Chicago)

- Shipped in `50efc34`, deployed with PP-162; live build `67a20c9`. Client-side ranking in `rankGroupSuggestions` (tiers: exact core / compatible subset / partial overlap incl. variants). 13 new vitest tests. Typecheck, lint (0 errors), vitest 171, build pass.
