# PP-199: Imagery in emails: hero image on every journey email, recipe cards, credits

**Status:** 🟡 Shipping (code behind flags; no email goes to any real address until Tylor approves)
**Priority:** P2
**Phase:** Growth / email
**Created:** 2026-11-26, 1:10 PM America/Chicago
**Source:** Tylor (t79u, t80u, t81u): "get something setup here but even better ... visibility in a dashboard of seeing the emails, subscriptions, clicks ... All free services ... imagery in our emails"
**Coding agent:** Grok Bot directly. Hermes and the Grok CLI are not used.
**Allowed paths:** `backend/services/email_*.py`, `backend/services/journey_emails.py`, `backend/services/admin_email_marketing.py`, `backend/services/recipe_newsletter_service.py`, `backend/routers/{admin,email_preferences,recipe_newsletter}.py`, `backend/jobs/email_journeys.py`, `database/migrations/035_*`, `frontend/components/admin/*`, `frontend/components/recipes-public/RecipeNewsletterForm.tsx`, `frontend/services/adminService.ts`, `frontend/public/email/`, `tests/`, `.env*.example`, `.agents/`.
**Constraints:** $0 only (Resend free tier, existing OVH/Postgres). No new dependencies. No secrets in git, chat or tickets. Never commit the 2026-07-30 file, `.agents/email-previews/` or GROWTH-010. User-facing text says "AI", never a model name. Dashboard shows real rows only.
**Depends on:** PP-195, PP-196. Source: Tylor t81u ("imagery in our emails; Unsplash and free to use images and AI to fill gaps").

Priority is P2 because it lifts clickthrough on the acquisition emails but blocks nothing.

---

## Rules (email-safe)

Absolute `https://www.mypantryhub.com/email/<name>.jpg`, JPG (many clients cannot render WebP), 600x450, under 200 KB (checked by test, actual 52-73 KB), `width`/`height` attributes, meaningful alt text starting "AI illustration" for AI art, never hotlinked. A test fails if an image listed in code is missing, too large, the wrong size, or not credited in `frontend/public/email/CREDITS.md`.

## Image plan

| Email | Hero now | Recipe cards | Planned better hero (gap) |
|-------|----------|--------------|---------------------------|
| R0 confirm | none (keep the opt-in email light) | none | none |
| R1 welcome | canned-tuna-pasta | black-bean-tacos, easy-red-lentil-soup | `hero-pantry-welcome` |
| R2 cupboard dinners | rice-and-beans-with-canned-beans | leftover-rice-fried-rice, pasta-e-fagioli | none needed |
| R3 know your pantry | easy-lasagna (stand-in) | none | `hero-pantry-shelf` |
| O1 scan first item | baked-potato-soup (stand-in) | none | `hero-scan-first-item` |
| O2 recipes | sheet-pan-chicken-and-vegetables | none | none needed |
| O3 Pro | sunday-pot-roast (stand-in) | none | `hero-household-pantry` |

Sources used: (1) the existing AI recipe illustrations (PP-184/193), resized to JPG copies. (2) Unsplash: **none used yet.** Unsplash serves a bot challenge (HTTP 401 "Checking your browser", Anubis) to automated fetches from the build box, so photographer names and photo URLs could not be verified. Per the rule that every Unsplash file needs a credit row, none were added; the manual download route (open the photo page in a normal browser, use its Download button, add a row to CREDITS.md) is documented in `CREDITS.md`. We do not use the paid API and do not work around the challenge. (3) AI gaps below.

## Gaps for AI generation (one-line prompts; 4:3, 600x450 final, JPG)

1. `hero-pantry-welcome`: "Warm top-down photo-style illustration of a tidy kitchen counter with jars of rice, beans, pasta and canned tomatoes, soft morning light, cream background, no text."
2. `hero-pantry-shelf`: "Bright illustration of a neat pantry shelf with labeled glass jars, pasta, canned goods and a small shopping list, fresh green accents, no text."
3. `hero-scan-first-item`: "Friendly illustration of a hand holding a phone scanning a can of beans on a kitchen counter, green scan frame around the can, no readable text."
4. `hero-household-pantry`: "Warm illustration of a family kitchen with a shared pantry and a phone showing a simple stock list, green and cream palette, no readable text."

When a file is delivered: add `frontend/public/email/<name>.jpg` (resized with `magick in.png -resize 600x -strip -quality 76 out.jpg`), add the name to `AVAILABLE_IMAGES` and `ALT` in `backend/services/journey_emails.py`, add a CREDITS row. The hero list already prefers the gap image over the stand-in.
