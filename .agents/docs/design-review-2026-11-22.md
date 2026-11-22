# Pantry Hub design review (screen audit)

Author: Design review (Grok Bot executor) · Written Sun Nov 22, 2026, ~4:55 PM America/Chicago · Status: **findings + tickets**. Token changes below are **proposals**; a small P0/P1 set is implemented in the same pass (listed in §9).

Format follows Bragle’s Phase 1 critique (`bragle/docs/design/design-critique.md`): what’s strong, where tokens live, contrast/touch/layout gaps, prioritized P0/P1/P2 recommendations, and a brand-guide proposal.

Inputs: production at `https://www.mypantryhub.com` (marketing, legal, sign-in, checkout, `/design-system`), current `main` plus in-flight work on the Mini (`/Users/thindery/projects/pantry-pal`), `frontend/lib/design-tokens.ts`, `frontend/app/globals.css`, dashboard views (inventory, shopping list, account, add-item, scan), PP-042 handoff, PP-085/PP-116 compact lists, and the open SEO tickets PP-103 and PP-108. Logged-in screens were captured from a **local fixture preview** that renders the real list/form components with generic sample items (Whole milk, Eggs, Rice, …). No production account was used and no real customer data was opened. Tylor’s earlier shopping-list photo was not re-opened here (private attachment).

Companion screenshots: [`.agents/design-review/2026-11-22/`](../design-review/2026-11-22/).

---

## 1. What's strong

1. **The logged-in lists now look like a product.** PP-085 and PP-116 did the important work. Inventory and shopping rows are compact (~52px), names wrap to two lines, thumbnails sit on the left, and secondary data is a single muted subline (`2 half gallons · Dairy`, `Have 1 · need 2`). The shopping overflow (`⋯`) correctly hides Mark bought / Remove. This is a large step up from the bulky rows Tylor flagged.
2. **A real, warm identity exists.** Cream marketing background (`#fefdf9` / `#f5f0e6`), serif headings (Lora), Inter for UI, a chef-hat mark, and a kitchen green are distinctive. The footer on navy is confident. “Built by a home cook for real pantries” is the right voice when it stays honest.
3. **Three-tab IA is right.** Pantry / Shopping / Account matches the PP-042 recommendation. Ledger and receipt scan are demoted to Account. Scan and Add are the two clear jobs on Pantry.
4. **Status is not color-only on the list.** Low stock uses an amber left border plus a quantity; out of stock uses a rose border, muted name, and `0 bottles`. Good for color-blind use.
5. **Empty states exist and are calm.** “Your pantry is empty” with a primary CTA, and “You’re all stocked” on the shopping list, are clear and not jokey.
6. **Honest proof on the hero (PP-101).** The four proof cards avoid invented ratings and user counts. Open Food Facts and “no credit card required” are the right kind of claim.
7. **Legal pages have a clear hierarchy** and a good privacy promise (“Your pantry data stays yours”). The mark and nav carry across marketing and legal.
8. **Lucide icons in the app chrome** (tabs, scan, settings) are consistent. The remaining emoji (category thumbs when there is no product image; checkout; scan fallbacks) are the exception, not the rule.

---

## 2. Where tokens and theme live today, and what's missing

### 2.1 Current locations

| What | File | Notes |
|---|---|---|
| Palette, type sizes, spacing, radii, shadows, default thresholds | `frontend/lib/design-tokens.ts` | Comment says PP-042 single source |
| CSS variables (`--primary`, `--background`, marketing tokens, Tailwind v4 `@theme`) | `frontend/app/globals.css` | Must stay in sync with `design-tokens.ts` |
| Public reference | `/design-system` (noindex) | Still shows **proposed** bulky rows; stale vs PP-085/116 |
| Clerk/Auth appearance | `frontend/lib/clerk-appearance.ts` | Auth is Google / NextAuth now |

### 2.2 Gaps against a build-ready brand guide

- No **text-on-primary** vs **decorative green** split. `#7cb342` is used for large fills *and* for text (hero “Home”, chips, “View full pricing”). It fails WCAG 2.1 AA in both roles (see §3.2).
- No focus-ring token, no documented 44px minimum target, no type scale above `3xl` (marketing H1 uses ad-hoc `text-4xl md:text-6xl`).
- Accent (`#f59e0b`) and danger (`#f43f5e`) are also used as solid button fills with white labels (Account Upgrade).
- Marketing and app already disagree: marketing cream vs app slate-50; checkout uses `emerald-600` and a navy cancel screen; scan/forms still use raw `emerald-600` / `slate-*` in places.
- `/design-system` is still the July handoff, not the shipped compact UI. PP-072 also wants this route gated in production.

---

## 3. Gaps and risks

### 3.1 Typography and voice

