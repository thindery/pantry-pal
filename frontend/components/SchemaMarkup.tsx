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

// WebSite Schema with SearchAction
export function WebSiteSchema() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Pantry Hub",
    url: SITE_URL,
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${SITE_URL}/search?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
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
    operatingSystem: "Web, iOS, Android",
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
      {
        "@type": "Offer",
        name: "Family",
        price: "7.99",
        priceCurrency: "USD",
        priceValidUntil: "2027-12-31",
      },
    ],
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: "4.8",
      ratingCount: "50000",
      bestRating: "5",
    },
    featureList: [
      "AI Receipt Scanning",
      "Voice Assistant",
      "Barcode Scanner",
      "Smart Analytics",
      "Shopping Lists",
      "Household Sharing",
    ],
    description: "Track pantry inventory, scan receipts and barcodes, auto-generate shopping lists, and manage household stock with AI-powered kitchen utilities.",
    url: SITE_URL,
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

// Review/Rating Schema for Testimonials
export function AggregateRatingSchema() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "AggregateRating",
    ratingValue: "4.8",
    reviewCount: "50000",
    bestRating: "5",
    worstRating: "1",
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
