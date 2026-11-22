# PP-130: Privacy compliance (CCPA/CPRA, GPC, EU consent)

**Status:** 📋 Ready for Review (Shipped in PP-117, PP-120, PP-122)
**Priority:** P1
**Phase:** Privacy & Compliance (audit 2026-11-22)
**Created:** 2026-11-22
**Owner:** Pantry Hub Lead / agy
**Needs Tylor sign-in:** No
**Depends on:** PP-117 (GA4 tag + Consent Mode v2), PP-120 (Cloudflare Web Analytics), PP-122 (Privacy policy update)
**Related:** PP-067 (Content Security Policy hardening)

---

## Summary

This ticket documents the implementation of multi-jurisdiction privacy compliance on Pantry Hub (`mypantryhub.com`), covering US state privacy frameworks (CCPA/CPRA, CPA, VCDPA, etc.), European data protection and ePrivacy directives (GDPR, UK GDPR, Swiss FADP), and Global Privacy Control (GPC) signal handling.

## What Shipped

1. **Google Consent Mode v2 Defaults:**
   - Universal ad feature denial: `ad_storage`, `ad_user_data`, and `ad_personalization` are permanently set to `'denied'` globally across all visitors.
   - Signals and ad personalization features are turned off (`allow_google_signals: false`, `allow_ad_personalization_signals: false`, `anonymize_ip: true`).

2. **Global Privacy Control (GPC) Honoring:**
   - In accordance with California CPRA enforcement and emerging state laws, the application checks `navigator.globalPrivacyControl`.
   - When GPC is detected as active (`true`), analytics storage is set to `'denied'`, and the Google Analytics script is not loaded at all.
   - GPC signal takes precedence over any prior manual consent choice in browser storage.

3. **EEA, UK, and Switzerland Consent Banner:**
   - Visitors from the 32 countries comprising the EEA, UK, and Switzerland default to `analytics_storage: 'denied'`.
   - A non-intrusive consent banner is displayed to prompt visitors in these jurisdictions for optional analytics consent.
   - If the user declines, analytics storage remains denied and GA4 is not loaded.
   - If the user accepts, consent is updated via `gtag('consent', 'update', { analytics_storage: 'granted' })` and the GA4 script is initialized.
   - Decisions are persisted locally (`localStorage`), and can be revoked or overridden by enabling GPC.

4. **Cloudflare IP Geolocation Detection:**
   - Edge request header `CF-IPCountry` is inspected by Next.js middleware (`frontend/middleware.ts`).
   - A non-identifying regional cookie (`ph_region=eea` or `ph_region=other`) is set to allow client-side consent evaluation without transmitting personal data.

5. **Cloudflare Web Analytics (Cookieless RUM):**
   - Cloudflare Web Analytics (`beacon.min.js`) is deployed site-wide for performance monitoring and page metrics.
   - It is strictly cookieless, stores no client identifiers, and is not gated by the cookie consent banner.

6. **Privacy Policy Disclosures & Rights Navigation:**
   - `frontend/app/privacy/page.tsx` was updated with explicit disclosures of GA4 (data processor, IP anonymization, ad signals disabled, opt-out link) and Cloudflare Web Analytics.
   - A dedicated **"Your Privacy Choices"** section (`#privacy-choices`) outlines consumer rights (know, delete, correct, opt-out) and confirms Pantry Hub does not sell or share personal data for cross-context behavioral advertising.
   - Dedicated privacy requests contact established: `hello@mypantryhub.com`.
   - Footer navigation in `MarketingFooter.tsx` includes a direct link to "Your Privacy Choices".

---

## Statutory Thresholds & Legal Status

> [!NOTE]
> This analysis is for operational and technical compliance planning, not legal advice.

### California Consumer Privacy Act (CCPA) / California Privacy Rights Act (CPRA)
Under Cal. Civ. Code § 1798.140(d), the CCPA/CPRA applies to a for-profit business doing business in California that meets **at least one** of three thresholds:
1. Gross annual revenue exceeding $25 million (adjusted periodically; ~$26.6 million in 2026);
2. Annually buys, sells, or shares personal information of 100,000 or more California consumers, households, or devices;
3. Derives 50% or more of annual revenue from selling or sharing consumers' personal information.

**Pantry Hub Status:**
Pantry Hub operates well below these revenue and volume thresholds, and never sells or shares consumer data for commercial gain. Therefore, the implementation of GPC honoring, the "Your Privacy Choices" section, and deletion/correction request channels represents industry best practice rather than an immediate statutory mandate. This foundation positions the service to remain compliant as user adoption expands.

### European Union (GDPR / ePrivacy) & UK GDPR
Under the ePrivacy Directive (Article 5(3)) and GDPR, storing or accessing non-essential information on user devices (such as analytics cookies) requires prior freely given, specific, informed, and unambiguous consent in many EU/EEA member states.
- The consent banner implemented for visitors from EEA/UK/CH adheres to this conservative interpretation by keeping `analytics_storage` denied until user action.

---

## Remaining / Follow-Ups

- **Consent Management Platform (CMP):** The current lightweight in-house banner and Consent Mode v2 integration fulfills all zero-cost requirements without third-party vendor overhead. If future advertising or third-party marketing tools are introduced, evaluation of an IAB TCF v2.2-compliant CMP (e.g. Cookiebot, Klaro, or Didomi) may be scheduled.
- **DSR Workflow:** Data Subject Requests (access, deletion, correction) sent to `hello@mypantryhub.com` are manually fulfilled via admin database queries and Stripe portal controls.
