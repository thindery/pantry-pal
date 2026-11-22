# Pantry Hub revenue options

Written: Sunday, Nov 22, 2026, 4:48 PM America/Chicago (CST)  
Status: research and tickets only. **No code, no deploy, and no program signups** in this pass.  
Trigger: Tylor asked to brainstorm additional revenue (saved recipes, first-party recipes with affiliate links and ads on recipe pages, ads on the free tier) and to look at what Bragle did.

This is not a forecast and not legal advice. Dollar figures below are either **published program rates** or **clearly labeled illustrative math**. Pantry Hub does not yet have a public traffic baseline in this repo, so there is no honest way to project monthly ad or affiliate income.

Rules that apply until Tylor says otherwise:

- Only $0 services unless a cost is flagged and approved.
- Nothing public, and no account signups, without his yes.
- Ads must not degrade the Pro / Family experience inside the app.
- Affiliate and ad programs change terms without much notice. Recheck the live source before applying.

Related tickets already on the board: PP-115 (nearby grocery weekly ads / deals), PP-108 and PP-110 (first public content and AEO cluster), PP-122 and PP-130 (privacy / analytics disclosure, CCPA / GPC / EU consent).

---

## Current product (relevant to revenue)

- Live app: [https://www.mypantryhub.com](https://www.mypantryhub.com). Inventory, barcode scan, shopping list, receipt photo. **There is no recipe feature in the product today.**
- Paid catalog already exists in Stripe (`backend/services/stripe_service.py`): **Pro $4.99/mo or $39.99/yr**, **Family $7.99/mo or $59.99/yr**.
- Free caps (`backend/services/subscription_service.py`): 50 items, 5 receipt scans/month, no shared inventory. Pro is unlimited items/scans and multi-device; Family adds shared inventory (up to 5 members).
- Near-term revenue already has a path: convert free users to Pro/Family. New streams below either support that (recipes as a Pro hook) or add income that needs **public, original pages** and often a program approval.

---

## What Bragle did

Source: Bragle repo docs on the Mini, especially `docs/launch-plan.md`, `docs/build-log/2026-11-15-d4-ads.md`, `docs/build-log/2026-11-15-pricing.md`, and `docs/payments/stripe-plan.md` (read 2026-11-22).

- **Free + ads, paid plan removes them.** Bragle+ is $3.99/month or $29.99/year for no ads plus perks (crew caps and so on). The earlier $4.99 one-time “Remove ads” offer was dropped.
- **Placement is deliberately calm.** Once AdSense is approved, and still behind a ship-off switch, web ads may show on Results, Today, Crews, and Me. **Never** during play, the reveal, the paywall, or the share card, and **never for Bragle+**.
- **Non-personalized banners, no tracking prompt** at the launch decision (D5/D6). Interstitials were not planned.
- **Web first.** AdMob only serves native apps, so the web launch path is **AdSense**, not AdMob. Signing up for AdSense still needed Tylor’s yes. Pay-per-transaction services with no monthly fee (Stripe, AdSense) were treated as allowed after that yes.
- This is the right pattern to copy for Pantry Hub’s **signed-in app**: ads only on non-critical free-tier surfaces, never on scan / checkout / paywall, and never in the Pro or Family workspace. Tylor also asked that **public recipe pages** be able to show ads **regardless of plan**. That is closer to a media site than to the in-app loop, and it should stay on those public pages only.

---

## Recommended order (top 3)

These are the three to ticket and pursue, in this order. Later options in this doc are useful, but they either depend on these, have a closed door, or are a poor fit right now.

1. **Saved recipes and cook-from-pantry (PP-138, P1).** Build the product hook first: save or paste a recipe, see what is already in the pantry, and send missing ingredients to the shopping list. Cap how many saved recipes Free can keep, and use the gap to upgrade to Pro. No new vendor and no signup. Everything else in this list is weaker without this.
2. **First-party public recipes plus affiliate links (PP-139, P2).** Publish original, public, not-behind-login recipes (needed for Amazon Associates, SEO, and AdSense). Add clearly disclosed affiliate links for ingredients and kitchen tools. Start with **Amazon Associates** (kitchen tools at a published 4.50%, grocery / Amazon Fresh at **1.00%**) and the **Instacart publisher affiliate** program (up to a **$10 CPA** on a new customer’s first qualifying order; terms may vary). Do not apply until Tylor says yes, and not before there is real public content. The better grocery rate — Instacart Developer Platform at a published **5% of cart value** in a 7-day window — is the long-term fit, but **IDP is not accepting new applications** as of this writing.
3. **Ads on the free tier and on public recipe pages (PP-140, P2).** Follow Bragle’s placement rules inside the app so Pro / Family never see ads in the product. Public recipe pages may show ads to every visitor, including paying customers, as Tylor suggested. Start with **Google AdSense** when there is enough original public content (no published traffic minimum; approval and policy still apply). Mediavine / Raptive are later, after published traffic or revenue bars. Coordinate privacy work with PP-122 and PP-130. No AdSense signup until Tylor says yes.

---

## Option-by-option

Effort is qualitative (Low / Medium / High). Revenue is **not a forecast**.

### 1. Saved recipes and cook-from-pantry — recommended #1

| | |
|---|---|
| **Effort** | **High** for a complete feature (data model, import or paste, pantry match, shopping-list add, Free vs Pro caps, tests). A first slice (paste ingredients, match names, add missing items) is **Medium**. |
| **Revenue potential (estimate)** | No new take-rate. Revenue is **Pro / Family conversion** on a feature users already ask grocery apps for. There is no honest dollar range without conversion data we do not have. The catalog prices are known: Pro $4.99/mo or $39.99/yr; Family $7.99/mo or $59.99/yr. |
| **Fit with paying users** | Good. Paying users should get the full workflow (more saved recipes, maybe meal plans later). Free can try a small cap. No ads required. |
| **Requirements** | None from a network. Needs a recipe data model and careful ingredient matching (barcode names will not always equal recipe names). Keep any future public recipes separate from a user’s private saved recipes. |

### 2. First-party public recipes and affiliate links — recommended #2

| | |
|---|---|
| **Effort** | **High** ongoing, not a one-week ticket. Original recipes, photos, and testing notes are the product. Link tagging, FTC disclosures, and a merchant allow-list are Medium once the pages exist. |
| **Revenue potential (estimate, rate-card math only)** | **Amazon Associates (US), published standard rates** ([Associates Program Standard Commission Income Statement](https://affiliate-program.amazon.com/help/node/topic/GRXPHT8U84RAYDXZ), read 2026-11-22): grocery and Amazon Fresh **1.00%** of Qualifying Revenue; Health & Personal Care **1.00%**; Kitchen **4.50%**; Home / Pets **3.00%**; gift cards, alcoholic beverages, and several other categories **0.00%**. Subscribe & Save grocery has a separate published bounty of **$0.25** on a successful first delivery; a first Amazon Fresh purchase bounty is published at **$1.00**. **Illustrative only:** $100 of qualifying kitchen revenue × 4.50% = $4.50; $100 of qualifying grocery revenue × 1.00% = $1.00. That is not a traffic forecast. **Instacart publisher affiliate** (official program page, read 2026-11-22): **up to a $10 CPA** per new customer’s first qualifying order tied to the tracking link; “commissions may vary”; paid via Impact ~55 days after month end once the Impact balance reaches $10. That rate is for **new-customer activations**, not a published share of every repeat cart. |
| **Fit with paying users** | Good if links are optional “Buy ingredients” actions on public recipes and on a shopping-list export, not interstitial junk inside Pro inventory. Paying customers can use the same shopping shortcuts. Disclose clearly. |
| **Requirements** | **Amazon:** apply only with Tylor’s yes. Amazon reviews after **at least three qualifying sales in 180 days**; **personal orders do not count**. Sites must have **robust original content**, publicly available, **not behind a paywall**; Amazon’s review page uses “at least 10 posts” as a rule of thumb, and website content should be recent (generally within 60 days). Logged-in-only recipes will not qualify. **Instacart publisher:** US and/or Canada traffic, family-friendly content, Impact account, approval at Instacart’s discretion; program is **free to join**. **FTC:** material connections must be disclosed clearly and conspicuously (16 CFR 255.5). California / privacy policy updates if we add trackers. No signup in this pass. |

### 3. Free-tier in-app ads and ads on public recipe pages — recommended #3

| | |
|---|---|
| **Effort** | **Medium** for a first AdSense placement on public recipe or marketing pages, plus a Free-only slot on calm in-app surfaces, a Pro/Family suppression flag, and privacy copy. **High** if we add a certified CMP, limited ads, and later a managed network. |
| **Revenue potential (estimate)** | Google does not publish a recipe-site RPM. **There is no official number to cite, and this repo has no traffic baseline, so no monthly estimate is honest.** Managed networks (Mediavine, Raptive) are widely reported to pay more than AdSense at scale, but that is not an official dataset. Income will be ~0 until public pages get regular visits. AdSense itself has **no monthly fee** (pay-per-transaction after approval). |
| **Fit with paying users** | **In-app:** ads for Free only; never on scan, checkout, paywall, or the Pro/Family workspace (Bragle rule). **Public recipe pages:** ads may show regardless of plan, as Tylor asked, so the page should still be readable (few units, no interstitials that block the recipe). Do not log a paying customer into an ad-heavy “free” shell. |
| **Requirements** | **AdSense eligibility** ([Google AdSense Help](https://support.google.com/adsense/answer/9724?hl=en), read 2026-11-22): original content that attracts an audience, HTML access, policy compliance, applicant 18+. **No published visitor, pageview, or domain-age minimum.** The site must be live with enough content to review; code should sit on a page that gets regular traffic. Privacy policy must disclose Google ad data collection. **EEA, UK, and Switzerland:** a **Google-certified CMP** integrated with the IAB TCF is required when serving **personalized** ads ([AdSense consent requirements](https://support.google.com/adsense/answer/13554116?hl=en)). Non-personalized ads (Bragle’s launch choice) lower that pressure but do not remove the need for a policy and, if we later personalize, a CMP. Starting June 2026 Google may require identity verification (government photo ID) before ads and payments. **CCPA:** see the privacy section below. No signup until Tylor says yes. |

### 4. Instacart Developer Platform (shoppable recipes / lists)

| | |
|---|---|
| **Effort** | **High** (API integration, approval, Impact attribution). Blocked at the door today. |
| **Revenue potential (estimate, published rate only)** | Official Instacart affiliate FAQ for the developer program (read 2026-11-22): **5% of the total cart** for orders completed from the app or site **within a 7-day window**, including items added beyond the original recipe or list. Excludes alcohol, restaurants, prescriptions, and gift cards. Commissions may vary. Applies to new and existing Instacart customers. **Illustrative only:** a $80 qualifying cart × 5% = $4.00. This is the best published grocery take-rate in this research. |
| **Fit with paying users** | Excellent: “Order this list” from a recipe or shopping list is a help, not an ad. Fine for every plan. |
| **Requirements** | Partners must be 18+ and a US or Canada business or resident. **“We are currently not accepting new applications. There is no waitlist.”** ([Instacart Developer Platform](https://company.instacart.com/business/developers), read 2026-11-22). Recheck later. Do not build against a closed program. If it reopens, this jumps up the list. |

### 5. Walmart and Target affiliate programs

| | |
|---|---|
| **Effort** | **Medium** once public recipe or shopping-list links exist (Impact / Partners signup is the work; Tylor’s yes required). |
| **Revenue potential (estimate)** | **Walmart** official terms ([affiliates.walmart.com/terms](https://affiliates.walmart.com/terms), last updated June 2026, read 2026-11-22) pay commission only on Qualifying Products, after cookie-window rules, and say rates are “according to fee schedules to be established by us,” with the live list on Impact. **Public terms do not publish a grocery percentage.** Third-party writeups in 2026 have described grocery around 1% or $0 on some Plus SKUs; that is **not official** and must not be used as a forecast. Some categories (Sam’s Club, pharmacy, gift cards, tires, and others) are excluded in the public terms. **Target Partners** official terms say category rates and exclusions live in the Insertion Order / contract, not in a public table. Do not assume grocery pays. |
| **Fit with paying users** | Same as other affiliate links: optional retailer buttons, disclosed, not in the way of Pro inventory. |
| **Requirements** | Walmart: 18+, not a current Walmart employee, public site, approval is discretionary; do not link until approved. Target: apply at partners.target.com, same “no signup without yes.” Confirm grocery eligibility in the live contract before writing any “shop this recipe at Target / Walmart” copy. |

### 6. Other grocery API or retailer partnerships

| | |
|---|---|
| **Effort** | **High**, and usually not $0. |
| **Revenue potential (estimate)** | Unknown. These are business-development deals (revenue share, referral fees, or paid API access). No public, generally available rate card was found that Pantry Hub could join today besides Instacart IDP (closed) and ordinary affiliate programs above. |
| **Fit with paying users** | Potentially high if it powers “order my list” or weekly-ad matching (see PP-115). |
| **Requirements** | Kroger, Target, and similar catalog APIs, plus recipe platforms such as Spoonacular, Edamam, or SideChef shoppable recipes, are typically **application-only and often paid** after a free trial. Flag any paid API. Prefer $0 sources for PP-115 research first. No signup in this pass. |

### 7. Journey / Mediavine / Raptive (and recipe-site ad networks)

| | |
|---|---|
| **Effort** | Low to apply once eligible; **High** to reach eligibility (traffic + a real recipe library). |
| **Revenue potential (estimate)** | These networks exist because they usually pay more than AdSense at scale. **They do not publish a guaranteed RPM.** Do not invent one. Treat this as a later upgrade from AdSense, not a year-one plan. |
| **Fit with paying users** | Same rule as option 3: public recipe pages only, plus Free in-app if we ever go that far. Premium recipe networks sometimes add “shoppable ingredient” units (for example Mediavine’s recipe / Chicory units). Review those before they appear for paying customers. |
| **Requirements** (official pages, read or checked 2026-11-22) | **Journey by Mediavine:** minimum **5,000 sessions a month** from the U.S., U.K., Canada, Australia, Germany, France, or the Netherlands, and a domain **at least 4 months old**. **Mediavine Official:** **$5,000+ in annual ad revenue**. Also: original audience-first content, clean traffic, good standing with AdSense / Ad Exchange ([Mediavine help](https://help.mediavine.com/what-does-it-take-to-get-approved-by-mediavine)). Some older blogs still quote 1,000 Journey sessions or a 50,000-session Mediavine bar; those figures are **out of date** relative to Mediavine’s own page. **Raptive:** official help article [Who is eligible for Raptive](https://help.raptive.com/hc/en-us/articles/360032840891-Who-is-eligible-for-Raptive) (updated 2026-09-26 in the public help center). A direct fetch of that URL on 2026-11-22 returned a challenge page, so treat this as the published help text rather than a live re-read: **25,000 pageviews a month**; for 25,000–99,999 pageviews, **50%** of traffic from the US, UK, Canada, New Zealand, and/or Australia, long-form content on the majority of pages, original work with meaningful human involvement, a site build that can host ads, Google Analytics, and a domain **at least 6 months old**; at 100,000+ pageviews the country share drops to **40%**. mypantryhub.com is too new and too thin for these bars today. |

### 8. Recipe SEO traffic (the engine, not a stream)

| | |
|---|---|
| **Effort** | **High** and ongoing. Competitive query space. Needs original recipes, usable photos, and honest content — not spun pages. |
| **Revenue potential (estimate)** | SEO does not pay by itself. It feeds ads and affiliates on **public** pages. There is no traffic number to cite for Pantry Hub. |
| **Fit with paying users** | Public recipes can convert readers into signups (cook from pantry, save the recipe) without getting in a Pro user’s way. |
| **Requirements** | Pages must be indexable (not behind login). Follow [Google Search Central Recipe structured data](https://developers.google.com/search/docs/appearance/structured-data/recipe) if we claim rich results (`name`, `image`, ingredients, instructions, and the rest of Google’s required / recommended fields). Keep JSON-LD honest (PP-106). Quality and photos matter more than word count tricks. Coordinate with PP-108 and PP-110 rather than inventing a second content program. |

### 9. Other Pro feature upsells (no new vendor)

| | |
|---|---|
| **Effort** | Varies. Expiration tracking, household sharing upgrades, and meal planning on top of PP-138 are each Medium to High. Raising the visibility of the **existing** Free caps (50 items, 5 receipt scans) is **Low**. |
| **Revenue potential (estimate)** | Same catalog as today. This is usually the **fastest** incremental dollar because Stripe already works, and it does not depend on SEO. No honest conversion-rate forecast. |
| **Fit with paying users** | Directly improves Pro / Family. Do not hide core inventory quality behind a paywall in a way that makes Free feel broken. |
| **Requirements** | Honesty in marketing (PP-101 / PP-102): do not advertise features we do not ship. Expiration tracking is a real product gap, not a current claim. |

### 10. Lifetime deal (AppSumo or similar)

| | |
|---|---|
| **Effort** | **High** (application, support load, entitlement design). |
| **Revenue potential (estimate)** | AppSumo’s partner page (read 2026-11-22) says partners keep **95%** of sales they bring and **70%** of sales AppSumo brings, paid **60 days** after each sales month, with **no upfront fee**, and about a **10%** acceptance rate. It also shows campaign ranges for the **top 50% of partners** in a category ($40K–$80K “standard,” higher for top performers). **That is not a forecast for Pantry Hub** and describes a selected, already-accepted population. |
| **Fit with paying users** | **Weak, and easy to regret.** A lifetime Pro price undercuts $4.99/mo and $39.99/yr, and a wave of deal-site users can swamp support. AppSumo also says **consumer-only products are “not the right fit”** (their buyers are entrepreneurs and small businesses). A household pantry app is consumer-first. |
| **Requirements** | Working product, support plan, Tylor’s yes, and a deal structure that does not strand the subscription business. **Not recommended now.** |

### 11. Other ideas (brief)

- **Referral credits** for Pro (give a month, get a month): Medium effort, no new vendor, good fit. Needs abuse controls. No published analog to copy; design carefully.
- **Sponsored product placements or CPG deals:** possible later on high-traffic recipe pages. High brand and disclosure risk. No program to join today.
- **PP-115 nearby weekly ads:** utility first (help the shopper), with affiliate links only if a $0 source and a program we have joined. Complements recipes; it is not a substitute for PP-138.
- **AdMob:** only if a native app ships. Bragle correctly treated this as later. Do not plan AdMob on the Next.js web app.

---

## Privacy, CCPA, and disclosures (for ads and affiliates)

This is good practice now, and in some cases it is required. It is **not legal advice.** PP-122 and PP-130 already cover analytics and consent work.

**CCPA applicability.** A for-profit entity that does business in California and collects personal information is a “business” under Civil Code § 1798.140(d) if it meets **one** of: (A) annual gross revenue over the inflation-adjusted threshold, (B) annually buys, sells, or shares the personal information of **100,000 or more** consumers or households, or (C) derives **50% or more** of annual revenue from selling or sharing consumers’ personal information ([California Civil Code § 1798.140](https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=CIV&sectionNum=1798.140)). The revenue threshold in (A), as adjusted effective **January 1, 2025**, is **$26,625,000** ([CPPA monetary thresholds](https://www.cppa.ca.gov/regulations/cpi_adjustment.html); [privacy.ca.gov](https://privacy.ca.gov/laws-and-regulations/monetary-thresholds-in-the-ccpa/)). Pantry Hub is unlikely to meet (A) in the near term. Personalized advertising can be “sharing” (cross-context behavioral advertising). If we ever personalize ads at scale, (B) or (C) is the threshold to watch — not only revenue.

**Even before those thresholds,** California guidance and product practice still matter: a privacy policy, a way to honor opt-outs, and the **Global Privacy Control (GPC)** as an opt-out signal for sale or sharing ([California AG CCPA page](https://oag.ca.gov/privacy/ccpa)). If we sell or share personal information, a “Do Not Sell or Share My Personal Information” / “Your Privacy Choices” link is the expected pattern. **Non-personalized ads** (Bragle’s choice) and not selling data reduce CCPA “sale/share” exposure; they are not a reason to skip the policy or GPC.

**Europe / UK / Switzerland.** Personalized Google publisher ads require a Google-certified CMP and IAB TCF, as cited above. If we only use non-personalized ads, document that choice and still do not ignore those regions.

**Affiliates.** Disclose the material connection clearly and conspicuously, near the links, in plain language (16 CFR 255.5; [FTC Endorsement Guides](https://www.ecfr.gov/current/title-16/chapter-I/subchapter-B/part-255/section-255.5)). Amazon also requires its own associate disclosure. Do not present affiliate buttons as a neutral “search” result.

**Ads.txt, kids, and health.** If AdSense goes live, follow Google Publisher Policies (ads.txt is recommended). Pantry Hub is not a children’s product; do not target minors with ads. Be careful with health claims on any “from your pantry” diet content.

---

## What not to do yet

- Do not sign up for Amazon Associates, Instacart, Walmart, Target, AdSense, Mediavine, Raptive, or AppSumo until Tylor says yes.
- Do not put ads inside the Pro or Family app workspace.
- Do not apply to Amazon or AdSense with only logged-in, thin utility pages.
- Do not pay for recipe APIs or “submit our recipes to a network” services without a flagged, approved cost.
- Do not invent testimonial-style earnings or RPM figures in marketing (PP-101).

---

## Sources (read 2026-11-22 unless dated otherwise)

- Amazon Associates application review: https://affiliate-program.amazon.com/help/node/topic/G8TW5AE9XL2VX9VM
- Amazon Associates 180-day / three-sale review: https://affiliate-program.amazon.com/help/node/topic/G7MJTPEP9NC3YKMG
- Amazon Associates Standard Commission Income Statement: https://affiliate-program.amazon.com/help/node/topic/GRXPHT8U84RAYDXZ
- Instacart affiliate programs (publisher CPA, influencer, developer FAQ including the 5% / 7-day IDP rate): https://company.instacart.ca/affiliate
- Instacart Developer Platform (applications closed): https://company.instacart.com/business/developers
- Instacart IDP conversion tracking / Impact: https://docs.instacart.com/developer_platform_api/guide/concepts/launch_activities/conversions_and_payments
- Walmart Affiliates terms (updated June 2026): https://affiliates.walmart.com/terms
- Target Partners terms: https://partners.target.com/termsandconditions
- Google AdSense eligibility: https://support.google.com/adsense/answer/9724?hl=en
- Google AdSense account setup / identity verification: https://support.google.com/adsense/answer/7402256?hl=en
- Google consent management requirements (EEA, UK, Switzerland): https://support.google.com/adsense/answer/13554116?hl=en
- Mediavine approval requirements: https://help.mediavine.com/what-does-it-take-to-get-approved-by-mediavine
- Raptive eligibility (official help URL; see caveat in option 7): https://help.raptive.com/hc/en-us/articles/360032840891-Who-is-eligible-for-Raptive
- Google Search Central — Recipe structured data: https://developers.google.com/search/docs/appearance/structured-data/recipe
- FTC 16 CFR 255.5 (disclosure of material connections): https://www.ecfr.gov/current/title-16/chapter-I/subchapter-B/part-255/section-255.5
- California Civil Code § 1798.140 (definition of “business”): https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=CIV&sectionNum=1798.140
- CPPA updated monetary thresholds (effective 1/1/2025): https://www.cppa.ca.gov/regulations/cpi_adjustment.html
- California AG CCPA overview (GPC / opt-out): https://oag.ca.gov/privacy/ccpa
- AppSumo partner / sell page: https://sell.appsumo.com/
- Bragle Mini docs as named in the Bragle section above
