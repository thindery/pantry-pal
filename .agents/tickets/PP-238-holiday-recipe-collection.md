# PP-238: Holiday recipe collection and first holiday batch

**Status:** 🟡 Shipping
**Priority:** P1
**Phase:** Growth / public recipes
**Created:** 2026-11-26, 9:05 PM America/Chicago
**Source:** Tylor (Thanksgiving night: holiday recipes are the first batch to ship; he approved an indexable holiday collection page)
**Related:** PP-184 (public recipe library). Tag pages stay noindex (`RECIPE_TAG_PAGES_INDEXABLE` is unchanged).

Priority is P1 because Tylor asked to ship Thanksgiving leftovers and holiday recipes tonight, ahead of the later backlog batches.

---

## Scope

1. **Holiday batch (12 new recipes)** covering Thanksgiving leftovers, Christmas and holiday baking (cookies, pie, fudge, bark), holiday sides, a party appetizer, a breakfast casserole, and a New Year's dish. Existing leftover turkey soup and green bean casserole also carry the `holiday` tag.
2. **Indexable collection** at `/recipes/holiday/`, linked from `/recipes/`, included in the sitemap when the public recipe library is indexable. Unique intro and meta. Honest CollectionPage + ItemList JSON-LD (no ratings). Placeholders until AI images exist.
3. Same content rules as PP-184: original writing, substitutions, FAQs only where real (USDA leftover-turkey safety), no invented ratings or nutrition, no affiliate links, no expiry or food-waste tracking claims.

## Out of scope

- Flipping `RECIPE_TAG_PAGES_INDEXABLE`
- AI illustrations for the new slugs (gradient placeholders until images land)
- Later backlog batches (classic weeknight dishes after this collection ships)
