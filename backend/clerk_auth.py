"""
Auth helpers shared with NextAuth path (admin allowlists, error_detail, test auth).

Clerk session JWT verification remains for reference only — production auth is
NextAuth-only via backend.auth_session (PP-074). Do not re-enable the Clerk
fallback without issuer/audience checks.
"""

from __future__ import annotations

import os
import time
from typing import Any, Optional

import httpx
import jwt
from jwt.exceptions import PyJWTError

_JWKS_CACHE: dict[str, Any] | None = None
_JWKS_CACHE_AT: float = 0.0
_JWKS_TTL_SECONDS = 3600


def _is_production() -> bool:
    return os.getenv("NODE_ENV", os.getenv("ENVIRONMENT", "development")) == "production"


def _test_auth_enabled() -> bool:
    if _is_production():
        return False
    return os.getenv("ALLOW_TEST_AUTH") == "1"


def _get_admin_user_ids() -> set[str]:
    raw = os.getenv("ADMIN_USER_IDS", "")
    return {item.strip() for item in raw.split(",") if item.strip()}


def _get_admin_emails() -> set[str]:
    raw = os.getenv("ADMIN_EMAILS", os.getenv("VITE_ADMIN_EMAILS", ""))
    return {item.strip().lower() for item in raw.split(",") if item.strip()}


def is_admin_user(user_id: Optional[str], email: Optional[str] = None) -> bool:
    """
    Decide admin access from authenticated user id and verified email (PP-128).

    Does NOT call Clerk or any network API.
    A user is an admin if their id is in ADMIN_USER_IDS or their verified email
    is in ADMIN_EMAILS (case-insensitive, trimmed).
    """
    if user_id:
        admin_ids = _get_admin_user_ids()
        if user_id.strip() in admin_ids:
            return True
    if email:
        admin_emails = _get_admin_emails()
        if email.strip().lower() in admin_emails:
            return True
    return False


def _fetch_clerk_jwks() -> dict[str, Any]:
    global _JWKS_CACHE, _JWKS_CACHE_AT
    now = time.time()
    if _JWKS_CACHE and now - _JWKS_CACHE_AT < _JWKS_TTL_SECONDS:
        return _JWKS_CACHE
    secret_key = os.getenv("CLERK_SECRET_KEY", "")
    if not secret_key:
        return {"keys": []}
    response = httpx.get(
        "https://api.clerk.com/v1/jwks",
        headers={"Authorization": f"Bearer {secret_key}"},
        timeout=10.0,
    )
    response.raise_for_status()
    _JWKS_CACHE = response.json()
    _JWKS_CACHE_AT = now
    return _JWKS_CACHE


def _get_signing_key(token: str) -> Optional[dict[str, Any]]:
    try:
        header = jwt.get_unverified_header(token)
    except PyJWTError:
        return None
    kid = header.get("kid")
    if not kid:
        return None
    for key in _fetch_clerk_jwks().get("keys", []):
        if key.get("kid") == kid:
            return key
    return None


def verify_clerk_session_token(token: str) -> tuple[Optional[str], Optional[str]]:
    """
    Legacy Clerk session verify — not used by production auth (PP-074).

    Kept for optional tooling/tests only. Prefer backend.auth_session.
    """
    if not token:
        return None, None
    signing_key = _get_signing_key(token)
    if not signing_key:
        return None, None
    try:
        key = jwt.PyJWK.from_dict(signing_key).key
        claims = jwt.decode(
            token,
            key,
            algorithms=[signing_key.get("alg", "RS256")],
            options={"verify_aud": False},
        )
    except PyJWTError:
        return None, None
    sub = claims.get("sub")
    if not isinstance(sub, str) or not sub:
        return None, None
    email = claims.get("email")
    if not isinstance(email, str) or not email:
        email = None
    return sub, email


def error_detail(code: str, message: str) -> dict[str, Any]:
    from datetime import datetime, timezone

    return {
        "success": False,
        "error": {"code": code, "message": message},
        "meta": {"timestamp": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")},
    }