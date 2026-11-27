# PP-239: Public recipe library expansion (~60 more recipes)

**Status:** ✅ Live (build `336b82a`, 10:13 PM America/Chicago, 2026-11-26)
**Priority:** P1
**Phase:** Growth / public recipes
**Created:** 2026-11-26
**Depends on:** PP-238 (holiday collection and first holiday batch, including images)
**Blocks:** —
**Doc:** `.agents/docs/recipe-backlog.md`

Priority is P1 because Tylor asked for about 60 more recipes tonight after PP-238, starting with more holiday dishes, then desserts, then new concepts mixed with the classic backlog.

---

## Problem

The public library has 36 recipes after PP-238. Tylor wants many more on the site, with holidays first, then desserts, then expanded concepts (cuisines, sheet-pan, one-pot, slow cooker, air fryer, freezer meals, breakfasts, snacks, sides), and classics mixed in.

## Behavior

Ship recipes in batches of about 12. Every recipe in a batch goes live with its real WebP illustration (same pipeline as batches 1 and 2: real-world food-photography look, about 1152×864, under ~150KB). Recipe JSON-LD includes the absolute `image` URL. **No placeholders may go live.** Rebase and deploy per batch, then update the sitemap and resubmit it in Search Console.

## Acceptance Criteria

- [x] About 60 additional public recipes shipped in batches of ~12, each with images before or with its deploy
- [x] Order: more holiday (Christmas dinner mains, cookies and pies, party apps, New Year's), then desserts, then new concepts mixed with the classic backlog
- [x] Same content rules as PP-184: original writing, substitutions, FAQs only where real, no invented ratings or nutrition, no affiliate links, no expiry or food-waste tracking claims
- [x] Standing image rule recorded in `.agents/docs/ticket-template.md` and `.agents/docs/recipe-backlog.md`
- [x] Sitemap updated and resubmitted in GSC after each batch

## Live

Public library is 96 recipes, all with real WebPs (no placeholders). Holiday collection is 26 recipes. GSC `sc-domain:mypantryhub.com` sitemap submitted 106 web URLs (0 errors) at 10:13 PM America/Chicago.

| Batch | PR | Build | Recipes after | GSC web URLs |
|-------|----|-------|---------------|--------------|
| Holiday collection + first 12 (placeholders at ship) | [#165](https://github.com/thindery/pantry-pal/pull/165) | `a6519f7` | 36 | 46 |
| Real WebPs for the first 12 holiday recipes | [#166](https://github.com/thindery/pantry-pal/pull/166) | `f73f60a` | 36 | 46 |
| Holiday batch 2 (12 recipes + WebPs) | [#167](https://github.com/thindery/pantry-pal/pull/167) | `7d278e4` | 48 | 58 |
| Desserts (12 + WebPs) | [#168](https://github.com/thindery/pantry-pal/pull/168) | `ab211bd` | 60 | 70 |
| Classics (12 + WebPs) | [#169](https://github.com/thindery/pantry-pal/pull/169) | `d407db5` | 72 | 82 |
| Methods and cuisines (12 + WebPs) | [#170](https://github.com/thindery/pantry-pal/pull/170) | `e068d06` | 84 | 94 |
| Remaining concepts and backlog (12 + WebPs) | [#171](https://github.com/thindery/pantry-pal/pull/171) | `336b82a` | 96 | 106 |

Tonight added 60 recipes (holiday-2, desserts, classics, methods, concepts) plus real images for the original 12 holiday recipes from PP-238.
