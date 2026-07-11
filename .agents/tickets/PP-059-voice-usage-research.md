# PP-059: Research voice & visual usage without paid AI tokens

**Status:** 📋 Open  
**Priority:** P2  
**Phase:** 3 — Product research  
**Created:** 2026-07-11  
**Depends on:** PP-058  
**Blocks:** —

---

## Description

Investigate re-implementing voice commands and visual usage tracking **without** shipping third-party AI API keys to the browser or incurring per-token Gemini costs.

## Research Options

- [ ] **Web Speech API** — browser-native speech-to-text; map intents to existing `POST /api/activities` / item CRUD
- [ ] **Server-side Whisper** (self-hosted) — if voice returns, proxy on FastAPI with rate limits
- [ ] **Visual usage** — manual quantity adjust + barcode scan instead of photo AI; or on-device ML (no cloud key)
- [ ] **Receipt OCR** — already on Tesseract backend; document as canonical path

## Deliverable

- [ ] Short decision doc in `.agents/docs/voice-usage-options.md`
- [ ] If approved, spawn implementation ticket(s) with cost/security analysis

## Log

- 2026-07-11: Created after PP-058 Gemini decommission