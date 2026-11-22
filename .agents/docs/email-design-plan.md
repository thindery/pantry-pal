# Pantry Hub email design plan

**Created:** 2026-11-22, 4:45 PM America/Chicago  
**Why:** Tylor received the first live `payment_confirmation` test (“Your Pantry Hub Pro plan is active”), was glad it arrived, and called the design boring. He also asked that “Questions? Contact …” use `hello@mypantryhub.com`, not `info@`.  
**Follow-up tickets:** PP-131–PP-137  
**Contact fix:** `CONTACT_EMAIL` in `backend/services/email_service.py` is now `hello@mypantryhub.com`. That change is on `main` after this commit but **needs the next production deploy** to show up in real mail (this pass does not deploy).

Do not invent social proof (no fake counts, ratings, or testimonials). Feature lists must match the live pricing page. Test renders go to `thindery@gmail.com` only.

---

## Inventory (what the app sends today)

All app mail goes through `backend/services/email_service.py` → Resend. From address is `RESEND_FROM_EMAIL` (production: `Pantry Hub <hello@mypantryhub.com>`). Layout is a single `_wrap()`: system-ui, `#0f172a` text, an `<h1>` of the subject, the body, and a gray “Questions? Contact {CONTACT_EMAIL}.” line. No logo, no button styles, no preheader, no footer links. Plain-text is a stripped copy of the same words. There is no unsubscribe (all current mail is transactional).

| Template | Trigger | Idempotency | Current content |
|----------|---------|-------------|-----------------|
| `welcome` | `POST /api/emails/welcome` from the dashboard after login (`requestWelcomeEmail`). Existing accounts were backfilled in migration 019 so they are not welcomed retroactively. | `welcome:{user_id}` | “Welcome to Pantry Hub.” Hi {name}. Thanks for joining. Sign in at mypantryhub.com. |
| `payment_confirmation` | `invoice.paid` in `stripe_service`, only when entitlement is applied or the invoice belongs to the linked sub. $0 / promo invoices use the “plan is active” wording. | `invoice.paid:{invoice_id}` | Subject “Your Pantry Hub {Plan} plan is active” or “Payment received…”. One sentence that the plan is active / payment received (optional period end). Link: manage billing on the account page. |
| `payment_failed` | `invoice.payment_failed` after the user is set `past_due`. | `invoice.failed:{invoice_id}` | “Action needed: Pantry Hub payment failed.” Amount + “update your card” + account-page link. |
| `cancellation_scheduled` | Cancel API, and `customer.subscription.updated` when `cancel_at_period_end` flips to true on the linked sub. | `cancel.scheduled:{subscription_id}` | Cancellation is scheduled; access continues until {period end}; resume from the account page. |
| `subscription_ended` | `customer.subscription.deleted` only when the linked sub ends and the account is downgraded (duplicate extras do not send). | `cancel.ended:{subscription_id}` | Paid plan ended; account is on Free; resubscribe from `/pricing/`. |

Not sent by the app: magic-link / password mail (Google signs people in), Stripe’s own receipts if the customer has an email, marketing newsletters, trial-ending reminders, or any pantry digest.

There is **no Stripe trial product** today. The $0 first invoice (promo code, PP-077) leaves the subscription `active`, not `trialing`. There is **no expiry-date column** on `pantry_items`. The app does have in-product low-stock thresholds.

---

## What to borrow from Bragle

Bragle does not use Resend or React Email. Auth mail is custom HTML in `supabase/templates/` (confirmation, recovery, email change), sent over Brevo SMTP. Those templates are the useful reference:

- Table-based, 480px card, brand wash behind the card (`#FFF7EC` for Bragle).
- Text wordmark in the header, not a remote image that might fail.
- One short headline, one short supporting line, **one** solid CTA button, then a pasted fallback URL.
- `color-scheme: light` so clients don’t invert the palette into mud.
- Warm, specific copy (“Make it official”, “Confirm your email to save your streak on every device”) — not “Your account is now active.”
- No testimonials, ratings, or “join N users.”

