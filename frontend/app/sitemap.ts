import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site-content";

const PUBLIC_PATHS = [
  "/",
  "/pricing/",
  "/privacy/",
  "/terms/",
  "/auth/signin/",
] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  return PUBLIC_PATHS.map((path) => ({
    url: `${SITE_URL}${path === "/" ? "" : path}`,
    lastModified,
    changeFrequency: path === "/" || path === "/pricing/" ? "weekly" : "yearly",
    priority: path === "/" ? 1 : path === "/pricing/" ? 0.9 : 0.5,
  }));
}