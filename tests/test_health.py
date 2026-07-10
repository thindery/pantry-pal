"""Health endpoint contract tests."""

from __future__ import annotations


def test_root_returns_api_info(client):
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "PantryPal API"
    assert data["health"] == "/health"


def test_health_endpoint(client):
    response = client.get("/health")
    # 200 if DB up, 503 if not — both are valid contract responses
    assert response.status_code in (200, 503)
    data = response.json()
    assert "status" in data
    assert "timestamp" in data


def test_receipts_health_no_auth(client):
    response = client.get("/api/receipts/health")
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["data"]["status"] == "ok"