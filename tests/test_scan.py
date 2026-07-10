"""Scan and visual usage API contract tests."""

from __future__ import annotations

from unittest.mock import patch

SCAN_RESULTS = [
    {"name": "Apple", "quantity": 2, "unit": "pieces", "category": "produce"},
]

VISUAL_USAGE_RESULT = {
    "processed": [{"name": "Apple", "quantityUsed": 1}],
    "activities": [
        {
            "id": "act_001",
            "userId": "test_user_contract_001",
            "itemId": "item_001",
            "itemName": "Apple",
            "type": "REMOVE",
            "amount": 1,
            "timestamp": "2026-07-10T12:00:00Z",
            "source": "VISUAL_USAGE",
        }
    ],
    "errors": [],
}

SUPPORTED_ITEMS = [
    {"name": "apple", "category": "produce", "typicalUnit": "pieces"},
]


def test_scan_receipt_requires_auth(client):
    response = client.post("/api/scan-receipt", json={"scanData": SCAN_RESULTS})
    assert response.status_code == 401


@patch(
    "backend.routers.scan.scan_service.process_receipt_scan",
    return_value=SCAN_RESULTS,
)
def test_scan_receipt_structured_data(mock_scan, client, auth_headers):
    response = client.post(
        "/api/scan-receipt",
        headers=auth_headers,
        json={"scanData": SCAN_RESULTS},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["data"] == SCAN_RESULTS
    assert data["meta"]["itemCount"] == 1
    mock_scan.assert_called_once()


@patch(
    "backend.routers.scan.scan_service.process_receipt_scan",
    return_value=[{"name": "Milk", "quantity": 1, "unit": "gallons", "category": "dairy"}],
)
def test_scan_receipt_text_data(mock_scan, client, auth_headers):
    response = client.post(
        "/api/scan-receipt",
        headers=auth_headers,
        json={"scanData": "Milk 3.99 gallons"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert len(data["data"]) == 1
    mock_scan.assert_called_once_with("Milk 3.99 gallons")


def test_visual_usage_requires_auth(client):
    response = client.post(
        "/api/visual-usage",
        json={"detections": [{"name": "Apple", "quantityUsed": 1}]},
    )
    assert response.status_code == 401


@patch(
    "backend.routers.scan.scan_service.process_visual_usage",
    return_value=VISUAL_USAGE_RESULT,
)
def test_visual_usage(mock_process, client, auth_headers):
    response = client.post(
        "/api/visual-usage",
        headers=auth_headers,
        json={"detections": [{"name": "Apple", "quantityUsed": 1}]},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["data"]["processed"] == VISUAL_USAGE_RESULT["processed"]
    assert data["meta"]["totalDetections"] == 1
    mock_process.assert_called_once()


def test_visual_usage_validation(client, auth_headers):
    response = client.post(
        "/api/visual-usage",
        headers=auth_headers,
        json={"detections": []},
    )
    assert response.status_code == 422


def test_supported_items_requires_auth(client):
    response = client.get("/api/visual-usage/supported-items")
    assert response.status_code == 401


@patch(
    "backend.routers.scan.scan_service.get_supported_items",
    return_value=SUPPORTED_ITEMS,
)
def test_supported_items(mock_supported, client, auth_headers):
    response = client.get("/api/visual-usage/supported-items", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["data"] == SUPPORTED_ITEMS
    assert data["meta"]["modelVersion"] == "v1.0.0"
    mock_supported.assert_called_once()