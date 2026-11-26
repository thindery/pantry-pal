# PP-193: Capture-only public recipe newsletter signup

**Status:** 🟡 Shipping
**Priority:** P2
**Phase:** Growth / public recipes
**Created:** 2026-11-26, 12:22 PM America/Chicago
**Source:** Tylor (t74u / follow-up: build a minimal capture form after confirming no newsletter infra existed)
**Related:** PP-184 (public recipe library). Confirmation email and any Resend audience work wait for Tylor's OK and are out of scope here.

Priority is P2 because this is a real acquisition form but not blocking customers or revenue; it is shipping now because Tylor asked for the capture path.

---

## Scope

1. Public, capture-only signup: store the email, do **not** send any email (no confirmation, no welcome, no recipe mail). Make **no** Resend audience or contact changes.
2. Backend `POST /api/public/recipe-newsletter`: rate-limited, email validation, honeypot. Writes to `recipe_newsletter_subscribers` (email, source, recipe_slug, consented_at, unsubscribed_at) via migration 034.
3. Compact "Get new pantry recipes by email" form on `/recipes/` and at the end of each recipe page, visible to everyone, usable at 390px. Consent copy: "We'll email new recipes occasionally. Unsubscribe anytime."
4. Privacy policy line: emails collected for the recipe newsletter are used only for that newsletter.
5. $0. No new dependencies.

## Out of scope

- Sending mail of any kind, including a confirmation email
- Resend audiences, segments, or contacts
- Unsubscribe UI (the column exists so a later mailer can honor it)
- Changing the `PUBLIC_RECIPES_INDEXABLE` flag or tag-page indexing
