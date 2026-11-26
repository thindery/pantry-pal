# PP-234: Ship approved real Pexels photos on three email hero slots

**Status:** 🟡 Shipping (code behind flags; no email goes to any real address)
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

## Still blocked from go-live (unchanged)

Cloudflare still challenges `/email/*` for mail image proxies (see PP-199). Send flags stay off. Copy in PP-195 / PP-196 still needs Tylor's OK.