- Homepage H1 is still “Smart Inventory & **Ledger** for Your Home.” “Ledger” is internal jargon (already in **PP-108**). The word “Home” is the only part in green, and that green fails contrast.
- Legal titles color the second word (“Privacy **Policy**”) in the same failing green.
- Landing How-it-works intro (“pantry management bliss”) is a little cute next to otherwise plain voice.
- Nav label casing is inconsistent: landing “Log In / Get Started” vs legal “Sign in / Get started”.
- Account still says “Activity ledger.” Fine inside the app; keep it off the marketing H1.

### 3.2 Color and contrast (WCAG 2.1 AA, recomputed)

Pairs checked against the live tokens:

| Pair | Ratio | AA text (4.5) | AA large (3.0) |
|---|---:|---|---|
| White on `#7cb342` (every primary button) | 2.50 | **FAIL** | **FAIL** |
| `#7cb342` on `#fefdf9` (hero “Home”, “View full pricing”) | 2.46 | **FAIL** | **FAIL** |
| `#7cb342` on `#e8f5e9` (selected chip, “+ Add item”) | 2.23 | **FAIL** | **FAIL** |
| White on `#f59e0b` (Account Upgrade) | 2.15 | **FAIL** | **FAIL** |
| White on `#f43f5e` (danger fills) | 3.67 | **FAIL** | PASS |
| White on `#059669` (checkout success body / button) | 3.77 | **FAIL** | PASS |
| Muted `#64748b` on white | 4.76 | PASS | PASS |
| Placeholder `#94a3b8` on white | 2.56 | **FAIL** | **FAIL** |
| How-it-works numerals (light green on cream) | ~2.2 | **FAIL** (decorative but large) | **FAIL** |

This is the most serious visual issue. The brand green is lovely as a wash or icon color and unusable as a typographic or button-label color.

**Proposal (see §8):** keep `#7cb342` as `--primary-bright` (logo field, icon accents, chart washes). Use `#2e7d32` as `--primary` for text and solid buttons (white-on-green 5.13, green-on-`#e8f5e9` 4.56, green-on-cream 5.04). Hover `#1b5e20`. Accent fills: `#b45309` (5.02 with white). Danger fills: `#e11d48` (4.70 with white).

### 3.3 Touch targets

- Settings gear on Pantry / Shopping is `p-1.5` + 18px icon (~30–42px). Below the 44×44 recommendation.
- Bottom tabs are fine (icon 20 + padding, full-width columns).
- List steppers are ~32px (a known compact-list tradeoff). Acceptable if the row itself is easy to scan; do not shrink further.
- “Close” on `/pricing` is a 40px hit area — close enough, but the control is an in-app modal close, which is the wrong chrome for a public pricing URL (see §4).

### 3.4 Layout and web

- Sticky marketing header **covers section titles** when jumping to `#how-it-works` and `#faq` (“HOW IT WORKS” / “Frequently Asked” are clipped). Add `scroll-margin-top` (~6rem) on section anchors.
- `/pricing/` is a **full-screen modal** (`fixed inset-0`, X close, title “Upgrade Your Pantry Experience”), not a marketing pricing page. Fine as an in-app upsell; wrong as the public `/pricing/` destination.
- On desktop, Pantry “Scan item” / “Add manually” are a 2-column grid across `max-w-5xl`, so they become huge banners. Keep them compact (auto-width or a max width) from `md` up.
- Desktop inventory also repeats “Pantry Hub” in the top nav and again as the page title.
- The landing is long (~8,900 CSS px on a 390px phone). That is mostly content, not a bug, but without product screenshots (PP-108) it feels like a brochure rather than a demo.

### 3.5 Conversion and trust

- **P0:** For logged-out visitors (and anyone whose `useSubscription()` has not resolved `tier === 'free'`), the Free card CTA on `/pricing/` is **“Downgrade.”** `getCtaText` returns “Current Plan” only when `isFree`, and `isFree` is `tierInfo?.tier === 'free'`. Logged-out `tierInfo` is `null`, so Free becomes “Downgrade.” That is broken and untrustworthy.
- Logged-out “Upgrade to Pro / Family” calls `handleUpgrade`, which only sets an error (“Please sign in to upgrade”) instead of sending the visitor to Google sign-in with a callback.
- Family’s CTA is a pale slate button next to Pro’s solid green, so it looks disabled.
- On the homepage pricing preview, “Get Started Free” is a cream pill that also looks disabled; Pro is the only strong button.
- `/pricing/` lists **“Family meal planning”** on Family. That feature is not in the app (copy only appears on the pricing page). Household sharing, advanced analytics, and push notifications are also claimed more strongly than the shipped surface supports. PP-108 already covers “Smart Analytics / identify waste” and unshipped claims; meal planning should be removed or clearly not promised until it exists.

### 3.6 Sign-in, checkout, onboarding

