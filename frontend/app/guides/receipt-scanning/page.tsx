import Link from "next/link";
import {
  LegalHighlight,
  LegalPageShell,
  LegalSection,
} from "@/components/marketing/LegalPageShell";
import { BreadcrumbSchema } from "@/components/SchemaMarkup";
import { BRAND_NAME, SITE_URL } from "@/lib/site-content";
import { createPageMetadata } from "@/lib/site-metadata";

// PP-108: describes shipped behavior only (backend/services/receipt_ocr.py, TIER_LIMITS).
export const metadata = createPageMetadata({
  title: "How Receipt Scanning Works",
  description:
    "Add a whole grocery trip to your pantry from one receipt photo. How Pantry Hub reads receipts, how to check the items before they are added, and the monthly scan limits.",
  path: "/guides/receipt-scanning/",
});

const NAV = [
  { label: "1. Take the photo", id: "photo" },
  { label: "2. Reading the receipt", id: "ocr" },
  { label: "3. Check and add", id: "confirm" },
  { label: "4. Limits", id: "limits" },
  { label: "5. Better photos", id: "tips" },
];

export default function ReceiptScanningGuide() {
  return (
    <>
      <BreadcrumbSchema
        items={[
          { name: BRAND_NAME, url: `${SITE_URL}/` },
          { name: "Receipt scanning", url: `${SITE_URL}/guides/receipt-scanning/` },
        ]}
      />
      <LegalPageShell
        title="How receipt"
        titleAccent="scanning works"
        description={`Snap your grocery receipt and ${BRAND_NAME} lists the items it found. You check the list, then add everything to your pantry in one tap.`}
        lastUpdated="November 25, 2026"
        navItems={NAV}
      >
        <LegalHighlight title="Short version">
          <p>
            Open <strong>Scan Receipt</strong>, take a photo or choose one, and {BRAND_NAME} reads the
            text. Look over the items it found, then tap <strong>Confirm &amp; Add All</strong>.
          </p>
        </LegalHighlight>

        <LegalSection id="photo" number="1" title="Take or upload the photo">
          <p>
            Sign in and open <strong>Scan Receipt</strong>. Tap <strong>Take Photo</strong> to use your
            camera, or <strong>Choose File</strong> to pick a receipt photo you already have.
          </p>
        </LegalSection>

        <LegalSection id="ocr" number="2" title="How Pantry Hub reads the receipt">
          <p>
            {BRAND_NAME} uses optical character recognition (OCR) with the open-source Tesseract
            engine to read the printed text, then picks out the grocery lines and their quantities.
            Store receipts use short codes and abbreviations, so some names come out shortened or
            need a check.
          </p>
        </LegalSection>

        <LegalSection id="confirm" number="3" title="Check the items, then add them">
          <p>
            You see a list of the items found, each with its category and quantity. Nothing goes into
            your pantry until you tap <strong>Confirm &amp; Add All</strong>. If the list looks wrong,
            retake the photo instead. You can always fix a single item later from your pantry list.
          </p>
        </LegalSection>

        <LegalSection id="limits" number="4" title="Monthly limits">
          <ul className="list-disc pl-6 space-y-2">
            <li>Free plan: 5 receipt scans a month.</li>
            <li>Pro plan: unlimited receipt scans.</li>
          </ul>
          <p>
            Compare plans on the <Link href="/pricing/" className="underline">pricing page</Link>.
          </p>
        </LegalSection>

        <LegalSection id="tips" number="5" title="Tips for a clean read">
          <ul className="list-disc pl-6 space-y-2">
            <li>Lay the receipt flat on a dark table and smooth out folds.</li>
            <li>Use even light and avoid shadows from your phone or hand.</li>
            <li>Fit the whole receipt in the frame, straight on, not at an angle.</li>
            <li>Long receipt? Scan the grocery part and skip coupons and survey text.</li>
          </ul>
          <p>
            Only bought a few things? <Link href="/guides/barcode-scanning/" className="underline">Barcode scanning with Quick Scan</Link> is faster for a handful of items.
          </p>
        </LegalSection>
      </LegalPageShell>
    </>
  );
}
