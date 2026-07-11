import type { Metadata } from "next";
import { BRAND_NAME, SITE_DESCRIPTION, SITE_URL } from "@/lib/site-content";

type PageMetadataOptions = {
  title: string;
  description?: string;
  path?: string;
};

export function createPageMetadata({
  title,
  description = SITE_DESCRIPTION,
  path = "/",
}: PageMetadataOptions): Metadata {
  const url = `${SITE_URL}${path.endsWith("/") ? path : `${path}/`}`;
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      title: `${title} | ${BRAND_NAME}`,
      description,
      url,
      type: "website",
      locale: "en_US",
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} | ${BRAND_NAME}`,
      description,
    },
  };
}