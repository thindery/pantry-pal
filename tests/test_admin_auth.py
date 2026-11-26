"""Tests for admin auth hardening (PP-128).

Verifies:
- Admin email allowed (case-insensitive, trimmed).
- Non-admin denied.
- ADMIN_USER_IDS allowed.
- No Clerk or network function is called.
- Client-supplied email header is not trusted unless ALLOW_TEST_AUTH is enabled.
- require_admin enforces 401 for unauthenticated and 403 for non-admin.
"""

from __future__ import annotations

import asyncio
from unittest.mock import MagicMock, patch

import pytest
from fastapi import HTTPException
import jwt

from backend.auth_session import resolve_authenticated_user
from backend.routers.admin import require_admin
from backend.clerk_auth import is_admin_user


def _sign_token(
    *,
    sub: str = "usr_regular",
    email: str | None = "user@example.com",
    aud: str = "pantry-pal",
    secret: str = "test-secret-key-for-jwt",
) -> str:
    claims: dict[str, str] = {"sub": sub}
    if email is not None:
        claims["email"] = email
    claims["aud"] = aud
    return jwt.encode(claims, secret, algorithm="HS256", headers={"typ": "JWT"})


@pytest.fixture(autouse=True)
def auth_env(monkeypatch):
    monkeypatch.setenv("AUTH_SECRET", "test-secret-key-for-jwt")
    monkeypatch.setenv("JWT_AUDIENCE", "pantry-pal")
    monkeypatch.setenv("ADMIN_EMAILS", "admin@example.com,owner@mypantryhub.com")
    monkeypatch.setenv("ADMIN_USER_IDS", "usr_admin_1,usr_admin_2")
    monkeypatch.delenv("ALLOW_TEST_AUTH", raising=False)
    monkeypatch.setenv("ENVIRONMENT", "production")
    monkeypatch.setenv("NODE_ENV", "production")


# ============================================================================
# is_admin_user unit tests
# ============================================================================


def test_is_admin_user_allowed_by_email():
    assert is_admin_user("usr_any", "admin@example.com") is True
    # Case-insensitive and trimmed compare
    assert is_admin_user("usr_any", "  Admin@Example.COM  ") is True
    assert is_admin_user(None, "owner@mypantryhub.com") is True


def test_is_admin_user_denied_for_non_admin_email():
    assert is_admin_user("usr_regular", "regular@example.com") is False
    assert is_admin_user("usr_regular", "admin@otherdomain.com") is False
    assert is_admin_user(None, "stranger@example.com") is False


def test_is_admin_user_allowed_by_user_id():
    assert is_admin_user("usr_admin_1", None) is True
    assert is_admin_user("usr_admin_2", "nonadmin@example.com") is True
    assert is_admin_user(" usr_admin_1 ") is True


def test_is_admin_user_denied_for_unknown_user_id_and_no_email():
    assert is_admin_user("usr_unknown", None) is False
    assert is_admin_user(None, None) is False


def test_is_admin_user_never_calls_clerk_or_network():
    """PP-128: is_admin_user must never invoke httpx or any network/Clerk API."""
    with patch("httpx.get") as mock_get, patch("httpx.Client") as mock_client, patch(
        "httpx.AsyncClient"
    ) as mock_async_client:
        result = is_admin_user("clerk_user_123", "unknown@example.com")
        assert result is False

        # Even with an admin user ID or admin email, no network call should occur
        result_admin = is_admin_user("usr_admin_1", "admin@example.com")
        assert result_admin is True

        mock_get.assert_not_called()
        mock_client.assert_not_called()
        mock_async_client.assert_not_called()


# ============================================================================
# require_admin & resolve_authenticated_user tests
# ============================================================================


def test_require_admin_success_with_admin_email_token():
    token = _sign_token(sub="usr_regular", email="admin@example.com")
    req = MagicMock()
    req.headers = {"Authorization": f"Bearer {token}"}

    user_id = asyncio.run(require_admin(req))
    assert user_id == "usr_regular"


def test_require_admin_success_with_admin_user_id_token():
    token = _sign_token(sub="usr_admin_1", email="other@example.com")
    req = MagicMock()
    req.headers = {"Authorization": f"Bearer {token}"}

    user_id = asyncio.run(require_admin(req))
    assert user_id == "usr_admin_1"


def test_require_admin_forbidden_for_non_admin_token():
    token = _sign_token(sub="usr_regular", email="regular@example.com")
    req = MagicMock()
    req.headers = {"Authorization": f"Bearer {token}"}

    with pytest.raises(HTTPException) as exc_info:
        asyncio.run(require_admin(req))
    assert exc_info.value.status_code == 403


def test_require_admin_unauthorized_when_no_token():
    req = MagicMock()
    req.headers = {}

    with pytest.raises(HTTPException) as exc_info:
        asyncio.run(require_admin(req))
    assert exc_info.value.status_code == 401


def test_require_admin_does_not_trust_client_email_header_in_production():
    """Client cannot spoof x-user-email or x-user-id without ALLOW_TEST_AUTH=1."""
    req = MagicMock()
    req.headers = {
        "x-user-id": "usr_admin_1",
        "x-user-email": "admin@example.com",
    }

    with pytest.raises(HTTPException) as exc_info:
        asyncio.run(require_admin(req))
    assert exc_info.value.status_code == 401


def test_require_admin_does_not_trust_client_email_header_with_non_admin_token():
    """Even if an attacker sends a valid non-admin token with spoofed x-user-email."""
    token = _sign_token(sub="usr_regular", email="regular@example.com")
    req = MagicMock()
    req.headers = {
        "Authorization": f"Bearer {token}",
        "x-user-email": "admin@example.com",
    }

    with pytest.raises(HTTPException) as exc_info:
        asyncio.run(require_admin(req))
    assert exc_info.value.status_code == 403


def test_require_admin_honors_test_headers_only_when_allow_test_auth(monkeypatch):
    monkeypatch.setenv("ALLOW_TEST_AUTH", "1")
    monkeypatch.setenv("ENVIRONMENT", "development")
    monkeypatch.setenv("NODE_ENV", "development")

    req = MagicMock()
    req.headers = {
        "x-user-id": "usr_regular",
        "x-user-email": "admin@example.com",
    }
    user_id = asyncio.run(require_admin(req))
    assert user_id == "usr_regular"

    # Non-admin in test mode
    req_non_admin = MagicMock()
    req_non_admin.headers = {
        "x-user-id": "usr_regular",
        "x-user-email": "user@example.com",
    }
    with pytest.raises(HTTPException) as exc_info:
        asyncio.run(require_admin(req_non_admin))
    assert exc_info.value.status_code == 403
