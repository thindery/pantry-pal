# PP-235: Weekly recipe newsletter (draft, test copy, approve, send)

**Status:** ✅ Live (2026-11-26, 7:25 PM America/Chicago, build `95ce29d`, [#159](https://github.com/thindery/pantry-pal/pull/159)). Nothing is sent to the list until an admin approves an issue.
**Priority:** P2
**Phase:** Growth / email
**Created:** 2026-11-26, America/Chicago
**Source:** Tylor, PHL-29 ("What about recurring weekly content"): a weekly recipe newsletter on the existing email system.
**Coding agent:** Grok Bot directly. Hermes and the Grok CLI are not used.
**Depends on:** PP-194, PP-195, PP-197, PP-198, PP-199, PP-234
**Constraints:** $0 only. No send to any list without approval. `EMAIL_WEEKLY_AUTO_SEND` stays off. `EMAIL_JOURNEYS_*` untouched. No made-up statistics. User-facing text says "AI" only for AI art, never a model name.

Priority is P2: it is new growth content on a working system, and it is gated behind a manual approval, so nothing is broken or at risk if it slips.

---

## What each weekly issue is

- **3 recipes** from the 24-recipe library, each with its real JPG from `/email/`, the time, a one-line blurb, and a link to `/recipes/<slug>/` through the first-party click redirect.
- **1 short pantry tip** (list below).
- A soft call to action: subscribers get "Create a free Pantry Hub account"; app users get "Open Pantry Hub".
- Footer: why you got it, one-click unsubscribe, mailing address. A line says the pictures are AI illustrations, not photos.

Subject: `This week: <recipe 1>, <recipe 2> and 1 more` (kept under 70 characters; falls back to `<recipe 1> and 2 more recipes`).

## Rotation

- No recipe repeats inside the last 7 issues (24 recipes / 3 a week). Skipped issues do not count as used.
- Seasonal: in-season dishes first, year-round dishes next, out-of-season only if nothing else is left. A timely window lifts leftover turkey soup and green bean casserole around US Thanksgiving.
- Mix of meals when the season allows (never a third dish of one meal while another is equally in season).
- Tips rotate through all 17 before one repeats.
- Needed 14 more email JPGs (the other recipes only had web images): converted from `frontend/public/recipes/*.webp` to 600x450 JPG, 55 to 85 KB, credited in `CREDITS.md`, alt text "AI illustration of ...".

## Approval flow (no send without Tylor)

1. **Wednesday 9 AM Central**: cron `build` picks recipes and the tip, stores a `draft`, and emails a `[TEST]` copy to `EMAIL_WEEKLY_TEST_TO` (thindery@gmail.com) only.
2. **Approve & send** in Admin -> Marketing -> Weekly recipe email (confirm dialog shows the audience size). Or **Skip this week**.
3. The `send` cron (every 15 minutes) sends approved issues: idempotent per address per issue, resumable, 0.6 s between sends, 500 per run, advisory-locked so two runs cannot overlap, held while the email gate is closed.
4. `EMAIL_WEEKLY_AUTO_SEND` (default off): when `true`, a draft approves itself 24 hours after its test copy unless skipped. Not enabled.

## Audience

- Confirmed recipe newsletter subscribers (`recipe_newsletter_subscribers.status = 'confirmed'`).
- App users who turned on **Weekly recipe email** in Account (`email_preferences.weekly_recipes`, new, default off; shown only while marketing mail is on). Nobody is opted in by the migration.
- Excluded: pending, unsubscribed, suppressed (bounced or complained). One email per address.

## Stats

Admin -> Marketing shows each issue with status, recipes, tip, test/approve/finish times, and real sent / delivered / opened / clicked / click rate / bounced. Opens show n/a until Resend open events are seen. The `[TEST]` copy is not counted.

## Copy for approval

### This week's issue (2026-W48, built on 2026-11-26)

Subject: **This week: Green Bean Casserole, Leftover Turkey Soup and 1 more**

| Recipe | Time | Blurb |
|--------|------|-------|
| Green Bean Casserole | 45 minutes | The classic holiday side dish. |
| Leftover Turkey Soup | about 1 hour | An easy soup for the turkey you didn't finish. |
| Easy Vegetable Soup | 40 minutes | A simple vegan vegetable soup that freezes well. |

Tip: **Put a date on it.** When you open a can or a bag, or put leftovers in a container, write the date on a piece of tape. A glance later tells you what to use first.

### All tips in the rotation

1. **Put a date on it.** When you open a can or a bag, or put leftovers in a container, write the date on a piece of tape. A glance later tells you what to use first.
2. **Look before you shop.** Spend two minutes looking through the cupboard and fridge before you write the shopping list. If you plan a couple of meals around what's already there, the list gets shorter.
3. **Oldest in front.** When you put groceries away, slide the older cans and boxes to the front and put the new ones behind them. You'll reach for the oldest first without thinking about it.
4. **Rinse canned beans.** Drain canned beans and rinse them under cold water before you cook with them. It washes off the thick canning liquid. Skip the rinse when a recipe wants that liquid, like some soups.
5. **Taste before you salt.** Canned beans, broth and tomatoes often already contain salt. Taste the dish near the end, then add salt a pinch at a time.
6. **Save some pasta water.** Scoop out about ½ cup of the cooking water before you drain the pasta. A splash in the sauce helps it cling to the noodles.
7. **Pick an empty-the-fridge night.** Once a week, make dinner from what's left. Fried rice, a frittata and a pot of soup all take odds and ends, and Pantry Hub has a recipe for each.
8. **Refrigerate leftovers promptly.** Put leftovers in the fridge within 2 hours of cooking and plan to eat them within 3 to 4 days. Shallow containers cool faster than a deep pot.
9. **Freeze soup flat.** Let soup or chili cool, pour it into a zip-top freezer bag, press the bag flat and freeze it on a tray. Flat bags stack neatly and thaw faster than a block in a tub.
10. **Freeze the extra bread.** If you won't finish a loaf or a pack of tortillas in a few days, freeze half right away instead of waiting. You can warm slices or tortillas straight from the freezer.
11. **Cook extra rice.** Make a bigger pot of rice or another grain, cool it quickly and keep it in the fridge for the next few meals. It's the start of fried rice, rice and beans, or a quick burrito bowl.
12. **Keep a short staples list.** Write down the handful of staples you cook with most, like rice, pasta, canned tomatoes, beans, onions and garlic. When one runs low, add it to the shopping list right then.
13. **Add it when it runs out.** The moment you finish the last of something, put it on the shopping list. The shopping list in Pantry Hub works for this, and so does a note on your phone.
14. **Read the whole recipe first.** Before you turn on the stove, read the recipe from top to bottom. You'll catch the step that needs the oven preheated or the beans drained, and nothing will surprise you halfway through.
15. **Check the substitutions.** If you're missing one ingredient, look at the substitutions on the recipe page before you go to the store. There's often a swap that works with what you have.
16. **Finish with a little acid.** If a soup or a pot of beans tastes flat, a squeeze of lemon or a splash of vinegar at the end often helps.
17. **Label what you freeze.** Write what it is and the date on the bag before it goes in the freezer. Unlabeled bags turn into mystery dinners.

## Files

- `database/migrations/036_weekly_recipe_newsletter.sql` (+ rollback): `email_weekly_issues`, `email_preferences.weekly_recipes`.
- `backend/services/weekly_content.py`, `weekly_recipes.py`, `backend/jobs/weekly_recipes.py`, `journey_emails.render_weekly_issue`.
- `backend/routers/admin.py` (approve, skip), `email_preferences.py` (weekly list, preference), `admin_email_marketing.py` (weekly payload).
- Frontend: `WeeklyRecipesSection.tsx`, `WeeklyRecipesToggle.tsx`, `adminService.ts`, `email-preferences.ts`, `account-view.tsx`.
- Tests: `tests/test_weekly_recipes.py`, `tests/test_weekly_recipes_postgres.py` (now in `npm run test:postgres`, together with `test_email_journeys_postgres.py`), `frontend/tests/email-marketing-panel.test.tsx`, `weekly-recipes-toggle.test.tsx`.
- Docs: `.agents/docs/billing-and-email.md` (Weekly recipe email), `.env.example`, `.env.prod.example`.

## Cron (OVH, UTC)

```
0 14,15 * * 3 docker exec pantry-pal-backend python -m backend.jobs.weekly_recipes build --only-at-hour 9 >> /var/tmp/pantry-weekly-recipes.log 2>&1
*/15 * * * * docker exec pantry-pal-backend python -m backend.jobs.weekly_recipes send >> /var/tmp/pantry-weekly-recipes.log 2>&1
```

## Rollout log

- 2026-11-26, about 7:25 PM CT: PR #159 merged (CI green: quality, test, gitleaks, postgres-integration, e2e-smoke). Deployed with `./deploy/deploy-docker.sh main` (`SKIP_E2E_SMOKE=1`, local Playwright missing; CI e2e-smoke passed). Migration 036 applied. `build-id.txt` in the frontend container: `95ce29d`.
- `EMAIL_WEEKLY_TEST_TO` added to OVH `.env.prod` (backup kept). `EMAIL_WEEKLY_AUTO_SEND` is not set (off). `EMAIL_JOURNEYS_*` untouched.
- Cron installed on OVH (both lines above; previous crontab backed up).
- First issue `2026-W48` built by hand: draft, `[TEST]` copy delivered to the owner address only (subject `[TEST] This week: Green Bean Casserole, Leftover Turkey Soup and 1 more`). Audience right now is 0 (no confirmed recipe subscribers, no app user has opted in), `send` run: 0 sent. The next automatic draft is Wednesday 2026-12-02, 9 AM Central.
