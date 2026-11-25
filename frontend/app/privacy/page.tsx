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
  SITE_URL,
} from "@/lib/site-content";
import { CONTACT_MAILTO } from "@/lib/contact";
import { createPageMetadata } from "@/lib/site-metadata";

export const metadata = createPageMetadata({
  title: "Privacy Policy",
  description:
    "Learn how Peak Collective LLC dba Pantry Hub collects, uses, and protects your account and pantry data.",
  path: "/privacy/",
});

const PRIVACY_EMAIL = "hello@mypantryhub.com";
const PRIVACY_MAILTO = `mailto:${PRIVACY_EMAIL}`;

const NAV = [
  { label: "1. Introduction", id: "introduction" },
  { label: "2. Data We Collect", id: "data-collection" },
  { label: "3. How We Use Data", id: "data-use" },
  { label: "4. Inventory & Scan Features", id: "inventory-data" },
  { label: "5. Data Retention", id: "data-retention" },
  { label: "6. Third Parties", id: "third-parties" },
  { label: "7. Cookies & Analytics", id: "cookies" },
  { label: "8. Security", id: "security" },
  { label: "9. Your Privacy Rights", id: "rights" },
  { label: "10. Your Privacy Choices", id: "privacy-choices" },
  { label: "11. Contact Us", id: "contact" },
];

