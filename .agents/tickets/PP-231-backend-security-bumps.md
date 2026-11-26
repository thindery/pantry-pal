# PP-231: Backend security dependency bumps (Pillow, Starlette/FastAPI, python-jose)

**Status:** 🔨 In progress (2026-11-26)
**Priority:** P0
**Phase:** Security
**Created:** 2026-11-26
**Depends on:** —
**Blocks:** —

---

## Problem

`pip-audit -r requirements.txt` (Nov 26) found known vulnerabilities in four pinned packages:

| Package | Was | Advisories | Why it matters |
|---------|-----|-----------|----------------|
| Pillow | 11.1.0 | 72 | Opens untrusted receipt images in `backend/services/receipt_ocr.py`. |
| Starlette (via FastAPI) | 0.46.2 | 14 | Host-header, multipart form limits, Range-header DoS, path validation. |
| python-jose | 3.3.0 | 6 | Verifies the NextAuth JWT in `backend/auth_session.py`; includes algorithm confusion and a DoS. |
| ecdsa (via python-jose) | 0.19.2 | 1 | Minerva timing attack on P-256; no upstream fix. |

## Work

- `fastapi` 0.115.12 → 0.165.0, with `starlette` pinned at 1.10.0 (fixes every Starlette advisory).
- `Pillow` 11.1.0 → 13.0.0 (fixes all 72).
- `python-jose[cryptography]` 3.3.0 → 3.5.0 (fixes PYSEC-2024-232/233 and PYSEC-2025-185).
- Verified: full backend pytest (429 passed, 43 skipped on a clean venv built from `requirements.txt`), app boots under uvicorn.

## Left over (not fixable by a version bump)

- python-jose PYSEC-2026-4298 (asymmetric keys in HMAC init) and ecdsa PYSEC-2026-1325 have no fixed release. We only verify HS256 tokens with a shared secret and never use JWE or EC keys, so neither path is reachable. **Follow-up PP-232 (P2):** replace python-jose with PyJWT in `backend/auth_session.py` and `backend/clerk_auth.py` to drop both.

## Rules

No new services, no spend, no secrets. Auth behavior unchanged.
