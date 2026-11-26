# PP-196: Onboarding journey for new app signups (scan first item, recipes, Pro)

**Status:** 🟡 Shipping (code behind flags; no email goes to any real address until Tylor approves)
**Priority:** P2
**Phase:** Growth / email
**Created:** 2026-11-26, 1:10 PM America/Chicago
**Source:** Tylor (t79u, t80u, t81u): "get something setup here but even better ... visibility in a dashboard of seeing the emails, subscriptions, clicks ... All free services ... imagery in our emails"
**Coding agent:** Grok Bot directly. Hermes and the Grok CLI are not used.
**Allowed paths:** `backend/services/email_*.py`, `backend/services/journey_emails.py`, `backend/services/admin_email_marketing.py`, `backend/services/recipe_newsletter_service.py`, `backend/routers/{admin,email_preferences,recipe_newsletter}.py`, `backend/jobs/email_journeys.py`, `database/migrations/035_*`, `frontend/components/admin/*`, `frontend/components/recipes-public/RecipeNewsletterForm.tsx`, `frontend/services/adminService.ts`, `frontend/public/email/`, `tests/`, `.env*.example`, `.agents/`.
**Constraints:** $0 only (Resend free tier, existing OVH/Postgres). No new dependencies. No secrets in git, chat or tickets. Never commit the 2026-07-30 file, `.agents/email-previews/` or GROWTH-010. User-facing text says "AI", never a model name. Dashboard shows real rows only.
**Depends on:** PP-194. Welcome (existing, transactional, `send_welcome`) is unchanged and stays first.

Priority is P2 because it improves activation and conversion of new accounts but blocks nothing today.

---

## Behavior

- Enrolls only accounts with `users.created_at >= EMAIL_ONBOARDING_SINCE` (blank = nobody). Existing users are never enrolled.
- Steps anchored to signup time: day 1, day 3, day 7. Steps are **skipped when already done**: has pantry items, has a saved recipe, or is already on a paid plan. That is better than JWA's fixed-delay series.
- Respects `email_preferences.onboarding_tips` (default on, one-click off via the email footer; stops the journey). Suppressed addresses stop the journey.
- No claim about AI-recipe limits (Pro-only vs trial is still undecided); copy only uses facts from the pricing page.

## Email copy for Tylor's approval

### O1 Scan one thing (skipped if the user already has pantry items)

**When:** Day 1 after signup
**Subject:** Scan one thing to get your pantry started

```text
Pantry Hub

Scan one thing to get started

Hi Sam,

Your pantry is empty so far. Pick one thing from the cupboard and add it with Scan Barcode or Quick Scan. It takes a few seconds, and you can add the rest whenever you like.

Add your first item:
[tracked link -> /dashboard/]

Questions? Reply to this email or write hello@mypantryhub.com.
www.mypantryhub.com

You're getting these getting-started tips because you made a Pantry Hub account.
Unsubscribe: https://www.mypantryhub.com/api/public/email/unsubscribe?token=<token>&list=<list>
Pantry Hub, 334 E Kearney St #255, Springfield, MO
```


### O2 Turn what you have into dinner (skipped if the user saved a recipe)

**When:** Day 3 after signup
**Subject:** Turn what you have into dinner

```text
Pantry Hub

Turn what you have into dinner

Hi Sam,

Save a recipe in Pantry Hub and it shows which ingredients you already have and which you're missing. The free recipe library is a good place to start.

Browse recipes:
[tracked link -> /recipes/]

Questions? Reply to this email or write hello@mypantryhub.com.
www.mypantryhub.com

You're getting these getting-started tips because you made a Pantry Hub account.
Unsubscribe: https://www.mypantryhub.com/api/public/email/unsubscribe?token=<token>&list=<list>
Pantry Hub, 334 E Kearney St #255, Springfield, MO
```


### O3 What Pro adds (free-tier users only)

**When:** Day 7 after signup
**Subject:** What Pro adds to Pantry Hub

```text
Pantry Hub

What Pro adds

Hi Sam,

If you're getting value from Pantry Hub, here is what Pro adds:

- Unlimited pantry items
- Unlimited AI receipt scans
- Cloud sync across devices
- Advanced analytics
- Push notifications
- CSV export
- Priority support

The Free plan stays free. Upgrade only if you want these.

See plans:
[tracked link -> /pricing/]

Questions? Reply to this email or write hello@mypantryhub.com.
www.mypantryhub.com

You're getting these getting-started tips because you made a Pantry Hub account.
Unsubscribe: https://www.mypantryhub.com/api/public/email/unsubscribe?token=<token>&list=<list>
Pantry Hub, 334 E Kearney St #255, Springfield, MO
```

