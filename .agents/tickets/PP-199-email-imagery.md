# PP-199: Imagery in emails: hero image on every journey email, recipe cards, credits

**Status:** ✅ Live (2026-11-26). Heroes are on the live build; Cloudflare skip for `/email/*` is in place and verified with a GoogleImageProxy UA.
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

| Email | Hero now | Recipe cards |
|-------|----------|--------------|
| R0 confirm | none (keep the opt-in email light) | none |
| R1 welcome | `hero-pantry-welcome` (approved) | canned-tuna-pasta, black-bean-tacos, easy-red-lentil-soup |
| R2 cupboard dinners | rice-and-beans-with-canned-beans | leftover-rice-fried-rice, pasta-e-fagioli |
| R3 know your pantry | `hero-pantry-shelf` (real photo, PP-234) | none |
| O1 scan first item | `hero-scan-first-item` (real photo, PP-234) | none |
| O2 recipes | sheet-pan-chicken-and-vegetables | none |
| O3 Pro | `hero-household-pantry` (real photo, PP-234) | none |

Sources used: (1) the existing AI recipe illustrations (PP-184/193), resized to JPG copies. (2) Unsplash: **none used yet.** Unsplash serves a bot challenge (HTTP 401 "Checking your browser", Anubis) to automated fetches from the build box, so photographer names and photo URLs could not be verified. Per the rule that every Unsplash file needs a credit row, none were added; the manual download route (open the photo page in a normal browser, use its Download button, add a row to CREDITS.md) is documented in `CREDITS.md`. We do not use the paid API and do not work around the challenge. (3) One approved dedicated AI hero (`hero-pantry-welcome`); the other three candidates were rejected.

## AI hero images (added 2026-11-26, 1:19 PM CT)

Tylor approved only `hero-pantry-welcome` (jars plus canned tomato sauce; 600x450 JPG, 56 KB). The other three candidates were rejected and are not in the repo. Recipe-illustration stand-ins remain on R3, O1, and O3. Prompt used for the approved image:


1. `hero-pantry-welcome`: "Warm top-down photo-style illustration of a tidy kitchen counter with jars of rice, beans, pasta and canned tomatoes, soft morning light, cream background, no text."
2. The AI versions of `hero-pantry-shelf`, `hero-scan-first-item`, and `hero-household-pantry` were generated, then rejected by Tylor on 2026-11-26 ("Looks fakey") and removed. Do not re-add those AI files. Real Pexels photographs with those filenames were approved (option A) and shipped in PP-234.

## Real photographs (PP-234, 2026-11-26, 3:40 PM CT)

Tylor approved option A of the real free-license set. R3, O1, and O3 now use `hero-pantry-shelf`, `hero-scan-first-item`, and `hero-household-pantry` (Pexels License; credits in `frontend/public/email/CREDITS.md`). `hero-pantry-welcome` is unchanged. Send flags were not changed.

## Blocker found at deploy (Nov 26, 1:16 PM CT): Cloudflare challenges /email/*.jpg

Live build `92a55d6` serves the files (verified inside the frontend container), but a request to `https://www.mypantryhub.com/email/canned-tuna-pasta.jpg` with Gmail's image-proxy user agent returns `403` with `cf-mitigated: challenge`. Mail-client image proxies cannot solve a challenge, so images would show as broken in Gmail and others. Same for `/recipes/*.webp` if ever hot-linked in mail.

Fix (Tylor's OK needed; it changes live Cloudflare config): add a WAF custom rule, action **Skip** (Bot Fight / managed challenge / rate limiting), for `URI Path starts with /email/`. Click, confirm and unsubscribe links open in a real browser, so they can stay challenged. Do not turn journeys on until the image rule is in and a Gmail test shows the images.


## Go live (2026-11-26)

The Cloudflare challenge on `/email/*` was fixed with a narrow custom skip rule (www + apex, path starts with `/email/`). A GET with Gmail's GoogleImageProxy UA returns HTTP 200 `image/jpeg` with no `cf-mitigated` header. Tylor approved the email copy (t96u) and journeys are on as of 6:33 PM CT.
