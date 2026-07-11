import {
  LegalHighlight,
  LegalPageShell,
  LegalSection,
} from "@/components/marketing/LegalPageShell";
import {
  BRAND_NAME,
  CONTACT_EMAIL,
  LEGAL_JURISDICTION,
  LEGAL_LINE,
  LEGAL_LOCATION_FULL,
  LEGAL_VENUE,
  SITE_URL,
} from "@/lib/site-content";
import { CONTACT_MAILTO } from "@/lib/contact";
import { createPageMetadata } from "@/lib/site-metadata";

export const metadata = createPageMetadata({
  title: "Terms of Service",
  description:
    "Pantry Hub Terms of Service. Read about subscriptions, acceptable use, and your rights when using our pantry inventory app.",
  path: "/terms",
});

const NAV = [
  { label: "1. Acceptance", id: "acceptance" },
  { label: "2. The Service", id: "service" },
  { label: "3. Accounts", id: "accounts" },
  { label: "4. Subscriptions", id: "subscriptions" },
  { label: "5. Your Content", id: "content" },
  { label: "6. Acceptable Use", id: "acceptable-use" },
  { label: "7. Warranties", id: "warranties" },
  { label: "8. Liability", id: "liability" },
  { label: "9. Governing Law", id: "governing-law" },
  { label: "10. Contact", id: "contact" },
];

