# PP-058: Decommission Gemini client integration

**Status:** ✅ Done  
**Priority:** P0  
**Phase:** 3 — Security remediation  
**Supersedes:** PP-045 (server-side Gemini proxy)  
**Created:** 2026-07-11  
**Depends on:** PP-044  
**Blocks:** —

---

## Description

Remove legacy Gemini / `@google/genai` integration from the frontend. Core product uses Tesseract receipt OCR and barcode lookup — not Gemini.

## Acceptance Criteria

- [x] Delete `geminiService.ts`, `voice-assistant.tsx`, `scan-usage-view.tsx`
- [x] Redirect `/dashboard/scan-usage/` to dashboard
- [x] Remove voice assistant from Account UI and modals
- [x] Remove `NEXT_PUBLIC_GEMINI_API_KEY` from Docker build and env templates
- [x] Remove `@google/genai` dependency
- [x] Update marketing, privacy, and pricing copy

## Log

- 2026-07-11: Decommissioned per product decision; SEC-101 closed by removal