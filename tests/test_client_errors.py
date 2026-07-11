"""Client errors API contract tests."""

from __future__ import annotations

from unittest.mock import patch

import pytest

SAMPLE_ERROR = {
    "id": "err_001",
    "user_id": None,
    "error_type": "TypeError",
    "error_message": "Cannot read property",
    "error_stack": "at Component",
    "component": "Dashboard",
    "url": "https://example.com/dashboard",
    "user_agent": "Mozilla/5.0",
    "resolved": False,
    "created_at": "2026-07-10T12:00:00Z",
}


@pytest.fixture
def admin_headers(auth_headers, monkeypatch):
    monkeypatch.setenv("ADMIN_USER_IDS", auth_headers["x-user-id"])
    return auth_headers


def test_create_client_error_requires_auth(client):
    response = client.post(
        "/api/client-errors",
        json={
            "type": "TypeError",
            "message": "Cannot read property",
            "stack": "at Component",
            "component": "Dashboard",
            "url": "https://example.com/dashboard",
            "userAgent": "Mozilla/5.0",
        },
    )
    assert response.status_code == 401


@patch(
    "backend.routers.client_errors.client_errors_service.save_client_error",
    return_value={"id": "err_001"},
)
def test_create_client_error_authenticated(mock_save, client, auth_headers):
    response = client.post(
        "/api/client-errors",
        headers=auth_headers,
        json={
            "type": "TypeError",
            "message": "Cannot read property",
            "stack": "at Component",
            "component": "Dashboard",
            "url": "https://example.com/dashboard",
            "userAgent": "Mozilla/5.0",
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["id"] == "err_001"
    mock_save.assert_called_once()


def test_list_client_errors_requires_admin(client, auth_headers):
    response = client.get("/api/client-errors?resolved=false", headers=auth_headers)
    assert response.status_code == 403


@patch(
    "backend.routers.client_errors.client_errors_service.get_client_errors",
    return_value=[SAMPLE_ERROR],
)
def test_list_client_errors(mock_get, client, admin_headers):
    response = client.get("/api/client-errors?resolved=false", headers=admin_headers)
    assert response.status_code == 200
    data = response.json()
    assert len(data["errors"]) == 1
    assert data["errors"][0]["error_type"] == "TypeError"
    mock_get.assert_called_once_with(resolved=False, limit=50)


@patch(
    "backend.routers.client_errors.client_errors_service.mark_error_resolved",
    return_value=True,
)
def test_resolve_client_error(mock_resolve, client, admin_headers):
    response = client.patch("/api/client-errors/err_001/resolve", headers=admin_headers)
    assert response.status_code == 200
    assert response.json()["success"] is True
    mock_resolve.assert_called_once_with("err_001")


@patch(
    "backend.routers.client_errors.client_errors_service.mark_error_resolved",
    return_value=False,
)
def test_resolve_client_error_not_found(mock_resolve, client, admin_headers):
    response = client.patch("/api/client-errors/missing/resolve", headers=admin_headers)
    assert response.status_code == 404
    assert response.json()["error"] == "Not found"
    mock_resolve.assert_called_once_with("missing")