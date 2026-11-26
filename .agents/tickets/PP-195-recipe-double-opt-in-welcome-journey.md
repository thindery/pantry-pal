# PP-195: Recipe newsletter: double opt-in confirm + 3-email welcome journey + one-click unsubscribe

**Status:** 🟡 Shipping (code behind flags; no email goes to any real address until Tylor approves)
**Priority:** P2
**Phase:** Growth / email
**Created:** 2026-11-26, 1:10 PM America/Chicago
**Source:** Tylor (t79u, t80u, t81u): "get something setup here but even better ... visibility in a dashboard of seeing the emails, subscriptions, clicks ... All free services ... imagery in our emails"
**Coding agent:** Grok Bot directly. Hermes and the Grok CLI are not used.
**Allowed paths:** `backend/services/email_*.py`, `backend/services/journey_emails.py`, `backend/services/admin_email_marketing.py`, `backend/services/recipe_newsletter_service.py`, `backend/routers/{admin,email_preferences,recipe_newsletter}.py`, `backend/jobs/email_journeys.py`, `database/migrations/035_*`, `frontend/components/admin/*`, `frontend/components/recipes-public/RecipeNewsletterForm.tsx`, `frontend/services/adminService.ts`, `frontend/public/email/`, `tests/`, `.env*.example`, `.agents/`.
**Constraints:** $0 only (Resend free tier, existing OVH/Postgres). No new dependencies. No secrets in git, chat or tickets. Never commit the 2026-07-30 file, `.agents/email-previews/` or GROWTH-010. User-facing text says "AI", never a model name. Dashboard shows real rows only.
**Depends on:** PP-193, PP-194

Priority is P2 because it turns the PP-193 capture list into a consented, mailable audience but needs Tylor's copy approval before it can go live.

---

## Behavior

- Signup stores a `pending` subscriber and (only when the gate allows) sends the confirm email. Existing PP-193 rows are `pending`: they never confirmed and are **not** emailed. A one-off "confirm backlog" send for them is a separate decision for Tylor.
- UI honesty: the API returns `confirmation_required`; the form says "Check your inbox" only when a confirmation will really be sent, otherwise "You're signed up".
- Confirm link: person confirms on GET; known scanner user agents get a button page instead. Confirm starts the welcome journey and sends R1 immediately.
- Unsubscribe: footer link and RFC 8058 header. Journey stops, `email_list_events` records it, undo link on the done page. Re-submitting the form after unsubscribing returns the address to `pending` (re-consent).
- Every email: first-party tracked links, hero image (PP-199), AI-illustration alt text and caption, unsubscribe, mailing-address line (placeholder in test mode, held live until `EMAIL_MAILING_ADDRESS` is set).

## Email copy for Tylor's approval

From `Pantry Hub <hello@mypantryhub.com>`. Plain-text version shown; the HTML carries the same words plus the hero image and recipe cards (see PP-199).

### R0 Confirm email (sent on signup, only when journeys are live)

**When:** Day 0, on signup
**Subject:** Confirm your Pantry Hub recipe emails

```text
Pantry Hub

One tap to confirm

Someone, hopefully you, asked for new pantry recipes by email at mypantryhub.com. Tap the link to say yes.

If it wasn't you, ignore this email and we won't write again.

Yes, send me recipes:
https://www.mypantryhub.com/api/public/email/confirm?token=<token>

Questions? Reply to this email or write hello@mypantryhub.com.
www.mypantryhub.com

You got this one email because this address was entered on mypantryhub.com.
```


### R1 Welcome (sent right after the confirm click)

**When:** Day 0, on confirm
**Subject:** You're in: 3 easy pantry recipes to start

```text
Pantry Hub

Welcome to Pantry Hub recipes

Thanks for confirming. Every recipe in our library is built around ingredients most kitchens already have. Three to start with:

- Canned Tuna Pasta: [tracked link -> /recipes/canned-tuna-pasta/]
- Black Bean Tacos: [tracked link -> /recipes/black-bean-tacos/]
- Easy Red Lentil Soup: [tracked link -> /recipes/easy-red-lentil-soup/]

(The pictures are AI illustrations, not photos of the dishes.)

Want to see which recipes you can make from what you already have? Create a free Pantry Hub account: [tracked link -> /auth/signin/]

Browse all recipes:
[tracked link -> /recipes/]

Questions? Reply to this email or write hello@mypantryhub.com.
www.mypantryhub.com

You're getting this because you confirmed recipe emails from Pantry Hub.
Unsubscribe: https://www.mypantryhub.com/api/public/email/unsubscribe?token=<token>&list=<list>
Pantry Hub, 334 E Kearney St #255, Springfield, MO
```


### R2 Cupboard dinners

**When:** Day 3 after confirm
**Subject:** Three dinners from the cupboard

```text
Pantry Hub

Three dinners from the cupboard

Start with Rice and Beans with Canned Beans (pictured): [tracked link -> /recipes/rice-and-beans-with-canned-beans/]
Then try these two. All three lean on rice, beans, pasta and other things that keep.

- Fried Rice with Leftover Rice: [tracked link -> /recipes/leftover-rice-fried-rice/]
- Pasta e Fagioli: [tracked link -> /recipes/pasta-e-fagioli/]

See all recipes:
[tracked link -> /recipes/]

Questions? Reply to this email or write hello@mypantryhub.com.
www.mypantryhub.com

You're getting this because you confirmed recipe emails from Pantry Hub.
Unsubscribe: https://www.mypantryhub.com/api/public/email/unsubscribe?token=<token>&list=<list>
Pantry Hub, 334 E Kearney St #255, Springfield, MO
```


### R3 Know your pantry (soft account promo)

**When:** Day 7 after confirm
**Subject:** Know what's in your pantry before you shop

```text
Pantry Hub

Know what's in your pantry before you shop

Pantry Hub keeps a list of what you have, so you can see what's running low and what to buy before you shop.

The Free plan includes up to 50 pantry items and a shopping list.

Create a free account:
[tracked link -> /auth/signin/]

Questions? Reply to this email or write hello@mypantryhub.com.
www.mypantryhub.com

You're getting this because you confirmed recipe emails from Pantry Hub.
Unsubscribe: https://www.mypantryhub.com/api/public/email/unsubscribe?token=<token>&list=<list>
Pantry Hub, 334 E Kearney St #255, Springfield, MO
```

