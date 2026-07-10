"""
Clerk session verification for FastAPI.
Adapted from markdown-pdf/backend/clerk_auth.py (SEC-001).
"""

from __future__ import annotations

import os
import time
from typing import Any, Optional

import httpx
from fastapi import HTTPException, Request
from jose import jwt
from jose.exceptions import JWTError

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


def _email_from_clerk_user(user_id: str) -> Optional[str]:
    secret_key = os.getenv("CLERK_SECRET_KEY", "")
    if not secret_key or not user_id:
        return None
    try:
        response = httpx.get(
            f"https://api.clerk.com/v1/users/{user_id}",
            headers={"Authorization": f"Bearer {secret_key}"},
            timeout=10.0,
        )
        response.raise_for_status()
        data = response.json()
    except Exception:
        return None
    primary_id = data.get("primary_email_address_id")
    for entry in data.get("email_addresses", []):
        if entry.get("id") == primary_id:
            email = entry.get("email_address")
            return email if isinstance(email, str) else None
    if data.get("email_addresses"):
        email = data["email_addresses"][0].get("email_address")
        return email if isinstance(email, str) else None
    return None


def is_admin_user(user_id: Optional[str], email: Optional[str] = None) -> bool:
    admin_ids = _get_admin_user_ids()
    if user_id and user_id in admin_ids:
        return True
    admin_emails = _get_admin_emails()
    if not admin_emails or not user_id:
        return False
    candidates: list[str] = []
    if email:
        candidates.append(email.lower())
    clerk_email = _email_from_clerk_user(user_id)
    if clerk_email:
        candidates.append(clerk_email.lower())
    return any(addr in admin_emails for addr in candidates)


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
    except JWTError:
        return None
    kid = header.get("kid")
    if not kid:
        return None
    for key in _fetch_clerk_jwks().get("keys", []):
        if key.get("kid") == kid:
            return key
    return None


def verify_clerk_session_token(token: str) -> tuple[Optional[str], Optional[str]]:
    if not token:
        return None, None
    signing_key = _get_signing_key(token)
    if not signing_key:
        return None, None
    try:
        claims = jwt.decode(
            token,
            signing_key,
            algorithms=[signing_key.get("alg", "RS256")],
            options={"verify_aud": False},
        )
    except JWTError:
        return None, None
    sub = claims.get("sub")
    if not isinstance(sub, str) or not sub:
        return None, None
    email = claims.get("email")
    if not isinstance(email, str) or not email:
        email = None
    return sub, email


def extract_bearer_token(request: Request) -> Optional[str]:
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        return None
    token = auth_header[7:].strip()
    return token or None


async def resolve_authenticated_user(request: Request) -> tuple[Optional[str], Optional[str]]:
    token = extract_bearer_token(request)
    if token:
        user_id, email = verify_clerk_session_token(token)
        if user_id:
            return user_id, email
    if _test_auth_enabled():
        test_user = request.headers.get("x-user-id")
        if test_user:
            test_email = request.headers.get("x-user-email")
            return test_user, test_email if test_email else None
    return None, None


async def require_authenticated_user_id(request: Request) -> str:
    user_id, _ = await resolve_authenticated_user(request)
    if not user_id:
        raise HTTPException(
            status_code=401,
            detail=error_detail("UNAUTHORIZED", "Authentication required. Please sign in."),
        )
    return user_id


def error_detail(code: str, message: str) -> dict[str, Any]:
    from datetime import datetime, timezone

    return {
        "success": False,
        "error": {"code": code, "message": message},
        "meta": {"timestamp": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")},
    }