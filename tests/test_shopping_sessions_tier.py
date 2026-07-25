"""Shopping session add-to-inventory tier enforcement (SEC-201 / PP-065)."""

from __future__ import annotations

from unittest.mock import patch

SESSION_ID = "550e8400-e29b-41d4-a716-446655440099"

SAMPLE_SESSION = {
    "id": SESSION_ID,
    "userId": "test_user_contract_001",
    "status": "completed",
    "items": [
        {
            "id": "item-1",
            "name": "Milk",
            "quantity": 1,
            "unit": "gal",
            "category": "dairy",
            "barcode": "012345678905",
        },
        {
            "id": "item-2",
            "name": "Bread",
            "quantity": 1,
            "unit": "loaf",
            "category": "bakery",
            "barcode": "012345678912",
        },
    ],
}


def test_add_to_inventory_requires_auth(client):
    response = client.post(f"/api/shopping-sessions/{SESSION_ID}/add-to-inventory")
    assert response.status_code == 401


@patch(
    "backend.services.shopping_sessions_service.subscription_service.can_add_items",
    return_value={"allowed": False, "remaining": 0},
)
@patch(
    "backend.services.shopping_sessions_service.pantry_service.get_all_items",
    return_value=[{"id": f"i{i}"} for i in range(50)],
)
@patch(
    "backend.services.shopping_sessions_service.get_session_by_id",
    return_value=SAMPLE_SESSION,
)
def test_add_to_inventory_tier_limit(mock_session, mock_items, mock_can, client, auth_headers):
    response = client.post(
        f"/api/shopping-sessions/{SESSION_ID}/add-to-inventory",
        headers=auth_headers,
    )
    assert response.status_code == 403
    data = response.json()
    assert data["error"]["code"] == "TIER_LIMIT_EXCEEDED"
    mock_can.assert_called_once()
    mock_session.assert_called_once()
    mock_items.assert_called_once()


@patch("backend.services.shopping_sessions_service.pantry_service.log_activity")
@patch("backend.services.shopping_sessions_service.pantry_service.create_item")
@patch(
    "backend.services.shopping_sessions_service.subscription_service.can_add_items",
    return_value={"allowed": True, "remaining": 10},
)
@patch(
    "backend.services.shopping_sessions_service.pantry_service.get_all_items",
    return_value=[],
)
@patch(
    "backend.services.shopping_sessions_service.get_session_by_id",
    return_value=SAMPLE_SESSION,
)
def test_add_to_inventory_allowed(
    mock_session, mock_items, mock_can, mock_create, mock_log, client, auth_headers
):
    mock_create.side_effect = lambda user_id, data: {
        "id": f"new-{data['barcode']}",
        "userId": user_id,
        **data,
    }
    mock_log.return_value = {"id": "act-1"}

    response = client.post(
        f"/api/shopping-sessions/{SESSION_ID}/add-to-inventory",
        headers=auth_headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert len(data["data"]["items"]) == 2
    assert mock_create.call_count == 2
    mock_can.assert_called_once()
