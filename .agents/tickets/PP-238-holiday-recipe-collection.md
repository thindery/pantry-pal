# PP-238: Holiday recipe collection and first holiday batch

**Status:** ✅ Live
**Priority:** P1
**Phase:** Growth / public recipes
**Created:** 2026-11-26, 9:05 PM America/Chicago
**Source:** Tylor (Thanksgiving night: holiday recipes are the first batch to ship; he approved an indexable holiday collection page)
**Related:** PP-184 (public recipe library). Tag pages stay noindex (`RECIPE_TAG_PAGES_INDEXABLE` is unchanged).

Priority is P1 because Tylor asked to ship Thanksgiving leftovers and holiday recipes tonight, ahead of the later backlog batches.

---

## Scope

1. **Holiday batch (12 new recipes)** covering Thanksgiving leftovers, Christmas and holiday baking (cookies, pie, fudge, bark), holiday sides, a party appetizer, a breakfast casserole, and a New Year's dish. Existing leftover turkey soup and green bean casserole also carry the `holiday` tag.
2. **Indexable collection** at `/recipes/holiday/`, linked from `/recipes/`, included in the sitemap when the public recipe library is indexable. Unique intro and meta. Honest CollectionPage + ItemList JSON-LD (no ratings). Images ship with or before each recipe (standing rule: no placeholders go live).
3. Same content rules as PP-184: original writing, substitutions, FAQs only where real (USDA leftover-turkey safety), no invented ratings or nutrition, no affiliate links, no expiry or food-waste tracking claims.

## Out of scope

- Flipping `RECIPE_TAG_PAGES_INDEXABLE`
- Later backlog batches (classic weeknight dishes after this collection ships)

- Holiday batch WebP illustrations shipped in a follow-up commit; Recipe JSON-LD now includes `image` for all 12.

- Holiday batch WebP illustrations are live at build `f73f60a` (PR #166). Recipe JSON-LD includes `image` for all 12. No placeholders remain on `/recipes/holiday/`.
