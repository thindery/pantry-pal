# PP-239: Public recipe library expansion (~60 more recipes)

**Status:** 📋 Open
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

- [ ] About 60 additional public recipes shipped in batches of ~12, each with images before or with its deploy
- [ ] Order: more holiday (Christmas dinner mains, cookies and pies, party apps, New Year's), then desserts, then new concepts mixed with the classic backlog
- [ ] Same content rules as PP-184: original writing, substitutions, FAQs only where real, no invented ratings or nutrition, no affiliate links, no expiry or food-waste tracking claims
- [ ] Standing image rule recorded in `.agents/docs/ticket-template.md` and `.agents/docs/recipe-backlog.md`
- [ ] Sitemap updated and resubmitted in GSC after each batch
