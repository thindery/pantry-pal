"""Rate limiting middleware contract tests (PP-052)."""

from __future__ import annotations

from unittest.mock import AsyncMock, patch

import pytest


@pytest.fixture
def tight_general_limit(monkeypatch):
    monkeypatch.setenv("RATE_LIMIT_GENERAL", "2")
    monkeypatch.setenv("RATE_LIMIT_STORE", "memory")
    from backend.app.config import get_settings

    get_settings.cache_clear()
    yield
    get_settings.cache_clear()


@patch("backend.routers.items.pantry_service.get_all_items", return_value=[])
def test_rate_limit_returns_429_with_retry_after(
    _mock_items, client, auth_headers, tight_general_limit
):
    for _ in range(2):
        response = client.get("/api/items", headers=auth_headers)
        assert response.status_code != 429

    response = client.get("/api/items", headers=auth_headers)
    assert response.status_code == 429
    assert response.headers.get("Retry-After")
    assert response.headers.get("X-RateLimit-Remaining") == "0"
    data = response.json()
    assert data["error"]["code"] == "RATE_LIMITED"


@patch("backend.routers.items.pantry_service.get_all_items", return_value=[])
def test_rate_limit_uses_verified_user_id(
    _mock_items, client, auth_headers, tight_general_limit
):
    with patch(
        "backend.middleware.rate_limit.resolve_authenticated_user",
        new_callable=AsyncMock,
        return_value=("verified_user_123", None),
    ):
        for _ in range(2):
            client.get("/api/items", headers=auth_headers)

        response = client.get("/api/items", headers=auth_headers)
        assert response.status_code == 429

    with patch(
        "backend.middleware.rate_limit.resolve_authenticated_user",
        new_callable=AsyncMock,
        return_value=("other_user_456", None),
    ):
        response = client.get("/api/items", headers=auth_headers)
        assert response.status_code != 429


def test_rate_limit_ip_fallback_for_unauthenticated(client, tight_general_limit, monkeypatch):
    monkeypatch.setenv("RATE_LIMIT_CLIENT_ERRORS", "1")
    from backend.app.config import get_settings

    get_settings.cache_clear()

    payload = {
        "type": "TypeError",
        "message": "test",
        "stack": "at test",
        "component": "Test",
        "url": "https://example.com",
        "userAgent": "test",
    }
    first = client.post("/api/client-errors", json=payload)
    assert first.status_code == 401

    second = client.post("/api/client-errors", json=payload)
    assert second.status_code == 429

    get_settings.cache_clear()