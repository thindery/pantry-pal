import type { Metadata } from "next";

export const dynamic = "force-dynamic";

// Checkout result pages are not search landing pages (PP-103).
export const metadata: Metadata = {
  title: "Checkout",
  robots: { index: false, follow: false, googleBot: { index: false, follow: false } },
};

export default function CheckoutLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}