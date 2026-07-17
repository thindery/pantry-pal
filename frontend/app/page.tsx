import type { Metadata } from "next";
import { LandingPageWrapper } from "@/components/LandingPageWrapper";
import { SoftwareApplicationSchema } from "@/components/SchemaMarkup";

export const metadata: Metadata = {
  title: "Pantry Hub: Smart Inventory & Shopping Lists",
  description: "Track what you have, know what you need. AI-powered pantry management with receipt scanning, barcode lookup & smart alerts. Try free today.",
};

export default function HomePage() {
  return (
    <>
      <SoftwareApplicationSchema />
      <LandingPageWrapper />
    </>
  );
}