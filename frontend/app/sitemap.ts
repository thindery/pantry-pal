import type { MetadataRoute } from "next";
import { RECIPES } from "@/content/recipes";
import { MIN_RECIPES_FOR_SITEMAP, PUBLIC_RECIPES_INDEXABLE } from "@/content/recipes/config";
import { HOLIDAY_COLLECTION, holidayCollectionLastModified, holidayRecipes } from "@/content/recipes/holiday";
import { SITE_URL } from "@/lib/site-content";

/**
 * Indexable marketing pages only (PP-105). Locs match the trailing-slash
 * canonicals from createPageMetadata. `lastModified` is the date the page's
 * visible content last changed — bump it in the same commit as a real content
 * edit, never `new Date()` (that made every URL look new on every request).
 */
export const SITEMAP_PAGES: ReadonlyArray<{
  path: string;
  lastModified: string;
  changeFrequency: "weekly" | "monthly" | "yearly";
  priority: number;
}> = [
  { path: "/", lastModified: "2026-11-25", changeFrequency: "weekly", priority: 1 },
  { path: "/pricing/", lastModified: "2026-11-24", changeFrequency: "monthly", priority: 0.9 },
  { path: "/privacy/", lastModified: "2026-11-22", changeFrequency: "yearly", priority: 0.5 },
  { path: "/terms/", lastModified: "2026-07-10", changeFrequency: "yearly", priority: 0.5 },
  { path: "/guides/barcode-scanning/", lastModified: "2026-11-25", changeFrequency: "monthly", priority: 0.7 },
  { path: "/guides/receipt-scanning/", lastModified: "2026-11-25", changeFrequency: "monthly", priority: 0.7 },
  { path: "/guides/barcode-vs-receipt-vs-manual/", lastModified: "2026-11-25", changeFrequency: "monthly", priority: 0.6 },
  { path: "/guides/pantry-hub-vs-grocy/", lastModified: "2026-11-25", changeFrequency: "monthly", priority: 0.6 },
];

/**
 * PP-184: public recipe pages join the sitemap only when the launch flag is on
 * AND at least MIN_RECIPES_FOR_SITEMAP recipes exist. `lastModified` is each
 * recipe's own `updated` date; bump it with real edits. Tag pages stay out.
 */
const RECIPES_INDEX_LAST_MODIFIED = RECIPES.map((r) => r.updated).sort().at(-1) ?? "2026-11-26";

export function recipeSitemapPages(): typeof SITEMAP_PAGES {
  if (!PUBLIC_RECIPES_INDEXABLE || RECIPES.length < MIN_RECIPES_FOR_SITEMAP) return [];
  const pages: Array<(typeof SITEMAP_PAGES)[number]> = [
    { path: "/recipes/", lastModified: RECIPES_INDEX_LAST_MODIFIED, changeFrequency: "weekly", priority: 0.8 },
  ];
  if (holidayRecipes().length > 0) {
    pages.push({
      path: HOLIDAY_COLLECTION.path,
      lastModified: holidayCollectionLastModified(),
      changeFrequency: "weekly",
      priority: 0.75,
    });
  }
  pages.push(
    ...RECIPES.map((r) => ({
      path: `/recipes/${r.slug}/`,
      lastModified: r.updated,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
  );
  return pages;
}

export default function sitemap(): MetadataRoute.Sitemap {
  return [...SITEMAP_PAGES, ...recipeSitemapPages()].map((page) => ({
    url: `${SITE_URL}${page.path}`,
    lastModified: page.lastModified,
    changeFrequency: page.changeFrequency,
    priority: page.priority,
  }));
}
