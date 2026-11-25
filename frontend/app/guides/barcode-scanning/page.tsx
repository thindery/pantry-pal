import Link from "next/link";
import {
  LegalHighlight,
  LegalPageShell,
  LegalSection,
} from "@/components/marketing/LegalPageShell";
import { BreadcrumbSchema } from "@/components/SchemaMarkup";
import { BRAND_NAME, SITE_URL } from "@/lib/site-content";
import { createPageMetadata } from "@/lib/site-metadata";

// PP-108: describes shipped behavior only (PP-076, PP-080, PP-081, PP-087, PP-088).
export const metadata = createPageMetadata({
  title: "How Barcode Scanning and Quick Scan Work",
  description:
    "Scan grocery barcodes with your phone camera to add pantry items. How Quick Scan adds items without a tap, what happens with unknown barcodes, and where product names come from.",
  path: "/guides/barcode-scanning/",
});

const NAV = [
  { label: "1. Start a scan", id: "start" },
  { label: "2. Quick Scan", id: "quick-scan" },
  { label: "3. Quick Scan off", id: "confirm-mode" },
  { label: "4. Unknown barcodes", id: "unknown" },
  { label: "5. Product names", id: "lookup" },
  { label: "6. Tips", id: "tips" },
];

export default function BarcodeScanningGuide() {
  return (
    <>
      <BreadcrumbSchema
        items={[
          { name: BRAND_NAME, url: `${SITE_URL}/` },
          { name: "Barcode scanning", url: `${SITE_URL}/guides/barcode-scanning/` },
        ]}
      />
      <LegalPageShell
        title="How barcode scanning and"
        titleAccent="Quick Scan work"
        description={`Point your phone camera at a grocery barcode and ${BRAND_NAME} adds the item to your pantry. Here is exactly what happens, step by step.`}
        lastUpdated="November 25, 2026"
        navItems={NAV}
      >
        <LegalHighlight title="Short version">
          <p>
            Open <strong>Scan Barcode</strong>, allow the camera, and scan. With Quick Scan on (the
            default), each barcode adds one item right away and the camera keeps scanning. If{" "}
            {BRAND_NAME} does not know a barcode, it asks you for a name once.
          </p>
        </LegalHighlight>

        <LegalSection id="start" number="1" title="Start a scan">
          <p>
            Sign in, open <strong>Scan Barcode</strong>, and allow camera access. {BRAND_NAME} runs in
            your phone&apos;s web browser, so there is nothing to install. It uses the rear camera and
            reads the standard retail barcodes on grocery packaging (UPC-A, UPC-E, EAN-13, and EAN-8).
          </p>
          <p>
            The scanner checks each barcode&apos;s check digit and waits until it reads the same code
            twice in a row, so a blurry or partial read is ignored instead of adding the wrong item.
            Tap the screen to focus. If your phone supports it, a flashlight button appears for dim
            pantries.
          </p>
        </LegalSection>

        <LegalSection id="quick-scan" number="2" title="Quick Scan: scan, add, keep going">
          <p>Quick Scan is on the first time you open the scanner, and your choice is remembered.</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>A recognized barcode adds one to your pantry immediately and shows a short &quot;Added&quot; message with the product name.</li>
            <li>The camera keeps scanning, so you can move straight to the next item.</li>
            <li>The same barcode is not added twice if the camera sees it again within a few seconds.</li>
            <li>A running list of this session&apos;s scans sits under the camera. Use its + and − buttons to fix a count. − only takes back what this session added.</li>
            <li><strong>Clear</strong> empties the session list. It does not undo what was added to your pantry.</li>
          </ul>
          <p>
            Scanning a product you already have adds to the same pantry row instead of creating a
            duplicate.
          </p>
        </LegalSection>

        <LegalSection id="confirm-mode" number="3" title="With Quick Scan off">
          <p>
            Turn Quick Scan off to check each item first. After a scan you see a preview card and choose{" "}
            <strong>Add to Inventory</strong> or <strong>Scan Again</strong>. This mode also offers{" "}
            <strong>Upload Image</strong> (scan a barcode from a photo) and <strong>Type Barcode</strong>{" "}
            (enter the numbers by hand).
          </p>
        </LegalSection>

        <LegalSection id="unknown" number="4" title="When a barcode is unknown">
          <p>
            Store brands and local products are not always in public databases. When {BRAND_NAME}{" "}
            cannot find a name, scanning pauses and asks you to type one. After you save it, scanning
            picks up again.
          </p>
        </LegalSection>

        <LegalSection id="lookup" number="5" title="Where product names come from">
          <p>{BRAND_NAME} looks a barcode up in this order:</p>
          <ol className="list-decimal pl-6 space-y-2">
            <li>Products {BRAND_NAME} has already looked up.</li>
            <li>
              <a href="https://world.openfoodfacts.org/" className="underline" rel="noopener">Open Food Facts</a>, a free public food database.
            </li>
            <li>UPCitemdb, as a backup when Open Food Facts is slow or has no match.</li>
          </ol>
        </LegalSection>

        <LegalSection id="tips" number="6" title="Tips for faster scanning">
          <ul className="list-disc pl-6 space-y-2">
            <li>Hold the barcode flat and fill about half the frame. Move closer rather than zooming.</li>
            <li>Avoid glare from overhead lights on shiny packages. Tilt the item slightly.</li>
            <li>Use the flashlight button in a dark pantry or basement.</li>
            <li>The Free plan holds up to 50 pantry items. Pro and Family have no item limit. See <Link href="/pricing/" className="underline">pricing</Link>.</li>
          </ul>
          <p>
            Have a stack of groceries and a receipt? <Link href="/guides/receipt-scanning/" className="underline">Receipt scanning</Link> adds a whole trip at once.
          </p>
        </LegalSection>
      </LegalPageShell>
    </>
  );
}
