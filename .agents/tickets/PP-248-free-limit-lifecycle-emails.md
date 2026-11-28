# PP-248: Free-limit lifecycle emails (45 of 50 items, hit the limit)

**Status:** ✅ Live Nov 27, 6:27 PM CT, build `7f79083`, [#178](https://github.com/thindery/pantry-pal/pull/178). `FREE_LIMIT_EMAILS_ENABLED=true`, `FREE_LIMIT_EMAILS_SINCE=2026-11-28T00:26:55Z` (6:26 PM CT). [TEST] copies of both emails sent to thindery@gmail.com at 6:26 PM CT. No real user qualifies yet (0 free users at 45+ items).
**Priority:** P2
**Ship mode:** approved (Tylor, 2026-11-27 6:02 PM CT)
**Phase:** Race to $50 / Lifecycle email
**Created:** 2026-11-27, 5:35 PM America/Chicago
**Source:** Remy Grok relayed Tylor's race (Pantry Hub vs FlowRuns, first to $50 real revenue). Money-making work is pre-approved; customer emails, posts as Tylor, spend, and price/coupon changes still need Tylor's yes.
**Coding agent:** Grok Bot directly. Hermes, agy, and the Grok CLI are not used.
**Constraints:** $0 only. Never invent numbers, reviews or user counts. User-facing text says "AI", never a model name.

Baseline (2026-11-27, 5:14 PM CT, read-only prod DB + live Stripe via the server key): 1 paying subscriber (Pro monthly $4.99, full price), MRR $4.99, all-time net revenue $4.99 ($19.96 gross, $14.97 refunded duplicate checkouts), 0 trials, 3 user accounts total, $1 first-month coupon live with 0 redemptions, 0 yearly subscribers.

---

## Problem

No email reaches a free user who nears or hits a limit. There are no trials (0 trialing), so a trial-ending email does not apply.

## Acceptance Criteria

- [ ] Draft two templates behind an off flag: "You're at 45 of 50 items" and "You hit the free limit" with the real price line and the $1 offer when live.
- [ ] Nothing is sent until Tylor approves the copy and the flag.


## Implementation (2026-11-27)

- `backend/services/free_limit_emails.py`, run by the existing 15-minute `backend.jobs.email_journeys` cron.
- Triggers: "near" when the 45th item was added at or after `FREE_LIMIT_EMAILS_SINCE` and the user has 45–49 items; "limit" when the 50th item was added at or after that time. Forward-only: thresholds crossed before the cutoff never send. No backfill.
- Recipients: free tier only. Skips ADMIN_EMAILS / ADMIN_USER_IDS, Tylor's addresses, @mypantryhub.com, test/QA/e2e and example domains, `FREE_LIMIT_EMAILS_EXCLUDE`, anyone with getting-started emails off, and suppressed addresses.
- Once per user per trigger (idempotency key `free_limit:<trigger>:<user>`). Category lifecycle, so `email_gate` and the mailing-address footer apply. Unsubscribe link uses the getting-started list.
- Copy: honest Pro list (same as the pricing page); the $1 first month line only while the offer is live, otherwise $4.99/mo or $39.99/yr.
- Also fixed `email_service.PRO_FEATURES` (payment and onboarding emails listed unbuilt features: cloud sync, analytics, push, CSV, priority support).
- Env: `FREE_LIMIT_EMAILS_ENABLED`, `FREE_LIMIT_EMAILS_SINCE` (ISO time), `FREE_LIMIT_EMAILS_EXCLUDE` (comma list). Rollback: unset `FREE_LIMIT_EMAILS_ENABLED`.
