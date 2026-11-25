import type { MetadataRoute } from "next";
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
];

export default function sitemap(): MetadataRoute.Sitemap {
  return SITEMAP_PAGES.map((page) => ({
    url: `${SITE_URL}${page.path}`,
    lastModified: page.lastModified,
    changeFrequency: page.changeFrequency,
    priority: page.priority,
  }));
}
