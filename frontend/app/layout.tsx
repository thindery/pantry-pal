import type { Metadata } from "next";
import { Inter, Lora } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import {
  BRAND_NAME,
  SITE_DESCRIPTION,
  SITE_OG_DESCRIPTION,
  SITE_TAGLINE,
  SITE_TWITTER_DESCRIPTION,
} from "@/lib/site-content";

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
    default: `${BRAND_NAME} | ${SITE_TAGLINE}`,
    template: `%s | ${BRAND_NAME}`,
  },
  description: SITE_DESCRIPTION,
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
    title: `${BRAND_NAME} | Smart Home Inventory`,
    description: SITE_OG_DESCRIPTION,
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: `${BRAND_NAME} | Smart Home Inventory`,
    description: SITE_TWITTER_DESCRIPTION,
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