Pantry Hub should follow that structure, with Pantry Hub colors and a kitchen-practical tone, not Bragle’s orange/navy comic energy.

---

## Shared branded layout (PP-131)

Build one wrapper used by every template (replace `_wrap()`). Keep sending in Python; do not add a Node render step for v1.

**Shell**

- `<meta name="viewport">`, `<meta name="color-scheme" content="light dark">`.
- Hidden preheader (first ~80 characters of the specific email).
- Outer table background `#fefdf9` (`--marketing-bg`).
- Inner card, max-width 520px, surface `#ffffff`, light `#f5f0e6` border or soft shadow via cell padding only (no CSS box-shadow reliance).
- Header: “Pantry Hub” wordmark in Georgia / `ui-serif` (Lora does not load in most inboxes). If `/logo.png` is on the live origin and actually serves (PP-104 still tracks missing public assets), it may sit beside the wordmark; the text mark must stand alone if the image is blocked.
- Footer: `Questions? Reply to this email or write hello@mypantryhub.com`. Link to `www.mypantryhub.com`. For **marketing / recurring digests only**, an unsubscribe link and mailing-address line. Transactional mail (welcome, receipts, dunning, cancellation) must not carry an unsubscribe, so people don’t opt out of billing notices.
- Contact in every footer is `hello@mypantryhub.com`. Leave `info@mypantryhub.com` on the public site, legal pages, and `security.txt` unless a later brand pass changes those on purpose.

**Colors** (from `frontend/app/globals.css`)

| Role | Hex |
|------|-----|
| Brand green (primary) | `#7cb342` |
| Green hover / button fill (darker, better contrast) | `#689f38` |
| Marketing wash | `#fefdf9` |
| Marketing surface / hairline | `#f5f0e6` |
| Text | `#0f172a` |
| Muted | `#64748b` |
| Accent (use sparingly, e.g. “action needed”) | `#f59e0b` |
| Danger (failed payment) | `#f43f5e` |
| Surface | `#ffffff` |

Buttons: `#689f38` background, `#ffffff` label, 14–16px padding, 8px radius, full-width on narrow panes. Under every button, a plain URL.

**Dark-mode safety**

- Set explicit background and text colors on `body`, every `td`, links, and buttons (no inherited transparent fills).
- Include a `@media (prefers-color-scheme: dark)` block that uses `#0f172a` wash, `#1e293b` card, `#e2e8f0` text, and the same `#7cb342` / `#689f38` accents — so Apple Mail dark mode doesn’t invert cream into gray-green.
- Avoid hairline 1px borders that vanish in dark mode; use 2px or a tinted cell.

**Plain text**

Every send already requires a `text` part. Keep it first-class: greeting, the same facts, the same URLs on their own lines, `Questions? hello@mypantryhub.com`. No HTML entities, no “click here” without the URL.

**Approach (fits this repo)**

The send path is FastAPI + `resend==2.6.0`. There is no React Email package and no Node mailer. **v1 should stay inline, table-based HTML in Python** (a small `backend/emails/` layout + per-template functions, or a richer `_wrap()`). That matches Bragle’s templates and avoids a second runtime.

React Email (or similar) is a later option if we want a Next.js preview studio. It is not required to make these mail look like the brand, and it should not block PP-131–PP-135.

**Tests and previews**

- Unit tests still mock Resend; add assertions that the HTML includes the wordmark, `hello@mypantryhub.com`, a CTA href, and a text fallback.
- A dev-only or admin-gated “send preview” that mails **`thindery@gmail.com` only**, with idempotency keys like `design-preview:{template}:{date}`. Never send previews to other addresses.

---

## Per-email improvements

### Welcome / onboarding (PP-132)

Help someone do the first useful thing, not just “thanks for joining.”

