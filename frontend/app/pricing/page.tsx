import type { Metadata } from "next";
import { createPageMetadata } from "@/lib/site-metadata";

export const metadata: Metadata = createPageMetadata({
  title: "Simple Pricing - Start Free",
  description: "Free plan for individuals. Pro $4.99/mo for unlimited items. Family $7.99/mo for 5 members. No hidden fees. Upgrade anytime.",
  path: "/pricing/",
  image: "/pricing/og-image",
});

export { default } from "@/components/PricingPageRoute";
