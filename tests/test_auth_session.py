"""NextAuth bearer token verification tests (PP-057, PP-074)."""

from __future__ import annotations

import asyncio
from unittest.mock import MagicMock, patch

import pytest
import jwt

from backend.auth_session import resolve_authenticated_user, verify_nextauth_token


def _sign_token(
    *,
    sub: str = "user_123",
    email: str = "user@example.com",
    aud: str | None = "pantry-pal",
    secret: str = "test-secret-key-for-jwt",
) -> str:
    claims: dict[str, str] = {"sub": sub, "email": email}
    if aud is not None:
        claims["aud"] = aud
    return jwt.encode(
        claims,
        secret,
        algorithm="HS256",
        headers={"typ": "JWT"},
    )


@pytest.fixture(autouse=True)
def auth_secret(monkeypatch):
    monkeypatch.setenv("AUTH_SECRET", "test-secret-key-for-jwt")
    monkeypatch.setenv("JWT_AUDIENCE", "pantry-pal")
    monkeypatch.delenv("ALLOW_TEST_AUTH", raising=False)
    monkeypatch.setenv("ENVIRONMENT", "production")
    monkeypatch.setenv("NODE_ENV", "production")


def test_verify_nextauth_token_accepts_valid_audience():
    token = _sign_token()
    user_id, email = verify_nextauth_token(token)
    assert user_id == "user_123"
    assert email == "user@example.com"


def test_verify_nextauth_token_rejects_missing_audience():
    token = _sign_token(aud=None)
    user_id, email = verify_nextauth_token(token)
    assert user_id is None
    assert email is None


def test_verify_nextauth_token_rejects_wrong_audience():
    token = _sign_token(aud="other-app")
    user_id, email = verify_nextauth_token(token)
    assert user_id is None
    assert email is None


def test_resolve_does_not_fall_back_to_clerk():
    """PP-074: production auth path is NextAuth-only (no Clerk session fallback)."""
    req = MagicMock()
    req.headers = {"Authorization": "Bearer not-a-nextauth-token"}

    with patch(
        "backend.auth_session.verify_nextauth_token",
        return_value=(None, None),
    ) as nextauth, patch(
        "backend.clerk_auth.verify_clerk_session_token",
        return_value=("clerk_user", "clerk@example.com"),
    ) as clerk:
        user_id, email = asyncio.run(resolve_authenticated_user(req))

    nextauth.assert_called_once_with("not-a-nextauth-token")
    clerk.assert_not_called()
    assert user_id is None
    assert email is None

def _sign_claims(claims: dict, secret: str = "test-secret-key-for-jwt", algorithm: str = "HS256") -> str:
    return jwt.encode(claims, secret, algorithm=algorithm)


def test_verify_nextauth_token_rejects_expired_token():
    import time

    token = _sign_claims({"sub": "u1", "aud": "pantry-pal", "exp": int(time.time()) - 3600})
    assert verify_nextauth_token(token) == (None, None)


def test_verify_nextauth_token_rejects_wrong_secret():
    token = _sign_claims({"sub": "u1", "aud": "pantry-pal"}, secret="some-other-secret-key-for-jwt")
    assert verify_nextauth_token(token) == (None, None)


def test_verify_nextauth_token_rejects_unsigned_alg_none():
    import base64
    import json

    def b64(obj: dict) -> str:
        return base64.urlsafe_b64encode(json.dumps(obj).encode()).rstrip(b"=").decode()

    token = f"{b64({'alg': 'none', 'typ': 'JWT'})}.{b64({'sub': 'u1', 'aud': 'pantry-pal'})}."
    assert verify_nextauth_token(token) == (None, None)


def test_verify_nextauth_token_rejects_other_hmac_algorithm():
    token = _sign_claims({"sub": "u1", "aud": "pantry-pal"}, algorithm="HS512")
    assert verify_nextauth_token(token) == (None, None)


def test_verify_nextauth_token_accepts_small_clock_skew():
    import time

    token = _sign_claims({"sub": "u1", "aud": "pantry-pal", "iat": int(time.time()) + 5})
    assert verify_nextauth_token(token)[0] == "u1"


def test_verify_nextauth_token_rejects_garbage():
    assert verify_nextauth_token("not.a.jwt") == (None, None)
