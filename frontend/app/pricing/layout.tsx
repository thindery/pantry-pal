import { AdSense } from "@/components/marketing/AdSense";

export const dynamic = "force-dynamic";

export default function PricingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <AdSense />
      {children}
    </>
  );
}
