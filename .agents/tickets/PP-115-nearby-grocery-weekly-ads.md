# PP-115: Nearby grocery weekly ads / deals search

**Status:** 📋 Backlog
**Priority:** P2
**Phase:** Future features
**Created:** 2026-11-22
**Depends on:** —
**Blocks:** —
**Source:** Tylor, 2026-11-22 (“Future feature.... Search nearby grocery ads.”)

---

## Problem

Shoppers already have a pantry and a shopping list in Pantry Hub, but they still have to hunt weekly store ads on their own. A future feature should show sales from local grocery stores near the user and match those deals to their shopping list and low-stock pantry items.

This is a backlog ticket only. No implementation, no vendor signup, and no paid API in this ticket.

## Behavior

- Let a signed-in user find nearby grocery weekly ads / deals, using a location they provide (and only with their consent).
- Show current sales from local stores near that user.
- Match deals to items already on their shopping list and to pantry items that are low or out of stock, so the useful sales are easy to see.
- Research possible **free** data sources later before choosing one. Candidates to evaluate (not commitments):

  - Individual store weekly-ad pages (public flyer pages for chains and local grocers)
  - Flipp-style weekly-ad aggregators (confirm whether any free/public access exists; do not sign up or pay without Tylor’s yes)
  - Kroger public API (confirm current terms, coverage, and whether it stays free)

- Prefer $0 sources. Nothing is signed up for, paid, or shipped from this ticket.
- Privacy: location is used only to find nearby ads; do not store a precise location longer than needed, and document the choice before any build.

## Acceptance Criteria

- [ ] A short research note compares the free-or-public data options above (coverage, terms, whether a key is required, $0 or not)
- [ ] A build plan describes how deals would be matched to the shopping list and low-stock pantry items
- [ ] No vendor account, paid API, or feature work is started until Tylor says to proceed