- Subject: “Welcome to Pantry Hub — scan your first item” (or similar; keep it short).
- Greeting by name when we have it.
- Three concrete first steps, in product language we already use: open Scan Barcode / Quick Scan, add what’s in the cupboard, build a shopping list from what you’re low on. No “AI-powered” hype; receipt scan can be mentioned as an optional later step (Free includes 5 AI receipt scans/month per the pricing page).
- Primary CTA: “Open your pantry” → `/dashboard/`.
- Still one-shot (`welcome:{user_id}`); do not re-welcome existing backfilled users.

### Payment / subscription confirmation (PP-133)

This is the mail Tylor called boring. Keep the receipt facts, then say what they just unlocked.

- Subject can stay close to today (“Your Pantry Hub Pro plan is active” / “Payment received for your Pantry Hub Pro plan”) so it remains searchable as a receipt.
- Lead with the fact: plan, amount (or “$0.00 — promo / complimentary period”), access through {period end}.
- Then a short “What’s included” list **copied from the live pricing page**, nothing more:
  - **Pro:** unlimited pantry items, unlimited AI receipt scans, cloud sync across devices, advanced analytics, push notifications, CSV export, priority support.
  - **Family:** everything in Pro, plus up to 5 household members, shared inventory, personal + shared lists, activity feed, admin controls, family meal planning.
- Primary CTA: “Go to your pantry” → `/dashboard/`. Secondary text link: manage billing → `/dashboard/account/`.
- No “welcome to the community of N cooks,” no stars, no quotes.

### Payment failed (PP-134)

Calm and specific. The job is to update the card before access is at risk.

- Keep an “Action needed” subject.
- Amount, that the latest payment did not go through, and that they should update the card to keep the plan active. Do not include raw Stripe decline codes in the body.
- One CTA: “Update payment method” → account / billing portal.
- Use danger / accent color sparingly (a small label, not a red page).

### Cancellation scheduled + ended / win-back (PP-135)

Two templates, same family.

- **Scheduled:** You still have Pro/Family until {period end}. One CTA: “Keep my plan” → account (reactivate). Soft tone; no guilt.
- **Ended:** You’re on the Free plan now (50 items, 5 receipt scans/month, shopping list — only what’s on the pricing page). CTA: “Resubscribe” → `/pricing/`. Optional one-line of what they lose (unlimited items, unlimited scans, sync) without pressure copy.

### Promo / trial ending (PP-136) — only if relevant

Do not add a “trial ending” email until the product actually has a trial or a known complimentary period end. Today a promo $0 invoice leaves the sub `active`. If we later have a Stripe `trialing` status, or we can reliably detect “first paid renewal is in N days after a $0 promo,” send a short reminder ~3 days before with the renewal amount and a manage-billing link. Otherwise skip this ticket’s implementation and leave the design on the shelf.

### Low-stock or expiring-items digest (PP-137) — only if relevant

`pantry_items` has quantity, category, and in-app low-stock thresholds, but **no expiration date**. An “expiring items” digest is not honest until that field exists. A **low-stock digest** (weekly, items at or below the user’s threshold) could be useful later. That mail is closer to marketing / a notification the user should opt into; it **must** include unsubscribe and must default off until they ask for it. Do not start sending a digest to everyone who has a welcome record.

---

## Tone

Warm, plain, and specific — a helpful person in the kitchen, not a growth newsletter. Short sentences. Lead with the fact, then the next step. Contractive words (“your plan is active through Dec 21”) beat filler (“we’re excited to have you on this journey”). Never invent social proof. Never imply Voice Assistant / Gemini (PP-102). Sign off as Pantry Hub, with `hello@mypantryhub.com`.

---

## Suggested build order

1. PP-131 layout + preview-to-Tylor only, and confirm the `hello@` footer is in the deployed helper.  
2. PP-133 payment confirmation (the mail already in his inbox).  
3. PP-132 welcome, PP-134 failed, PP-135 cancellation.  
4. PP-136 / PP-137 only when the product actually has the underlying state.
