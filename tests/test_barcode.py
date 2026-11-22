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
        "backend.routers.barcode.barcode_service.get_cached_product",
        return_value=CACHED_PRODUCT,
    ):
        response = client.get("/api/barcode/012345678905", headers=auth_headers)

    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["cached"] is True
    assert data["product"]["name"] == "Organic Milk"


SAMPLE_ACTIVITY = {
    "id": "660e8400-e29b-41d4-a716-446655440001",
    "userId": "test_user_contract_001",
    "itemId": SAMPLE_ITEM["id"],
    "itemName": SAMPLE_ITEM["name"],
    "type": "ADD",
    "amount": 2,
    "timestamp": "2026-07-10T12:00:00Z",
    "source": "BARCODE_SCAN",
}


@patch(
    "backend.routers.barcode.subscription_service.can_add_items",
    return_value={"allowed": True, "remaining": 45},
)
@patch("backend.routers.barcode.pantry_service.get_all_items", return_value=[])
@patch(
    "backend.routers.barcode.pantry_service.log_activity",
    return_value=SAMPLE_ACTIVITY,
)
@patch("backend.routers.barcode.pantry_service.find_existing_item", return_value=None)
@patch("backend.routers.barcode.pantry_service.add_or_increment_item", return_value=(SAMPLE_ITEM, True))
@patch("backend.routers.barcode.barcode_service.save_product")
def test_save_barcode_product_creates_item_and_cache(
    mock_save_product,
    mock_add,
    mock_find,
    mock_log_activity,
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
    assert data["activity"]["source"] == "BARCODE_SCAN"
    mock_save_product.assert_called_once()
    mock_add.assert_called_once()
    mock_log_activity.assert_called_once()
    assert mock_log_activity.call_args.kwargs.get("adjust_quantity") is False


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

def test_barcode_variants_include_upc_and_ean():
    from backend.services.barcode_service import barcode_variants

    assert barcode_variants("074305001161") == ["074305001161", "0074305001161"]
    assert barcode_variants("0074305001161") == ["0074305001161", "074305001161"]


def test_vinegar_category_maps_to_pantry():
    from backend.services.barcode_service import _map_category

    assert (
        _map_category("Food, Beverages & Tobacco > Food Items > Condiments & Sauces", "")
        == "pantry"
    )


def test_lookup_falls_back_to_upcitemdb_when_off_times_out(client, auth_headers):
    product = {
        "barcode": "074305001161",
        "name": "ORGANIC APPLE CIDER VINEGAR WITH THE 'MOTHER'",
        "brand": "Bragg",
        "category": "pantry",
        "imageUrl": "https://example.com/acv.jpg",
        "ingredients": None,
        "nutrition": None,
        "source": "upcitemdb",
        "infoLastSynced": "2026-11-21T18:00:00Z",
    }
    with patch("backend.routers.barcode.barcode_service.get_cached_product", return_value=None), patch(
        "backend.routers.barcode.barcode_service.lookup_external_product",
        return_value={"success": True, "cached": False, "product": product},
    ), patch("backend.routers.barcode.barcode_service.save_product") as mock_save:
        response = client.get("/api/barcode/074305001161", headers=auth_headers)

    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["cached"] is False
    assert data["product"]["name"] == product["name"]
    assert data["product"]["brand"] == "Bragg"
    mock_save.assert_called_once_with(product)


def test_lookup_timeout_is_not_cached_as_not_found(client, auth_headers):
    with patch("backend.routers.barcode.barcode_service.get_cached_product", return_value=None), patch(
        "backend.routers.barcode.barcode_service.lookup_external_product",
        return_value={"success": False, "cached": False, "timeout": True, "error": "Request timed out"},
    ), patch("backend.routers.barcode.barcode_service.save_product") as mock_save:
        response = client.get("/api/barcode/074305001161", headers=auth_headers)

    assert response.status_code == 404
    mock_save.assert_not_called()


def test_lookup_cached_product_skips_external_sources(client, auth_headers):
    with patch(
        "backend.routers.barcode.barcode_service.get_cached_product",
        return_value=CACHED_PRODUCT,
    ), patch(
        "backend.routers.barcode.barcode_service.lookup_external_product"
    ) as mock_lookup, patch(
        "backend.routers.barcode.barcode_service.save_product"
    ) as mock_save:
        response = client.get("/api/barcode/012345678905", headers=auth_headers)

    assert response.status_code == 200
    assert response.json()["cached"] is True
    mock_lookup.assert_not_called()
    mock_save.assert_not_called()


def test_lookup_external_product_uses_upcitemdb_after_off_timeout():
    import asyncio
    from backend.services import barcode_service

    async def fake_off(_barcode: str):
        return {"success": False, "cached": False, "timeout": True, "error": "Request timed out"}

    async def fake_upc(barcode: str):
        return {
            "success": True,
            "cached": False,
            "product": {
                "barcode": barcode,
                "name": "ORGANIC APPLE CIDER VINEGAR WITH THE 'MOTHER'",
                "brand": "Bragg",
                "category": "pantry",
                "imageUrl": "https://example.com/acv.jpg",
                "source": "upcitemdb",
            },
        }

    async def run():
        with patch.object(barcode_service, "lookup_open_food_facts", side_effect=fake_off), patch.object(
            barcode_service, "lookup_upcitemdb", side_effect=fake_upc
        ):
            return await barcode_service.lookup_external_product("074305001161")

    result = asyncio.run(run())
    assert result["success"] is True
    assert result["product"]["brand"] == "Bragg"
    assert result["product"]["barcode"] == "074305001161"
    assert result["product"]["source"] == "upcitemdb"


@patch("backend.routers.barcode.subscription_service.can_add_items")
@patch(
    "backend.routers.barcode.pantry_service.log_activity",
    return_value=SAMPLE_ACTIVITY,
)
@patch("backend.routers.barcode.pantry_service.find_existing_item", return_value=SAMPLE_ITEM)
@patch(
    "backend.routers.barcode.pantry_service.add_or_increment_item",
    return_value=({**SAMPLE_ITEM, "quantity": 3}, False),
)
@patch("backend.routers.barcode.barcode_service.save_product")
def test_save_barcode_product_increments_existing_item(
    mock_save_product,
    mock_add,
    mock_find,
    mock_log_activity,
    mock_can,
    client,
    auth_headers,
):
    response = client.post(
        "/api/barcode/012345678905",
        headers=auth_headers,
        json={
            "name": "Organic Milk",
            "quantity": 1,
            "unit": "units",
            "category": "dairy",
        },
    )

    assert response.status_code == 201
    data = response.json()
    assert data["item"]["quantity"] == 3
    mock_add.assert_called_once()
    mock_can.assert_not_called()
    mock_log_activity.assert_called_once()
    assert mock_log_activity.call_args.kwargs.get("adjust_quantity") is False
