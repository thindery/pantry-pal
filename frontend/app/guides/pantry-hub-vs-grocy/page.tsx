import Link from "next/link";
import {
  LegalHighlight,
  LegalPageShell,
  LegalSection,
} from "@/components/marketing/LegalPageShell";
import { BreadcrumbSchema } from "@/components/SchemaMarkup";
import { BRAND_NAME, SITE_URL } from "@/lib/site-content";
import { createPageMetadata } from "@/lib/site-metadata";

// PP-110: Grocy facts are from https://grocy.info/ (opened 2026-11-25, 12:45 AM CT,
// version 4.7.1 listed). Pantry Hub facts are shipped behavior only. Re-check
// grocy.info before editing this page.
export const metadata = createPageMetadata({
  title: "Pantry Hub vs Grocy: Which Pantry Inventory App Fits You?",
  description:
    "Grocy is a free, open-source app you host yourself. Pantry Hub is a hosted pantry app you open in your browser. An honest side-by-side of setup, scanning, features, and cost.",
  path: "/guides/pantry-hub-vs-grocy/",
});

const NAV = [
  { label: "1. Quick answer", id: "answer" },
  { label: "2. Side by side", id: "table" },
  { label: "3. Pick Grocy if", id: "grocy" },
  { label: "4. Pick Pantry Hub if", id: "pantry-hub" },
];

const ROWS: { label: string; grocy: string; hub: string }[] = [
  { label: "What it is", grocy: "Free, open-source groceries and household management you install and run yourself", hub: "Hosted pantry inventory and shopping list app; nothing to install" },
  { label: "Setup", grocy: "Self-hosted: web server, Docker image, Windows desktop app, or Home Assistant add-on", hub: "Open the site and sign in with Google" },
  { label: "Phones", grocy: "Responsive web app (installable PWA); community Android app and an Apple app", hub: "Mobile web in your phone's browser; no App Store or Google Play app" },
  { label: "Barcode scanning", grocy: "Barcode-reader interface and in-browser camera scanning; Open Food Facts lookup built in", hub: "Camera scanning with Quick Scan (adds each item without a tap); lookup from saved products, Open Food Facts, then UPCitemdb" },
  { label: "Receipt scanning", grocy: "Not listed on grocy.info", hub: "Photo of a receipt read with OCR; confirm the list, then add all" },
  { label: "Shopping list", grocy: "Minimum stock amounts feed the list; group by store section", hub: "Shopping list from items that are running low" },
  { label: "Beyond the pantry", grocy: "Recipes, meal planning, due dates, chores, tasks, batteries, equipment manuals, custom fields, REST API", hub: "Focused on what is on the shelf, scanning groceries in, and the shopping list" },
  { label: "Sharing", grocy: "Whoever can reach your server", hub: "Family plan: up to 5 household members share one pantry" },
  { label: "Cost", grocy: "Free (donations welcome); you provide the hardware and upkeep", hub: "Free plan up to 50 items and 5 receipt scans a month; Pro $4.99/month; Family $7.99/month" },
];

export default function PantryHubVsGrocy() {
  return (
    <>
      <BreadcrumbSchema
        items={[
          { name: BRAND_NAME, url: `${SITE_URL}/` },
          { name: "Pantry Hub vs Grocy", url: `${SITE_URL}/guides/pantry-hub-vs-grocy/` },
        ]}
      />
      <LegalPageShell
        title="Pantry Hub vs"
        titleAccent="Grocy"
        description="Both track what is in your pantry and help you shop. The big difference is who runs the app: you, or us."
        lastUpdated="November 25, 2026"
        navItems={NAV}
      >
        <LegalHighlight title="Quick answer">
          <p id="answer">
            Choose <strong>Grocy</strong> if you like running your own software and want recipes, meal
            plans, due dates, and chores in one free tool. Choose <strong>{BRAND_NAME}</strong> if you
            want to open a website on your phone, scan groceries in, and get a shopping list without
            setting up a server.
          </p>
        </LegalHighlight>

        <LegalSection id="table" number="1" title="Side by side">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border border-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="p-3 border-b border-slate-200"> </th>
                  <th className="p-3 border-b border-slate-200">Grocy</th>
                  <th className="p-3 border-b border-slate-200">{BRAND_NAME}</th>
                </tr>
              </thead>
              <tbody>
                {ROWS.map((row) => (
                  <tr key={row.label} className="align-top">
                    <th scope="row" className="p-3 border-b border-slate-100 font-semibold text-slate-800">{row.label}</th>
                    <td className="p-3 border-b border-slate-100 text-slate-600">{row.grocy}</td>
                    <td className="p-3 border-b border-slate-100 text-slate-600">{row.hub}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-sm text-slate-500">
            Grocy details are from <a href="https://grocy.info/" className="underline" rel="noopener">grocy.info</a> (version 4.7.1 listed, checked November 25, 2026).
          </p>
        </LegalSection>

        <LegalSection id="grocy" number="2" title="Pick Grocy if…">
          <ul className="list-disc pl-6 space-y-2">
            <li>You already run a home server, Docker, or Home Assistant.</li>
            <li>You want best-before and due-date tracking, recipes, and meal plans tied to stock.</li>
            <li>You want household chores, tasks, and equipment notes in the same app.</li>
            <li>You prefer free, open-source software and do not mind maintaining it.</li>
          </ul>
        </LegalSection>

        <LegalSection id="pantry-hub" number="3" title={`Pick ${BRAND_NAME} if…`}>
          <ul className="list-disc pl-6 space-y-2">
            <li>You want to start in a minute from your phone, with nothing to install or update.</li>
            <li>You add groceries in bulk: <Link href="/guides/barcode-scanning/" className="underline">Quick Scan</Link> adds each barcode without a tap, and <Link href="/guides/receipt-scanning/" className="underline">receipt scanning</Link> adds a whole trip.</li>
            <li>You mainly want to know what is on the shelf and what to buy next.</li>
            <li>You share one pantry with up to 5 people on the Family plan.</li>
          </ul>
          <p>
            Not sure how to add items? See <Link href="/guides/barcode-vs-receipt-vs-manual/" className="underline">barcode vs receipt vs manual entry</Link>, or <Link href="/pricing/" className="underline">compare plans</Link>.
          </p>
        </LegalSection>
      </LegalPageShell>
    </>
  );
}
