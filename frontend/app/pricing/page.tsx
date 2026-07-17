import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Simple Pricing - Start Free | Pantry Hub",
  description: "Free plan for individuals. Pro $4.99/mo for unlimited items. Family $7.99/mo for 5 members. No hidden fees. Upgrade anytime.",
  openGraph: {
    images: ["/pricing/og-image"],
  },
};

export { default } from "@/components/PricingPageRoute";
