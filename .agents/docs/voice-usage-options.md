# Voice & Visual Usage — Options Without Paid AI Tokens

**Date:** 2026-07-11  
**Ticket:** PP-059  
**Context:** PP-058 removed Gemini client integration (`geminiService.ts`, `voice-assistant.tsx`, `scan-usage-view.tsx`). Receipt scanning now uses server-side Tesseract OCR. This document evaluates paths to restore voice and usage-tracking UX without shipping third-party AI API keys to the browser.

---

## Goals

1. No `NEXT_PUBLIC_*` AI keys in the frontend bundle
2. No per-token cloud inference costs on the hot path
3. Reuse existing FastAPI routes (`POST /api/activities`, item CRUD, `POST /api/visual-usage`)
4. Honor tier limits already defined in `subscription_service.TIER_LIMITS` (`voiceAssistant`, `aiCallsPerMonth`)

---

## Current Baseline (Post PP-058)

| Capability | Implementation | AI dependency |
|------------|----------------|---------------|
| Receipt scan | `POST /api/receipts/scan` → Tesseract OCR + text parsing | None |
| Barcode add | `GET /api/barcode/:code` → OpenFoodFacts cache | None |
| Manual adjust | Item quantity UI + `POST /api/activities` | None |
| Visual usage | `POST /api/visual-usage` — keyword match against pantry (no vision model) | None |
| Voice | **Removed** — was Gemini native audio in browser | Was Gemini |

---

## Option A — Web Speech API (Recommended for voice v1)

**How it works:** Browser-native `SpeechRecognition` / `webkitSpeechRecognition` transcribes speech locally (Chrome/Edge; Safari limited). Frontend maps utterances to intents, then calls existing REST endpoints.

**Example intents:**

| Utterance pattern | Action |
|-------------------|--------|
| "add 2 apples" | `POST /api/items` or activity ADD |
| "used one milk" | `POST /api/visual-usage` with `{ name: "milk", quantityUsed: 1 }` |
| "what's low stock" | `GET /api/items` + client filter |

**Pros**

- Zero API keys; no server GPU
- Works offline for recognition (browser-dependent)
- Fast to ship; aligns with existing activity ledger

**Cons**

- Browser support uneven (Firefox no native API; need fallback UI)
- Accuracy varies; needs constrained grammar / confirmation step
- No continuous duplex "assistant" feel without extra UX

**Security / cost**

- Rate-limit voice-initiated writes via existing PP-052 middleware + `increment_usage(..., "voiceSessions")` on backend
- Enforce `can_use_voice_assistant()` server-side before accepting voice-sourced bulk writes

**Effort:** ~3–5 days (intent parser, mic UX, tier gating, tests)

---

## Option B — Self-Hosted Whisper on FastAPI

**How it works:** Browser records audio blob → `POST /api/voice/transcribe` → faster-whisper on CPU/GPU → same intent layer as Option A.

**Pros**

- Better accuracy than Web Speech in noisy kitchens
- Single vendor-agnostic stack; no Google/Gemini tokens

**Cons**

- OVH CPU inference latency (1–5s per utterance)
- Model storage (~150MB–3GB depending on model)
- Operational cost (container memory, optional GPU)

**Security / cost**

- Audio uploads are PII-sensitive — short retention, size caps, auth required
- Hard per-user quotas essential (`voiceSessions`, bytes/day)

**Effort:** ~1–2 weeks (endpoint, queue, model deploy, monitoring)

---

## Option C — Visual Usage Without Vision AI (Recommended for usage v1)

**How it works:** Replace photo-based "what did I use?" with deterministic flows already partially built:

1. **Quick adjust** — tap item → −1 / +1 (exists in dashboard)
2. **Barcode scan-out** — scan UPC → confirm decrement
3. **Structured visual-usage** — `POST /api/visual-usage` with user-selected items (extend UI picker; backend already logs `REMOVE` activities)
4. **Shopping session checkout** — mark items consumed at session end

**Pros**

- No model costs; server logic already in `scan_service.process_visual_usage`
- Predictable UX; easy to test

**Cons**

- Not "magic photo" UX users may expect from marketing copy
- Requires UI polish so it feels intentional, not degraded

**Effort:** ~2–4 days (picker UI, barcode decrement flow, copy updates)

---

## Option D — On-Device ML (Future)

TensorFlow.js / MediaPipe for object detection in browser. Theoretically no cloud key, but large bundles, weak pantry-specific labels, and high engineering cost. **Defer** unless product differentiation requires photo-based usage.

---

## Receipt OCR — Canonical Path

Keep **Tesseract on FastAPI** as the only receipt pipeline:

- Frontend: `scanReceiptBackend()` → `/api/receipts/scan`
- Tier gate: `can_scan_receipt()` / `increment_usage(..., "receiptScans")`
- No client-side OCR libraries needed

Document in marketing that "AI receipt scanning" means server OCR + parsing, not Gemini.

---

## Recommendation

| Feature | Path | Ticket to spawn |
|---------|------|-----------------|
| Voice commands | **Option A** (Web Speech) with confirm step | PP-060 |
| Usage tracking | **Option C** (quick adjust + visual-usage picker) | PP-061 |
| Whisper upgrade | Option B only if Web Speech accuracy blocks adoption | PP-062 (optional) |

### PP-060 scope sketch (voice)

- New `components/dashboard/voice-commands.tsx` using Web Speech API
- `lib/voice-intents.ts` — regex/keyword parser → API calls
- Backend: optional `POST /api/voice/command` that validates intent server-side (prevents crafted client payloads)
- Enforce `voiceAssistant` tier + monthly `voiceSessions` counter

### PP-061 scope sketch (usage)

- "Mark as used" on item rows
- Barcode scan mode: "Remove from pantry"
- Deprecate `/dashboard/scan-usage/` permanently; link to quick-adjust from item detail

---

## Decision

**Approve Option A + Option C** for next implementation sprint. Defer Whisper and on-device ML until user feedback warrants infrastructure cost.