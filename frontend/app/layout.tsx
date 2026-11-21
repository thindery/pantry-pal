import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { Providers } from "./providers";
import VersionUpdateToast from "@/components/VersionUpdateToast";
import {
  BRAND_NAME,
  SITE_DESCRIPTION,
  SITE_OG_DESCRIPTION,
  SITE_TAGLINE,
  SITE_TWITTER_DESCRIPTION,
  SITE_URL,
} from "@/lib/site-content";
import {
  OrganizationSchema,
  WebSiteSchema,
} from "@/components/SchemaMarkup";

const inter = localFont({
  src: "../fonts/inter-latin-variable.woff2",
  variable: "--font-sans",
  weight: "100 900",
  display: "swap",
});

const lora = localFont({
  src: [
    { path: "../fonts/lora-latin-600.woff2", weight: "600", style: "normal" },
    { path: "../fonts/lora-latin-700.woff2", weight: "700", style: "normal" },
  ],
  variable: "--font-serif",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${BRAND_NAME} | ${SITE_TAGLINE}`,
    template: `%s | ${BRAND_NAME}`,
  },
  description: SITE_DESCRIPTION,
  keywords: [
    "pantry inventory app",
    "home inventory tracker",
    "receipt scanner app",
    "grocery shopping list app",
    "household inventory management",
    "barcode scanner",
    "kitchen organization",
    "meal planning",
    "pantry organization",
  ],
  openGraph: {
    title: `${BRAND_NAME} | Smart Home Inventory`,
    description: SITE_OG_DESCRIPTION,
    type: "website",
    locale: "en_US",
    url: SITE_URL,
    siteName: BRAND_NAME,
    images: [
      {
        url: `/og-image`,
        width: 1200,
        height: 630,
        alt: `${BRAND_NAME} - Smart Home Inventory`,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `${BRAND_NAME} | Smart Home Inventory`,
    description: SITE_TWITTER_DESCRIPTION,
    images: [`/og-image`],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  alternates: {
    canonical: SITE_URL,
  },
  verification: {
    // Add Google Search Console verification when available
    // google: "your-verification-code",
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
      <head>
        <OrganizationSchema />
        <WebSiteSchema />
      </head>
      <body className="min-h-full bg-[var(--background)] text-[var(--foreground)]">
        <Providers>
          {children}
          <VersionUpdateToast />
        </Providers>
      </body>
    </html>
  );
}