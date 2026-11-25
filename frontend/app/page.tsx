import type { Metadata } from "next";
import { createPageMetadata } from "@/lib/site-metadata";
import { LandingPageWrapper } from "@/components/LandingPageWrapper";
import { SoftwareApplicationSchema } from "@/components/SchemaMarkup";
import { AdSense } from "@/components/marketing/AdSense";

export const metadata: Metadata = createPageMetadata({
  title: "Pantry Hub: Smart Inventory & Shopping Lists",
  description: "Track what you have, know what you need. Scan barcodes or a grocery receipt to fill your pantry list, then shop from what is running low. Free to start.",
  path: "/",
});

export default function HomePage() {
  return (
    <>
      <AdSense />
      <SoftwareApplicationSchema />
      <LandingPageWrapper />
    </>
  );
}