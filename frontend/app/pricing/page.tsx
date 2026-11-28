import type { Metadata } from "next";
import { createPageMetadata } from "@/lib/site-metadata";

export const metadata: Metadata = createPageMetadata({
  title: "Simple Pricing - Start Free",
  description: "Free plan up to 50 items. Pro $4.99/mo or $39.99/yr for unlimited items, AI receipt scans and AI recipe ideas. Cancel anytime.",
  path: "/pricing/",
  image: "/pricing/og-image",
});

export { default } from "@/components/PricingPageRoute";
