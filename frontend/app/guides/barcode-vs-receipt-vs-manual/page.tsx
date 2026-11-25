import Link from "next/link";
import {
  LegalHighlight,
  LegalPageShell,
  LegalSection,
} from "@/components/marketing/LegalPageShell";
import { BreadcrumbSchema } from "@/components/SchemaMarkup";
import { BRAND_NAME, SITE_URL } from "@/lib/site-content";
import { createPageMetadata } from "@/lib/site-metadata";

// PP-110: answer-style guide; shipped behavior only.
export const metadata = createPageMetadata({
  title: "Barcode, Receipt, or Manual Entry: Best Way to Add Pantry Items",
  description:
    "Three ways to get groceries into a pantry inventory app. When barcode scanning, a receipt photo, or typing an item is fastest, and what each one needs.",
  path: "/guides/barcode-vs-receipt-vs-manual/",
});

const NAV = [
  { label: "1. Quick answer", id: "answer" },
  { label: "2. Barcode", id: "barcode" },
  { label: "3. Receipt", id: "receipt" },
  { label: "4. Manual entry", id: "manual" },
];

export default function EntryMethodsGuide() {
  return (
    <>
      <BreadcrumbSchema
        items={[
          { name: BRAND_NAME, url: `${SITE_URL}/` },
          { name: "Barcode vs receipt vs manual entry", url: `${SITE_URL}/guides/barcode-vs-receipt-vs-manual/` },
        ]}
      />
      <LegalPageShell
        title="Barcode, receipt, or"
        titleAccent="manual entry?"
        description={`${BRAND_NAME} gives you three ways to add groceries. Here is when each one is fastest.`}
        lastUpdated="November 25, 2026"
        navItems={NAV}
      >
        <LegalHighlight title="Quick answer">
          <p id="answer">
            Unloading a big shop? Snap the <strong>receipt</strong>. Putting away a few packaged
            items? <strong>Scan barcodes</strong> with Quick Scan. Fresh produce, bulk bins, or
            homemade food with no barcode? <strong>Type it in</strong>.
          </p>
        </LegalHighlight>

        <LegalSection id="barcode" number="1" title="Barcode scanning (best for packaged items)">
          <ul className="list-disc pl-6 space-y-2">
            <li>Point your phone camera at the barcode. With Quick Scan on, each item is added right away and the camera keeps going.</li>
            <li>Names come from products already looked up, then Open Food Facts, then UPCitemdb.</li>
            <li>Unknown barcode: type a name once and keep scanning.</li>
            <li>Scanning something you already have adds to the same row.</li>
          </ul>
          <p><Link href="/guides/barcode-scanning/" className="underline">Full barcode and Quick Scan guide</Link></p>
        </LegalSection>

        <LegalSection id="receipt" number="2" title="Receipt photo (best for a full grocery trip)">
          <ul className="list-disc pl-6 space-y-2">
            <li>Take or upload one photo of the receipt. {BRAND_NAME} reads it with OCR and lists the items it found.</li>
            <li>Check the list, then tap Confirm &amp; Add All.</li>
            <li>Store abbreviations can shorten names, so give the list a quick look.</li>
            <li>Free plan: 5 receipt scans a month. Pro and Family: unlimited.</li>
          </ul>
          <p><Link href="/guides/receipt-scanning/" className="underline">Full receipt scanning guide</Link></p>
        </LegalSection>

        <LegalSection id="manual" number="3" title="Manual entry (best for items without a barcode)">
          <ul className="list-disc pl-6 space-y-2">
            <li>Use Add Item for produce, bulk-bin food, leftovers, or anything without a label.</li>
            <li>Works on every plan. The Free plan holds up to 50 pantry items in total.</li>
          </ul>
          <p>
            Comparing apps? Read <Link href="/guides/pantry-hub-vs-grocy/" className="underline">{BRAND_NAME} vs Grocy</Link> or <Link href="/pricing/" className="underline">see plans</Link>.
          </p>
        </LegalSection>
      </LegalPageShell>
    </>
  );
}
