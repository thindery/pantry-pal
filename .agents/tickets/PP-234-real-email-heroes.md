# PP-234: Ship approved real Pexels photos on three email hero slots

**Status:** ✅ Live (2026-11-26, 3:51 PM America/Chicago, build `596be58`, [#155](https://github.com/thindery/pantry-pal/pull/155)). Journeys went live 6:33 PM CT the same day (copy approved, t96u).
**Priority:** P2
**Phase:** Growth / email
**Created:** 2026-11-26, 3:40 PM America/Chicago
**Source:** Tylor (t91u / pt91u): thumbs-up on the real Pexels set; ship option A for each remaining slot.
**Coding agent:** Grok Bot directly. Hermes and the Grok CLI are not used.
**Depends on:** PP-199
**Constraints:** $0 only. No new signups. No secrets in git. Never commit the 2026-07-30 file, `.agents/email-previews/` or GROWTH-010. Do not change `EMAIL_JOURNEYS_*` or other send flags. Keep `hero-pantry-welcome.jpg` as-is. User-facing text says "AI" only for AI art, never a model name.

Priority is P2 because this replaces recipe stand-in heroes with approved real photographs, but journeys are still off and nothing customer-facing is broken.

---

## What shipped

Tylor rejected the AI options for these three slots ("Looks fakey") and approved option A of the real free-license photographs sourced 2026-11-26.

| Email | Hero now | File | Photographer | License |
|-------|----------|------|--------------|---------|
| R3 know your pantry | `hero-pantry-shelf` | `frontend/public/email/hero-pantry-shelf.jpg` (49 KB, 600×450) | Arina Krasnikova | [Pexels License](https://www.pexels.com/license/) — https://www.pexels.com/photo/glass-jars-on-a-wooden-shelf-in-a-kitchen-6654122/ |
| O1 scan first item | `hero-scan-first-item` | `frontend/public/email/hero-scan-first-item.jpg` (53 KB, 600×450) | Ron Lach | [Pexels License](https://www.pexels.com/license/) — https://www.pexels.com/photo/food-in-glass-jars-in-kitchen-10568355/ |
| O3 Pro | `hero-household-pantry` | `frontend/public/email/hero-household-pantry.jpg` (49 KB, 600×450) | RDNE Stock project | [Pexels License](https://www.pexels.com/license/) — https://www.pexels.com/photo/woman-placing-glass-jars-on-a-kitchen-cabinet-8581042/ |

R1 welcome keeps `hero-pantry-welcome` (approved AI illustration). Recipe-illustration JPGs stay in `frontend/public/email/` for recipe cards and as fallbacks; they are no longer the hero on R3, O1, or O3.

Alt text for the three new files describes the photograph and does not start with "AI illustration". Credit rows are in `frontend/public/email/CREDITS.md`.

## Mailing address (2026-11-26, 3:55 PM CT)

Tylor provided the CAN-SPAM footer address (t94u): `334 E Kearney St #255, Springfield, MO`. It is set as `EMAIL_MAILING_ADDRESS` on OVH (quoted in `.env.prod` so the `#255` suite number is not treated as a comment). `EMAIL_JOURNEYS_ENABLED` and `EMAIL_JOURNEYS_TEST_RECIPIENTS` were not set. Journey copy in PP-195 / PP-196 now uses this address in the footer examples.

## Go live follow-up (2026-11-26, 6:33 PM CT)

The earlier go-live blockers are cleared: a Cloudflare skip covers `/email/*` (see PP-199), Tylor approved the copy (t96u: "All looks good"), and send flags are on (`EMAIL_JOURNEYS_ENABLED=true`, `EMAIL_ONBOARDING_SINCE=2026-11-27T00:32:58+00:00`). The heroes themselves were already live at build `596be58`.
