"use client";

import { SITE_URL } from "@/lib/site-content";

// Organization Schema
export function OrganizationSchema() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Pantry Hub",
    alternateName: "Peak Collective LLC",
    url: SITE_URL,
    logo: `${SITE_URL}/logo.png`,
    email: "info@mypantryhub.com",
    description: "Smart inventory and shopping lists for your home. Never run out of essentials again.",
    sameAs: [
      // Add social profiles here when available:
      // "https://twitter.com/pantryhub",
      // "https://facebook.com/pantryhub",
    ],
    contactPoint: {
      "@type": "ContactPoint",
      email: "info@mypantryhub.com",
      contactType: "customer support",
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

// WebSite Schema. No SearchAction: there is no public search page (PP-106).
export function WebSiteSchema() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Pantry Hub",
    url: `${SITE_URL}/`,
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

// SoftwareApplication Schema
export function SoftwareApplicationSchema() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Pantry Hub",
    applicationCategory: "LifestyleApplication",
    // Web app only; there is no App Store or Google Play listing (PP-106).
    operatingSystem: "Web",
    offers: [
      {
        "@type": "Offer",
        name: "Free",
        price: "0",
        priceCurrency: "USD",
      },
      {
        "@type": "Offer",
        name: "Pro",
        price: "4.99",
        priceCurrency: "USD",
        priceValidUntil: "2027-12-31",
      },
    ],
    featureList: [
      "Receipt scanning (OCR)",
      "Barcode scanner",
      "Quick Scan",
      "Pantry inventory",
      "Shopping lists",
    ],
    description: "Track pantry inventory, scan receipts and barcodes, and build shopping lists from what is running low.",
    url: `${SITE_URL}/`,
    screenshot: `${SITE_URL}/og-image.png`,
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

// FAQPage Schema
interface FAQ {
  question: string;
  answer: string;
}

export function FAQPageSchema({ faqs }: { faqs: FAQ[] }) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

// BreadcrumbList Schema
interface Breadcrumb {
  name: string;
  url: string;
}

export function BreadcrumbSchema({ items }: { items: Breadcrumb[] }) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