- Sign-in is clean but generic: no mark, no way back to the marketing site except the browser, no “Free, no credit card,” no Privacy / Terms under the Google button. The card sits in a large empty gradient that does not match the cream marketing page.
- Checkout success is a party-emoji field of `emerald-600` (different green, body text 3.77:1). Checkout cancel is a sad-emoji navy screen. Neither uses the brand mark, Lora, or the token palette. Auto-redirect in 5 seconds is abrupt.
- Empty pantry is fine for a second visit, but there is no first-run guide (“scan one thing you just bought”). Not P0.

---

## 4. Per-screen notes

| Screen | Source | Verdict | Notes |
|---|---|---|---|
| L1 Home | Production, 390 + 1440 | Revise | Strong mark and honest proof; H1 “Ledger” (PP-108); green “Home” fails contrast; no product shots (PP-108); sticky nav clips anchors; Free CTA looks disabled |
| Pricing (home slice) | Production | Revise | Layout is good; cream CTAs look disabled; “View full pricing details” fails contrast |
| `/pricing/` | Production | **Must-fix** | Modal chrome; “Upgrade your pantry”; Free CTA = “Downgrade” when logged out; Upgrade does not go to sign-in; Family meal planning claim |
| Privacy / Terms | Production | Small fixes | “Policy” / “Service” in failing green; privacy “Last updated: July 10, 2026” will need a bump when PP-122 / CCPA copy ships |
| Sign-in | Production | Revise | Add mark, legal links, back link, free-plan reassurance |
| Checkout success / cancel | Production | Revise | Off-brand emoji full-bleeds; contrast; use brand green / mark |
| Design system | Production | Stale | Update to compact rows or gate (PP-072) |
| Pantry (inventory) | Local fixture, real components | Strong | Compact rows work. Fix button contrast, chip contrast, desktop CTA width, 44px gear |
| Pantry empty | Local fixture | Good | Could add a short “try a scan” hint later |
| Shopping list | Local fixture | Strong | PP-116 landed well. “+ Add item” contrast; gear target |
| Shopping empty | Local fixture | Good | |
| Account (Free) | Local fixture | Revise | Upgrade is white on `#f59e0b` (2.15). Otherwise clear |
| Add item | Local fixture | Good | Card is clear; back link is light (`text-slate-400`) |
| Scan | Local fixture chrome + production source | Mixed | Compact header is good (PP-116). Fallback tiles still use emoji; some `emerald-600` buttons; tab bar remains during scan (intentional in layout) |

---

## 5. Prioritized recommendations

**P0: broken or blocking now**
1. Fix `/pricing/` CTAs for logged-out and still-loading subscription state: Free = “Get started free” (or “Current plan” only when the user is actually on Free). Pro / Family start sign-in with a return to checkout when the visitor is logged out. Never show “Downgrade” to a visitor who is not on a paid plan.

**P1: next up, high impact**
2. Split the green: `--primary` / `--primary-hover` pass AA with white and with `--primary-light`; keep `#7cb342` as `--primary-bright` for the mark and decorative use. Darken accent and danger fills the same way. Apply to marketing buttons, app Scan / Add / empty CTAs, chips, and Account Upgrade.
3. Marketing UX: `scroll-margin-top` on `#features`, `#how-it-works`, `#pricing`, `#faq`; darken How-it-works numerals; make the homepage Free and Family CTAs look enabled; fix “View full pricing details” contrast. Leave the H1 rewrite and product screenshots to **PP-108**. Leave doubled titles / canonicals to **PP-103**.
4. Give `/pricing/` a logged-out marketing layout (or reuse the homepage pricing section): no X-modal, no “Downgrade,” no “Upgrade your pantry experience” as the public H1. In-app upsell can keep a closer. Remove or qualify “Family meal planning” and other unshipped bullets (coordinate with PP-108).
5. Sign-in and checkout: brand mark, back-to-home, Privacy/Terms, “Free to start — no credit card,” and checkout screens that use the same tokens (no emoji full-bleed, AA text).

**P2: soon**
6. Desktop Pantry: compact Scan/Add button group; don’t repeat the wordmark as the page H1 (use “Pantry”). 44px settings target. Slightly darker “Back to Inventory” link.
7. Refresh `/design-system` to the shipped compact rows and the §8 brand guide (or gate it per PP-072).
8. Replace remaining emoji in scan fallbacks and checkout with Lucide. Optional first-run scan tip on the empty pantry.

**P3: someday**
9. Unify nav casing. Appearance / dark mode is not needed now (the app is light-only and consistent enough).
10. A short first-run onboarding after the first Google sign-in (one scan, one list).

---

## 6. Brand guide proposal

Use this as the default unless Tylor prefers to keep the brighter green on buttons (in that case the *text* must be ink, not white).

### Palette