export default function PrivacyPage() {
  return (
    <LegalPageShell
      title="Privacy"
      titleAccent="Policy"
      description={`We are committed to transparency about how ${BRAND_NAME} handles your account, pantry inventory, and subscription data.`}
      lastUpdated="November 22, 2026"
      navItems={NAV}
    >
      <LegalHighlight title="Your pantry data stays yours">
        <p>
          {BRAND_NAME} helps households track inventory and shopping lists. We do not sell your
          personal information or pantry contents. We use your data only to operate the service you
          signed up for.
        </p>
      </LegalHighlight>

      <LegalSection id="introduction" number="1" title="Introduction">
        <p>
          {BRAND_NAME} (&quot;we,&quot; &quot;us,&quot; or &quot;our&quot;) is operated by{" "}
          <strong className="text-slate-900">{LEGAL_LINE}</strong>, organized under the laws of the{" "}
          {LEGAL_JURISDICTION}.
        </p>
        <p>
          This Privacy Policy describes information we collect when you visit{" "}
          <a href={SITE_URL} className="text-emerald-700 hover:underline">
            {SITE_URL}
          </a>
          , create an account, use the dashboard, or contact support.
        </p>
        <p>
          We may update this policy from time to time. Material changes will be posted with a revised
          &quot;Last updated&quot; date.
        </p>
      </LegalSection>

      <LegalSection id="data-collection" number="2" title="Data We Collect">
        <ul className="list-disc pl-5 space-y-2">
          <li>
            <strong className="text-slate-900">Account information:</strong> name, email, profile
            image, and authentication details when you sign in with Google.
          </li>
          <li>
            <strong className="text-slate-900">Pantry data:</strong> inventory items, quantities,
            categories, shopping lists, activity history, and household sharing settings you enter or
            generate in the app.
          </li>
          <li>
            <strong className="text-slate-900">Scan inputs:</strong> receipt images and barcode lookups
            you submit for OCR and product matching.
          </li>
          <li>
            <strong className="text-slate-900">Billing information:</strong> processed by Stripe. We do
            not store full payment card numbers on our servers.
          </li>
          <li>
            <strong className="text-slate-900">Technical metadata:</strong> IP addresses, browser
            user-agent strings, and request timestamps in server logs for security and operations.
          </li>
        </ul>
        <p>
          We do not knowingly collect personal information from children under 13. Contact us if you
          believe we have collected such information.
        </p>
      </LegalSection>

      <LegalSection id="data-use" number="3" title="How We Use Your Data">
        <ul className="list-disc pl-5 space-y-1">
          <li>Provide inventory tracking, shopping lists, and subscription features.</li>
          <li>Authenticate your account and keep sessions secure.</li>
          <li>Process payments and manage Pro or Family plans.</li>
          <li>Run receipt scanning and barcode lookup you request.</li>
          <li>Send transactional emails and respond to support requests.</li>
          <li>Detect abuse, enforce limits, and maintain service reliability.</li>
        </ul>
      </LegalSection>

      <LegalSection id="inventory-data" number="4" title="Inventory & Scan Features">
        <p>
          Pantry items and activity logs are stored in our database and associated with your account.
          If you use household sharing on a Family plan, designated members you invite may view and
          edit shared inventory according to product settings.
        </p>
        <p>
          Receipt images sent for OCR processing are used to extract item details for your inventory.
          Do not upload images containing sensitive information unrelated to grocery or pantry items.
        </p>
      </LegalSection>

      <LegalSection id="data-retention" number="5" title="Data Retention & Deletion">
        <ul className="list-disc pl-5 space-y-2">
          <li>
            <strong className="text-slate-900">Active accounts:</strong> data retained while your
            account remains open.
          </li>
          <li>
            <strong className="text-slate-900">Closed accounts:</strong> we delete or anonymize
            personal data within 90 days of a verified deletion request, except where retention is
            required by law or billing records.
          </li>
          <li>
            <strong className="text-slate-900">Server logs:</strong> retained up to 90 days for
            security.
          </li>
        </ul>
        <p>
          To request account deletion, email{" "}
          <a href={PRIVACY_MAILTO} className="text-emerald-700 hover:underline">
            {PRIVACY_EMAIL}
          </a>{" "}
          or{" "}
          <a href={CONTACT_MAILTO} className="text-emerald-700 hover:underline">
            {CONTACT_EMAIL}
          </a>
          .
        </p>
      </LegalSection>

      <LegalSection id="third-parties" number="6" title="Third-Party Services">
        <p>We share limited data with providers that help us operate {BRAND_NAME}:</p>
        <ul className="list-disc pl-5 space-y-2">
          <li>
            <strong className="text-slate-900">Google</strong> — OAuth sign-in and Google Analytics 4 (processor)
          </li>
          <li>
            <strong className="text-slate-900">Stripe</strong> — subscription billing
          </li>
          <li>
            <strong className="text-slate-900">Open Food Facts</strong> — barcode product lookups
          </li>
          <li>
            <strong className="text-slate-900">Cloudflare</strong> — DNS, CDN, and cookieless Web Analytics / RUM
          </li>
          <li>
            <strong className="text-slate-900">OVH</strong> — application hosting and PostgreSQL
          </li>
        </ul>
        <p>
          We are based in {LEGAL_LOCATION_FULL}. If you access the service from outside the U.S., your
          information may be processed in the U.S. and other countries where our providers operate.
        </p>
      </LegalSection>

      <LegalSection id="cookies" number="7" title="Cookies & Analytics">
        <p>
          We use session cookies and authentication tokens (such as NextAuth session cookies)
          strictly required to keep you signed in. Disabling these necessary cookies in your browser
          settings will prevent sign-in.
        </p>
        <p>
          We do not use third-party advertising cookies, and we do not track you across unrelated
          websites for marketing purposes.
        </p>
        <p>
          We use Google Analytics 4 (GA4) to understand general website usage and improve Pantry Hub.
          Google acts as a data processor on our behalf; data is collected solely to understand site
          usage, not to sell ads for us or build advertising profiles. Our analytics tag is configured
          with strict privacy guardrails: Google signals is off, IP anonymization is permanently on,
          and advertising storage, personalization, and ad user data are denied.
        </p>
        <p>
          GA4 sets analytics cookies only when analytics storage is granted. Visitors in the European
          Economic Area (EEA), United Kingdom, and Switzerland are presented with a consent banner and
          must explicitly grant consent before GA4 loads. You can also opt out of Google Analytics across
          all websites by installing the{" "}
          <a
            href="https://tools.google.com/dlpage/gaoptout"
            target="_blank"
            rel="noopener noreferrer"
            className="text-emerald-700 hover:underline"
          >
            Google Analytics Opt-out Browser Add-on
          </a>
          .
        </p>
        <p>
          We honor Global Privacy Control (GPC): when your browser transmits a GPC signal, we treat it
          as an automatic opt-out and do not load Google Analytics.
        </p>
        <p>
          In addition, we use Cloudflare Web Analytics for Real User Monitoring (RUM) and performance
          diagnostics. Cloudflare Web Analytics is cookieless and does not collect or track personal
          identifiers.
        </p>
      </LegalSection>

      <LegalSection id="security" number="8" title="Data Security">
        <ul className="list-disc pl-5 space-y-1">
          <li>HTTPS encryption for data in transit.</li>
          <li>Authentication required on user API routes.</li>
          <li>Role-based admin access for internal operations.</li>
          <li>Stripe-hosted checkout for payment card handling.</li>
        </ul>
        <p>
          If we become aware of a breach affecting your personal information, we will notify you and
          relevant authorities as required by law.
        </p>
      </LegalSection>

      <LegalSection id="rights" number="9" title="Your Privacy Rights">
        <p>
          Depending on your location (including the European Economic Area, United Kingdom, and other
          applicable jurisdictions), you may have the right to access, correct, delete, or export
          your personal data.
        </p>
        <p>
          Submit requests to{" "}
          <a href={PRIVACY_MAILTO} className="text-emerald-700 hover:underline">
            {PRIVACY_EMAIL}
          </a>{" "}
          or{" "}
          <a href={CONTACT_MAILTO} className="text-emerald-700 hover:underline">
            {CONTACT_EMAIL}
          </a>
          . We will verify your identity using your account email and respond within applicable legal
          timeframes.
        </p>
      </LegalSection>

      <LegalSection id="privacy-choices" number="10" title="Your Privacy Choices">
        <p>
          We provide clear privacy choices and controls as an industry best practice for all households.
          Residents of California and other U.S. states with consumer data privacy frameworks (such as
          Colorado, Connecticut, Utah, and Virginia) have specific rights regarding their personal
          information:
        </p>
        <ul className="list-disc pl-5 space-y-2">
          <li>
            <strong className="text-slate-900">No Sale or Sharing:</strong> We do not sell personal
            information, and we do not share or disclose personal information for cross-context
            behavioral advertising.
          </li>
          <li>
            <strong className="text-slate-900">Global Privacy Control (GPC):</strong> We honor GPC as
            a valid, automated opt-out of sale/sharing and of analytics cookies. When a browser sends
            a GPC signal, Google Analytics is not loaded.
          </li>
          <li>
            <strong className="text-slate-900">Rights to Know, Delete, and Correct:</strong> You have
            the right to request disclosure of the personal information we maintain, request correction
            of inaccurate personal data, and request deletion of your information, subject to limited
            legal exceptions.
          </li>
          <li>
            <strong className="text-slate-900">Right to Opt Out:</strong> You have the right to opt
            out of non-essential data processing and analytics tracking.
          </li>
        </ul>
        <p>
          You can exercise any of these privacy choices at any time by emailing{" "}
          <a href={PRIVACY_MAILTO} className="text-emerald-700 font-semibold hover:underline">
            {PRIVACY_EMAIL}
          </a>
          . We verify requests against your registered account email and do not discriminate against
          anyone for exercising their privacy rights.
        </p>
      </LegalSection>

      <LegalSection id="contact" number="11" title="Contact Us">
        <p>Questions about this Privacy Policy or your data?</p>
        <div className="flex flex-col sm:flex-row gap-4 mt-2">
          <div className="p-4 rounded-xl border border-slate-200 bg-white">
            <span className="block text-xs text-slate-400 font-medium uppercase mb-1">
              Privacy inquiries & choices
            </span>
            <a
              href={PRIVACY_MAILTO}
              className="text-slate-900 font-semibold hover:text-emerald-700 transition-colors"
            >
              {PRIVACY_EMAIL}
            </a>
            <span className="block text-sm text-slate-500 mt-2">{LEGAL_LOCATION_FULL}</span>
          </div>
          <div className="p-4 rounded-xl border border-slate-200 bg-white">
            <span className="block text-xs text-slate-400 font-medium uppercase mb-1">
              General support
            </span>
            <a
              href={CONTACT_MAILTO}
              className="text-slate-900 font-semibold hover:text-emerald-700 transition-colors"
            >
              {CONTACT_EMAIL}
            </a>
            <span className="block text-sm text-slate-500 mt-2">{LEGAL_LINE}</span>
          </div>
        </div>
      </LegalSection>
    </LegalPageShell>
  );
}
