"""
Session verification — NextAuth JWT (primary) with Clerk fallback during cutover.
"""

from __future__ import annotations

import os
from typing import Any, Optional

from fastapi import HTTPException, Request
from jose import jwt
from jose.exceptions import JWTError

from backend.clerk_auth import (
    _test_auth_enabled,
    error_detail,
    verify_clerk_session_token,
)


def _auth_secret() -> str:
    return os.getenv("AUTH_SECRET", os.getenv("NEXTAUTH_SECRET", "")).strip()


def verify_nextauth_token(token: str) -> tuple[Optional[str], Optional[str]]:
    secret = _auth_secret()
    if not secret or not token:
        return None, None
    try:
        claims = jwt.decode(
            token,
            secret,
            algorithms=["HS256"],
            options={"verify_aud": False},
        )
    except JWTError:
        return None, None
    sub = claims.get("sub") or claims.get("id")
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
        user_id, email = verify_nextauth_token(token)
        if user_id:
            return user_id, email
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