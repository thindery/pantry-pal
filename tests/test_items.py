"""Items API contract tests."""

from __future__ import annotations

from unittest.mock import patch

SAMPLE_ITEM = {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "userId": "test_user_contract_001",
    "name": "Apple",
    "quantity": 5,
    "unit": "pieces",
    "category": "produce",
    "lastUpdated": "2024-01-15T10:30:00Z",
}


def test_items_requires_auth(client):
    response = client.get("/api/items")
    assert response.status_code == 401


@patch("backend.routers.items.pantry_service.get_all_items", return_value=[SAMPLE_ITEM])
def test_list_items(mock_get, client, auth_headers):
    response = client.get("/api/items", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert len(data["data"]) == 1
    assert data["data"][0]["name"] == "Apple"
    mock_get.assert_called_once()


@patch("backend.routers.items.barcode_service.ensure_product_cached")
@patch(
    "backend.routers.items.subscription_service.can_add_items",
    return_value={"allowed": True, "remaining": 45},
)
@patch("backend.routers.items.pantry_service.get_all_items", return_value=[])
@patch("backend.routers.items.pantry_service.create_item", return_value=SAMPLE_ITEM)
def test_create_item_validation(
    mock_create, mock_get, mock_can, mock_cache, client, auth_headers
):
    response = client.post(
        "/api/items",
        headers=auth_headers,
        json={
            "name": "Apple",
            "quantity": 5,
            "unit": "pieces",
            "category": "produce",
            "barcode": "012345678905",
        },
    )
    assert response.status_code == 201
    data = response.json()
    assert data["success"] is True
    assert data["data"]["id"] == SAMPLE_ITEM["id"]
    mock_cache.assert_called_once()


@patch(
    "backend.routers.items.subscription_service.can_add_items",
    return_value={"allowed": False, "remaining": 0},
)
@patch("backend.routers.items.pantry_service.get_all_items", return_value=[SAMPLE_ITEM] * 50)
def test_create_item_tier_limit(mock_get, mock_can, client, auth_headers):
    response = client.post(
        "/api/items",
        headers=auth_headers,
        json={"name": "Banana", "quantity": 1, "unit": "pieces", "category": "produce"},
    )
    assert response.status_code == 403
    data = response.json()
    assert data["error"]["code"] == "TIER_LIMIT_EXCEEDED"
    mock_can.assert_called_once()


def test_create_item_missing_name(client, auth_headers):
    response = client.post(
        "/api/items",
        headers=auth_headers,
        json={"quantity": 5, "unit": "pieces", "category": "produce"},
    )
    assert response.status_code == 422


@patch("backend.routers.items.pantry_service.get_item_by_id", return_value=None)
def test_get_item_not_found(mock_get, client, auth_headers):
    response = client.get(
        "/api/items/550e8400-e29b-41d4-a716-446655440000",
        headers=auth_headers,
    )
    assert response.status_code == 404
    data = response.json()
    assert data["error"]["code"] == "NOT_FOUND"


def test_get_item_invalid_id(client, auth_headers):
    response = client.get("/api/items/not-a-uuid", headers=auth_headers)
    assert response.status_code == 400
    data = response.json()
    assert data["error"]["code"] == "VALIDATION_ERROR"