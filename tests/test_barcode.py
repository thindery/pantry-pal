"""Barcode lookup and save API contract tests."""

from __future__ import annotations

from unittest.mock import patch

SAMPLE_ITEM = {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "userId": "test_user_contract_001",
    "name": "Organic Milk",
    "quantity": 2,
    "unit": "units",
    "category": "dairy",
    "lastUpdated": "2026-07-10T12:00:00Z",
    "barcode": "012345678905",
}

CACHED_PRODUCT = {
    "barcode": "012345678905",
    "name": "Organic Milk",
    "brand": "Test Farm",
    "category": "dairy",
    "imageUrl": "https://example.com/milk.jpg",
    "ingredients": "Milk",
    "nutrition": {"calories": 120.0},
    "source": "openfoodfacts",
    "infoLastSynced": "2026-07-10T12:00:00Z",
}


def test_lookup_barcode_returns_cached_product(client, auth_headers):
    with patch(
        "backend.routers.barcode.barcode_service.get_product_by_barcode",
        side_effect=[CACHED_PRODUCT, None],
    ):
        response = client.get("/api/barcode/012345678905", headers=auth_headers)

    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["cached"] is True
    assert data["product"]["name"] == "Organic Milk"


@patch(
    "backend.routers.barcode.subscription_service.can_add_items",
    return_value={"allowed": True, "remaining": 45},
)
@patch("backend.routers.barcode.pantry_service.get_all_items", return_value=[])
@patch("backend.routers.barcode.pantry_service.create_item", return_value=SAMPLE_ITEM)
@patch("backend.routers.barcode.barcode_service.save_product")
def test_save_barcode_product_creates_item_and_cache(
    mock_save_product,
    mock_create,
    mock_get_items,
    mock_can,
    client,
    auth_headers,
):
    response = client.post(
        "/api/barcode/012345678905",
        headers=auth_headers,
        json={
            "name": "Organic Milk",
            "quantity": 2,
            "unit": "units",
            "category": "dairy",
            "brand": "Test Farm",
            "imageUrl": "https://example.com/milk.jpg",
            "ingredients": "Milk",
            "nutrition": {"calories": 120},
        },
    )

    assert response.status_code == 201
    data = response.json()
    assert data["success"] is True
    assert data["item"]["barcode"] == "012345678905"
    mock_save_product.assert_called_once()
    mock_create.assert_called_once()


def test_create_item_rejects_extra_product_info(client, auth_headers):
    response = client.post(
        "/api/items",
        headers=auth_headers,
        json={
            "name": "Apple",
            "quantity": 1,
            "unit": "pieces",
            "category": "produce",
            "productInfo": {"barcode": "012345678905"},
        },
    )
    assert response.status_code == 422