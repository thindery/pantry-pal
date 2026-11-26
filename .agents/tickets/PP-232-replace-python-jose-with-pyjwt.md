# PP-232: Replace python-jose with PyJWT

**Status:** ✅ Live (2026-11-26, PR #153, build `2946760`)
**Priority:** P2
**Phase:** Security
**Created:** 2026-11-26
**Depends on:** PP-231
**Blocks:** —

---

## Problem

After PP-231, `pip-audit` still flagged python-jose (PYSEC-2026-4298, no fixed release) and its dependency `ecdsa` (PYSEC-2026-1325, no fix). Neither is reachable (HS256 shared secret only) but both keep the audit red.

## Work

- `backend/auth_session.py` and `backend/clerk_auth.py` use `PyJWT[crypto]` 2.15.1 instead of python-jose. Same HS256-only verification, same audience check, plus a 30 s clock-skew leeway.
- `requirements.txt`: `python-jose[cryptography]` → `PyJWT[crypto]`. `ecdsa` leaves with it.
- New tests in `tests/test_auth_session.py`: expired, wrong secret, `alg: none`, HS512, small clock skew, garbage token.
- Cross-check: a bearer token minted by the frontend's `jose` (`frontend/lib/auth-token.ts` shape) verifies in the Python backend.

## Result

`pip-audit -r requirements.txt`: no known vulnerabilities. Backend pytest 437 passed, 43 skipped.

## Rules

No auth design change. No secrets in git.
