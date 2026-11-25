import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site-content";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // App, API, auth, checkout, and internal design surfaces are not search
      // landing pages (PP-105). Auth/checkout pages also send noindex (PP-103).
      disallow: [
        "/dashboard/",
        "/admin/",
        "/api/",
        "/auth/",
        "/checkout/",
        "/design-system/",
      ],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
