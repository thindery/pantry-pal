# PP-185 — Generic "AI" wording: no model or vendor names

**Priority:** P3 · **Status:** Open · **Requested:** Tylor, 2026-11-25 (voice call)

## Goal
Pantry Hub never names a specific AI model or vendor (Gemini, GPT, Claude, Ollama, Kimi, etc.) anywhere a person can see it. Use "AI" only.

## Audit (2026-11-25, origin/main eded9c5 plus the live site)
- **Live site:** the pages /, /pricing/, /privacy/, /terms/ and /faq/ name no model. Nothing public needs changing today.
- **Frontend copy:** no model names. AI appears only as "AI receipt scans" (PricingPage.tsx:42, 68), "AI Receipt Scanning" (UpgradePrompt.tsx:35, 176) and "AI-assisted features" / "AI extractions" (terms/page.tsx:73, 154).
- **Code comments only (not user-facing):**
  - `frontend/app/dashboard/scan-usage/page.tsx:3`: "Legacy Gemini visual-usage route"
  - `frontend/components/dashboard/receipt-scanner.tsx:64`: "not browser Gemini"
- **Repo docs:** `README.md:17` says "Gemini keys in .env.dev".
- **Backend:** no model names in user-facing strings.

## Work
1. Change the two comments and the README line to generic wording ("AI provider", "legacy AI visual-usage route").
2. Rule for PP-183 and PP-184: every UI, error, email, SEO and recipe-page string says "AI" or "Pantry Hub AI" and never names a model or provider. Model names go only in server env and config.
3. Add a frontend test or lint check that fails if `gemini|gpt-|openai|claude|ollama|kimi` shows up in `frontend/app` or `frontend/components` strings (comments are allowed only if the check can't tell them apart; if so, skip the check).

## Allowed paths
`frontend/app/dashboard/scan-usage/page.tsx`, `frontend/components/dashboard/receipt-scanner.tsx`, `README.md`, a new test under `frontend/__tests__/` (or the existing test dir), and this ticket plus TICKET_STATUS.md.

## Rules
No dependency changes. No commits, pushes or secrets from coding agents. Don't change the privacy or terms meaning.
