# PP-131: Shared branded email layout

**Status:** ✅ Done
**Priority:** P1
**Phase:** Email design (2026-11-22)
**Created:** 2026-11-22
**Completed:** 2026-11-22
**Depends on:** PP-095, PP-096
**Doc:** `.agents/docs/email-design-plan.md`

---

## Problem

Every transactional email shares a bare `_wrap()` in `backend/services/email_service.py`: system-ui, a heading, and a gray contact line. No wordmark, no brand colors, no card, no dark-mode safety. Tylor called the first live message visually boring.

## Fix Plan

- [x] Replace `_wrap()` with a table-based layout (Bragle-style: 520px card, wordmark header, one CTA style, footer). Keep sending in Python; do not add React Email for v1.
- [x] Use site colors from `frontend/app/globals.css` (`#fefdf9` wash, `#689f38` buttons, `#0f172a` text). Text wordmark “Pantry Hub”; do not depend on a missing `/logo.png`.
- [x] Footer contact is `hello@mypantryhub.com`. Unsubscribe only on future marketing/digest mail, never on transactional mail.
- [x] Explicit colors + a dark `prefers-color-scheme` block so clients do not invert the cream palette.
- [x] Keep a first-class plain-text part.
- [x] Preview sends to `thindery@gmail.com` only (`design-preview:{template}:{date}`). Never invent social proof.

## Acceptance Criteria

- [x] All five current templates render inside the new shell
- [x] Unit tests assert wordmark, `hello@mypantryhub.com`, and a text fallback
- [x] A preview to Tylor’s address only is documented and used before shipping
