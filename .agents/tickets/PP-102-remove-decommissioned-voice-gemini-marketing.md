# PP-102: Stop advertising the decommissioned Voice Assistant / Gemini

**Status:** ✅ Done
**Priority:** P0
**Phase:** SEO / AEO / marketing (audit 2026-11-22)
**Created:** 2026-11-22
**Completed:** 2026-11-22
**Depends on:** PP-058 (voice/Gemini already removed from the app)
**Blocks:** PP-108 landing rewrite, PP-111 public listings
**Audit:** `.agents/docs/seo-aeo-audit-2026-11-22.md` (SEO desk, 2026-11-22)

---

## Problem

PP-058 deleted the voice assistant and Gemini client integration and marked “Update marketing, privacy, and pricing copy” done. Public copy still advertises the feature:

- Landing feature card: “Voice Assistant” / “Just say I used 3 eggs…”
- Pricing: “Voice assistant” (Free) and “Voice assistant with Gemini” (Pro)
- `SoftwareApplication` `featureList` includes “Voice Assistant”
- `UpgradePrompt.tsx` still has a Voice Assistant lock screen

Advertising a removed Gemini voice feature is misleading for users and for answer engines.

## Behavior

- Remove Voice Assistant / Gemini claims from landing, pricing, schema, upgrade prompts, and any leftover marketing/help copy.
- Describe the shipped product instead: barcode / Quick Scan, receipt OCR (Tesseract), shopping lists, inventory ledger.
- Do not reintroduce voice as “coming soon” unless Tylor explicitly wants a roadmap note.

## Acceptance Criteria

- [x] No public page, pricing tier list, or JSON-LD `featureList` mentions Voice Assistant or Gemini
- [x] `UpgradePrompt` and other in-app upgrade surfaces no longer sell a removed voice feature
- [x] A repo search for marketing-facing “Voice Assistant” / “Gemini” on public copy is clean (historical tickets/docs may remain)

## Resolution (2026-11-22)

Voice/Gemini is not in the shipped app (PP-058). Removed marketing claims from:

- Landing feature card (replaced with Inventory Ledger)
- Pricing Free disabled-features and Pro feature list
- `SoftwareApplication` JSON-LD `featureList`
- `UpgradePrompt` voice feature case and unused `VoiceAssistantLock`

Left unused API/type stubs in `frontend/services/subscription.ts` and `frontend/types.ts` alone (not public copy; avoid colliding with billing work). Historical tickets/docs/legacy code may still mention voice.