export default function TermsPage() {
  return (
    <LegalPageShell
      title="Terms of"
      titleAccent="Service"
      description={`Please read these terms before using ${BRAND_NAME}. By creating an account or subscribing, you agree to these guidelines.`}
      lastUpdated="July 10, 2026"
      navItems={NAV}
    >
      <LegalHighlight title="Simple household software">
        <p>
          {BRAND_NAME} is a subscription SaaS for pantry inventory and shopping lists. Free and paid
          tiers define feature limits described on our pricing page. Paid subscriptions renew through
          Stripe until you cancel.
        </p>
      </LegalHighlight>

      <LegalSection id="acceptance" number="1" title="Acceptance of Terms">
        <p>
          These Terms of Service (&quot;Terms&quot;) are a binding agreement between you and{" "}
          <strong className="text-slate-900">{LEGAL_LINE}</strong> (&quot;Company,&quot; &quot;we,&quot;
          &quot;us,&quot; or &quot;our&quot;), organized under the laws of the {LEGAL_JURISDICTION}.
        </p>
        <p>
          By visiting{" "}
          <a href={SITE_URL} className="text-emerald-700 hover:underline">
            {SITE_URL}
          </a>
          , creating an account, or subscribing to a paid plan, you agree to these Terms.
        </p>
      </LegalSection>

      <LegalSection id="service" number="2" title="Description of Service">
        <p>
          {BRAND_NAME} provides web and mobile-friendly tools to track pantry inventory, generate
          shopping lists, scan receipts and barcodes, and optionally use AI-assisted features on
          eligible plans.
        </p>
        <p>
          We may modify, suspend, or discontinue features with reasonable notice when practicable.
          Beta or experimental features may be offered as-is.
        </p>
      </LegalSection>

      <LegalSection id="accounts" number="3" title="User Accounts">
        <p>You must be at least 18 years old and able to form a binding contract to use the service.</p>
        <p>You agree to:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Provide accurate account information.</li>
          <li>Keep login credentials confidential.</li>
          <li>Notify us if you suspect unauthorized access.</li>
          <li>Accept responsibility for activity under your account.</li>
        </ul>
      </LegalSection>

      <LegalSection id="subscriptions" number="4" title="Subscriptions & Billing">
        <ul className="list-disc pl-5 space-y-2">
          <li>
            <strong className="text-slate-900">Free tier:</strong> subject to usage limits shown on the
            pricing page (items, scans, devices, etc.).
          </li>
          <li>
            <strong className="text-slate-900">Paid plans:</strong> Pro and Family subscriptions are
            billed in advance through Stripe on monthly or annual cycles you select at checkout.
          </li>
          <li>
            <strong className="text-slate-900">Cancellation:</strong> you may cancel through the
            customer portal; access continues through the end of the paid period unless otherwise
            stated.
          </li>
          <li>
            <strong className="text-slate-900">Refunds:</strong> except where required by law, fees are
            non-refundable once a billing period has begun. Contact us if you believe you were charged
            in error.
          </li>
          <li>
            <strong className="text-slate-900">Price changes:</strong> we may change plan prices with
            notice; changes apply to subsequent renewal periods.
          </li>
        </ul>
      </LegalSection>

      <LegalSection id="content" number="5" title="Your Content">
        <p>
          You retain ownership of pantry data, lists, and other content you submit. You grant us a
          limited license to host, process, and display that content solely to provide the service.
        </p>
        <p>
          You represent that content you upload does not violate third-party rights or applicable law.
        </p>
      </LegalSection>

      <LegalSection id="acceptable-use" number="6" title="Acceptable Use">
        <p>You agree not to:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Use the service for unlawful purposes or to harm others.</li>
          <li>Attempt to bypass plan limits, security controls, or billing.</li>
          <li>Upload malware, abusive content, or automated scraping at scale without permission.</li>
          <li>Reverse engineer or resell the service except as expressly permitted.</li>
        </ul>
        <p>
          We may suspend or terminate accounts that violate these rules. Contact{" "}
          <a href={CONTACT_MAILTO} className="text-emerald-700 hover:underline">
            {CONTACT_EMAIL}
          </a>{" "}
          with concerns about account enforcement.
        </p>
      </LegalSection>

      <LegalSection id="warranties" number="7" title="Disclaimer of Warranties">
        <p>
          THE SERVICE IS PROVIDED &quot;AS IS&quot; AND &quot;AS AVAILABLE.&quot; WE DISCLAIM ALL
          WARRANTIES, EXPRESS OR IMPLIED, INCLUDING MERCHANTABILITY, FITNESS FOR A PARTICULAR
          PURPOSE, AND NON-INFRINGEMENT.
        </p>
        <p>
          Inventory counts, expiry estimates, and AI extractions are aids only — always verify food
          safety and quantities yourself.
        </p>
      </LegalSection>

      <LegalSection id="liability" number="8" title="Limitation of Liability">
        <p>
          TO THE MAXIMUM EXTENT PERMITTED BY LAW, WE ARE NOT LIABLE FOR INDIRECT, INCIDENTAL,
          SPECIAL, CONSEQUENTIAL, OR EXEMPLARY DAMAGES ARISING FROM YOUR USE OF THE SERVICE.
        </p>
        <p>
          OUR TOTAL LIABILITY FOR ANY CLAIM IS LIMITED TO THE AMOUNT YOU PAID US IN THE TWELVE (12)
          MONTHS BEFORE THE EVENT GIVING RISE TO THE CLAIM, OR ONE HUNDRED U.S. DOLLARS ($100) IF YOU
          USE ONLY THE FREE TIER.
        </p>
      </LegalSection>

      <LegalSection id="governing-law" number="9" title="Governing Law & Changes">
        <p>
          These Terms are governed by the laws of the{" "}
          <strong className="text-slate-900">{LEGAL_JURISDICTION}</strong>, without regard to
          conflict-of-law principles.
        </p>
        <p>
          You consent to exclusive jurisdiction and venue in the state and federal courts located in{" "}
          {LEGAL_VENUE}.
        </p>
        <p>
          We may update these Terms from time to time. Material changes will be posted with a revised
          &quot;Last updated&quot; date. Continued use after the effective date constitutes acceptance.
        </p>
      </LegalSection>

      <LegalSection id="contact" number="10" title="Contact Us">
        <p>Questions about these Terms?</p>
        <div className="p-4 rounded-xl border border-slate-200 bg-white w-fit">
          <span className="block text-xs text-slate-400 font-medium uppercase mb-1">Legal contact</span>
          <a
            href={CONTACT_MAILTO}
            className="text-slate-900 font-semibold hover:text-emerald-700 transition-colors"
          >
            {CONTACT_EMAIL}
          </a>
          <span className="block text-sm text-slate-500 mt-2">{LEGAL_LOCATION_FULL}</span>
        </div>
      </LegalSection>
    </LegalPageShell>
  );
}