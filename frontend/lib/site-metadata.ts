import type { Metadata } from "next";
import { BRAND_NAME, SITE_DESCRIPTION, SITE_URL } from "@/lib/site-content";

type PageMetadataOptions = {
  /** Page title without the brand (the root template adds " | Pantry Hub"). A title that already contains the brand is used as-is. */
  title: string;
  description?: string;
  /** Path of the page, e.g. "/pricing/". Used for the canonical and og:url. */
  path?: string;
  /** OG/Twitter image path (defaults to the site-wide /og-image card). */
  image?: string;
  /** Send `noindex, nofollow` (auth, checkout, and other non-landing surfaces). */
  noindex?: boolean;
};

/** Trailing-slash form of a path, matching `trailingSlash: true` in next.config. */
export function canonicalPath(path: string): string {
  if (path === "/" || path === "") return "/";
  const withLead = path.startsWith("/") ? path : `/${path}`;
  return withLead.endsWith("/") ? withLead : `${withLead}/`;
}

/** Full page title with the brand exactly once. */
export function fullTitle(title: string): string {
  return title.includes(BRAND_NAME) ? title : `${title} | ${BRAND_NAME}`;
}

export function createPageMetadata({
  title,
  description = SITE_DESCRIPTION,
  path = "/",
  image = "/og-image",
  noindex = false,
}: PageMetadataOptions): Metadata {
  const canonical = canonicalPath(path);
  const url = `${SITE_URL}${canonical}`;
  const socialTitle = fullTitle(title);
  return {
    // A title that already carries the brand must skip the "%s | Pantry Hub" template.
    title: title.includes(BRAND_NAME) ? { absolute: title } : title,
    description,
    alternates: { canonical },
    openGraph: {
      title: socialTitle,
      description,
      url,
      siteName: BRAND_NAME,
      type: "website",
      locale: "en_US",
      images: [{ url: image, width: 1200, height: 630, alt: socialTitle }],
    },
    twitter: {
      card: "summary_large_image",
      title: socialTitle,
      description,
      images: [image],
    },
    ...(noindex
      ? {
          robots: {
            index: false,
            follow: false,
            googleBot: { index: false, follow: false },
          },
        }
      : {}),
  };
}
