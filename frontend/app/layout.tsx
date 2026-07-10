import type { Metadata } from "next";
import { Inter, Lora } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

const lora = Lora({
  variable: "--font-serif",
  subsets: ["latin"],
  weight: ["600", "700"],
});

export const metadata: Metadata = {
  metadataBase: process.env.NEXT_PUBLIC_SITE_URL
    ? new URL(process.env.NEXT_PUBLIC_SITE_URL)
    : undefined,
  title: {
    default: "PantryPal | Smart Home Inventory & Shopping Lists",
    template: "%s | PantryPal",
  },
  description:
    "Track pantry inventory, scan receipts and barcodes, auto-generate shopping lists, and manage household stock with AI-powered kitchen utilities.",
  keywords: [
    "pantry",
    "inventory",
    "shopping list",
    "barcode scanner",
    "receipt scanning",
    "kitchen",
    "meal planning",
    "household",
  ],
  openGraph: {
    title: "PantryPal | Smart Home Inventory",
    description:
      "Effortless inventory management with receipt scanning, barcode lookup, and smart low-stock alerts.",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "PantryPal | Smart Home Inventory",
    description:
      "Track what you have, know what you need. PantryPal keeps your kitchen organized.",
  },
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: "/",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${lora.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-[var(--background)] text-[var(--foreground)]">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}