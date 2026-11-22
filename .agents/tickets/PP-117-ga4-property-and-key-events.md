# PP-117: Create a GA4 property and add a consent-safe tag with key events

**Status:** ✅ Done
**Priority:** P1
**Updated:** 2026-11-22, 5:03 PM America/Chicago — shipped in production deploy `db0ef3e` (analytics commit `4d58e1f`)
**Phase:** Analytics / Search Console (audit 2026-11-22)
**Created:** 2026-11-22
**Owner:** Tylor (Google sign-in to create the property and web stream); Pantry Hub Lead / agy for the tag and events
**Needs Tylor sign-in:** Yes — [analytics.google.com](https://analytics.google.com) on `thindery@gmail.com` (gcloud on the Mini is already logged into this account)
**Depends on:** PP-122 should ship in the same deploy as the tag (privacy disclosure)
**Blocks:** Trusted traffic counts; PP-121 GA4 read-only key; conversion reporting
**Audit:** `.agents/docs/analytics-and-search-console.md`
**Parent:** PP-109 (split)

---

## Problem

Live HTML at `https://www.mypantryhub.com` has no GA4 / gtag / GTM snippet, and no `G-` Measurement ID. CSP `connect-src` is only `'self'`, the site origins, and `https://api.stripe.com`, so a tag added without a CSP change would be blocked. There is no client event tracking for signup, first scan, checkout, or cancel. This desk will not invent GA4 numbers.

The site already has paying customers, so we want a $0, consent-safe GA4 setup — not ads, not Google signals.

## Behavior

### Tylor (dashboard)

1. Open [analytics.google.com](https://analytics.google.com) signed in as `thindery@gmail.com`.
2. Create a **GA4** account/property for Pantry Hub if one does not already exist (Account: Peak Collective / Pantry Hub; Property: Pantry Hub; timezone America/Chicago; currency USD).
3. Add a **Web** data stream for `https://www.mypantryhub.com` (also collect apex, which 301s to www).
4. Copy the Measurement ID (`G-…`). Hand it to the agent; do not paste it into git or a chat log if you can put it in the Mini env / Keychain instead.
5. In Admin, turn **Google signals** off and turn **ad personalization** / ads features off. Uncheck Google data-sharing boxes (Google products & services, benchmarking, technical support, account specialists).
6. After the tag is live, mark these as key events: `sign_up`, `first_scan`, `begin_checkout`, `purchase`, `unsubscribe` (or the names we actually ship).

### Code (agy / Hermes — never `grok -p`)

1. Load gtag only when a real Measurement ID is present (env `NEXT_PUBLIC_GA_MEASUREMENT_ID`). A `G-XXXXXXXXXX` placeholder guard is fine.
2. Consent-safe defaults: `ad_storage`, `ad_user_data`, and `ad_personalization` denied. Do not enable ads features. Document the analytics-storage choice in PP-122 (house method: disclose GA4 cookies + an opt-out link; no ad cookies).
3. Allow only what the tag needs in CSP (`frontend/next.config.ts`): `script-src` and `connect-src` for `https://www.googletagmanager.com` and `https://www.google-analytics.com`. Stay compatible with PP-067 (tightening `'unsafe-inline'` / `'unsafe-eval'` later).
4. Fire these events once each is really true (no invented or double-counted events):

   | Event | When | Likely hook |
   |-------|------|-------------|
   | `sign_up` | First successful Google sign-in (`isNewUser`) | NextAuth / welcome path (PP-097) |
   | `first_scan` | User’s first successful barcode or receipt add to the pantry | Scan / receipt save success |
   | `begin_checkout` | Upgrade Checkout session is actually created | `createCheckoutSession` in `PricingPage` / `UpgradePrompt` |
   | `purchase` | Paid checkout completed | `CheckoutResult` success, or after `checkout.session.completed` / `invoice.paid` is reflected |
   | `unsubscribe` | User schedules cancel-at-period-end or the sub actually ends | Account cancel / portal return |

5. Deploy only via `./deploy/deploy-docker.sh main` from a **clean** worktree. Do not deploy while PP-116 shopping-list files are dirty. Verify the live HTML or loader contains the real Measurement ID, then curl `https://www.mypantryhub.com/build-id.txt`.

$0 only. Do not buy GA 360 or any paid SEO/analytics tool.

## Acceptance Criteria

- [ ] Tylor has created the GA4 property and web stream (or confirmed one already exists) and turned signals / ads / data-sharing off
- [ ] Measurement ID is live on `www.mypantryhub.com` (and not committed as a secret beyond the public `G-` id)
- [ ] CSP allows only the GA4 / gtag hosts the tag needs
- [ ] The five key events above are implemented and marked as key events in GA4
- [ ] Privacy policy already discloses GA4 (PP-122) in the same release
- [ ] A first “no data yet” view is treated as normal (GA4 can lag hours)

## Shipped

Live on https://www.mypantryhub.com as of 2026-11-22, 5:03 PM America/Chicago (build `db0ef3e`, code `4d58e1f`).

- GA4 property Pantry Hub (565428577), web stream Pantry Hub Web, Measurement ID `G-LEW78LC3EF` is in the client bundle.
- Consent Mode v2: ads storage / user data / personalization denied; analytics granted outside EEA/UK/CH; GPC skips GA; EEA/UK/CH banner via `CF-IPCountry`.
- Key events: `sign_up`, `first_scan`, `begin_checkout`, `purchase`, `unsubscribe`.
- Privacy disclosure shipped in the same release (PP-122).
