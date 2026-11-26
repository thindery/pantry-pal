/**
 * PP-184 launch gate for the public recipe library.
 *
 * ONE flag controls all of these public-facing signals:
 *   1. page robots meta on /recipes/ and every /recipes/<slug>/ (noindex, nofollow while false)
 *   2. sitemap.xml entries for /recipes/ pages (omitted while false)
 *   3. the "Recipes" links in the nav, footer, and the homepage card (hidden while false)
 *
 * Flipped to true on 2026-11-26 after Tylor approved going live.
 * To unlist: change `true` to `false` below, in this one line. Then follow the
 * flip checklist in .agents/tickets/PP-184-public-recipe-library-seo.md.
 */
export const PUBLIC_RECIPES_INDEXABLE = true;

/**
 * Tag pages (/recipes/tag/<tag>/) stay noindex and out of the sitemap even
 * after the main flag flips. Per the SEO desk, index a tag only once it has at
 * least 5 recipes, a unique 2 to 3 sentence intro, and is not a thin copy of
 * /recipes/. Flip this separately.
 */
export const RECIPE_TAG_PAGES_INDEXABLE = false;

/** Sitemap entries are only added once at least this many recipes exist. */
export const MIN_RECIPES_FOR_SITEMAP = 3;