| Token | Hex | Role |
|---|---|---|
| `--foreground` | `#0f172a` | Body and headings |
| `--background` | `#f8fafc` | App canvas |
| `--marketing-bg` | `#fefdf9` | Marketing canvas |
| `--marketing-surface` | `#f5f0e6` | Marketing cards / pills |
| `--surface` | `#ffffff` | Cards |
| `--primary` | `#2e7d32` | Text and solid buttons (AA with white) |
| `--primary-hover` | `#1b5e20` | Button hover |
| `--primary-bright` | `#7cb342` | Logo field, decorative icons, washes only |
| `--primary-light` | `#e8f5e9` | Selected chip / wash |
| `--accent` | `#b45309` | Upgrade / attention fills (AA with white) |
| `--accent-bright` | `#f59e0b` | Decorative only |
| `--danger` | `#e11d48` | Destructive fills (AA with white) |
| `--muted` | `#64748b` | Secondary text (keep; 4.76 on white) |
| `--border` | `#e2e8f0` | Dividers |
| Footer navy | `#0f172a` | Keep |

Never use white type on `--primary-bright` or `--accent-bright`. Never use `--primary-bright` as body or link text on cream.

### Type

- **UI / body:** Inter (`--font-sans`).
- **Marketing and app screen titles:** Lora (`--font-serif` / `font-serif-heading`).
- Scale: `xs` 12 / `sm` 14 / `base` 16 / `lg` 18 / `xl` 20 / `2xl` 24 / `3xl` 30 / add `4xl` 36 and `5xl` 48 for marketing H1 only.
- Voice: sentence case in UI (“Sign in”, “Get started”). One exclamation mark per screen, maximum. No “ledger” on marketing headlines. No invented social proof (PP-101).

### Radii, space, icons

- Keep `md` 8, `lg` 12, `xl` 16, `2xl` 20, pills `full`.
- Cards: `rounded-2xl`, light `shadow-sm`, 1px `--border`.
- List rows: 52–60px tall, 40px thumb, 32px steppers (already shipped).
- Minimum tap target 44px for standalone icon buttons (settings, close, back).
- Icons: **Lucide**, 1.75 / 2.25 weight for inactive / active tabs. Category thumbs may use a product image; otherwise a simple Lucide or a monochrome category glyph — not a new emoji set.
- Focus: 2px `--primary` ring, 2px offset, on every control.

---

## 7. Tickets

Filed in this pass. Do not duplicate PP-103 (titles/canonicals) or PP-108 (H1, screenshots, unshipped feature copy including “identify waste”).

| Ticket | Priority | Title |
|---|---|---|
| PP-141 | P0 | Fix logged-out `/pricing/` CTAs and the sign-in upgrade path |
| PP-142 | P1 | Accessible color tokens (primary / accent / danger split) |
| PP-143 | P1 | Marketing UX: sticky-nav overlap, CTA weight, numeral contrast |
| PP-144 | P1 | Sign-in and checkout brand + contrast |
| PP-145 | P2 | Desktop Pantry layout and 44px icon targets |
| PP-146 | P2 | Refresh `/design-system` to the shipped UI and this brand guide |

---

## 8. Screenshot inventory

All files under `.agents/design-review/2026-11-22/`.

**Production (www.mypantryhub.com), 390 and 1440:** `home`, `pricing`, `privacy`, `terms`, `signin`, `design-system`, `checkout-success`, `checkout-cancel` (`--fold` / `--full`). Landing mid-page: `home-features`, `home-how`, `home-pricing`, `home-faq`, `home-footer` (`--section`). `home--*-full-static.png` is a full-page capture with reveal animations disabled (the first `home--mobile--full.png` overstated blank space because of those animations).

**Local fixture (generic items, not customer data), 390 and 1440:** `app-inventory`, `app-inventory-empty`, `app-shopping`, `app-shopping-empty`, `app-account`, `app-add-item`, `app-scan` (`--fixture.png`). Scan camera pane is a placeholder.

---

## 9. Implementation in this pass

Quick visual / conversion fixes only. No deploy (another worker is deploying).

- PP-141: logged-out Free CTA is no longer “Downgrade”; logged-out paid CTAs send the visitor to sign-in.
- PP-142: token split in `design-tokens.ts` and `globals.css` (darker primary/accent/danger for fills and text; bright green retained for decoration).
- PP-143: scroll-margin on landing anchors; stronger homepage Free CTA; readable “View full pricing” and How-it-works numerals.
- PP-144 (partial): sign-in shows the brand mark, a home link, and Privacy / Terms. Checkout screens were left alone in this commit because `CheckoutResult.tsx` already has in-flight analytics edits from another worker.

What still needs the **next deploy** after this commit lands on `main`: the token, landing, sign-in, and pricing CTA changes above, plus any already-committed but undeployed work from other tickets (email templates, etc.).
