"""Activities API contract tests."""

from __future__ import annotations

from unittest.mock import patch

SAMPLE_ACTIVITY = {
    "id": "660e8400-e29b-41d4-a716-446655440001",
    "userId": "test_user_contract_001",
    "itemId": "550e8400-e29b-41d4-a716-446655440000",
    "itemName": "Apple",
    "type": "ADD",
    "amount": 2,
    "timestamp": "2024-01-15T10:30:00Z",
    "source": "MANUAL",
}


def test_activities_requires_auth(client):
    response = client.get("/api/activities")
    assert response.status_code == 401


@patch("backend.routers.activities.pantry_service.get_activities", return_value=[SAMPLE_ACTIVITY])
@patch("backend.routers.activities.pantry_service.get_activity_count", return_value=1)
def test_list_activities(mock_count, mock_list, client, auth_headers):
    response = client.get("/api/activities", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["meta"]["total"] == 1


@patch("backend.routers.activities.pantry_service.log_activity", return_value=SAMPLE_ACTIVITY)
def test_create_activity(mock_log, client, auth_headers):
    response = client.post(
        "/api/activities",
        headers=auth_headers,
        json={
            "itemId": "550e8400-e29b-41d4-a716-446655440000",
            "type": "ADD",
            "amount": 2,
            "source": "MANUAL",
        },
    )
    assert response.status_code == 201
    data = response.json()
    assert data["success"] is True
    assert data["data"]["type"] == "ADD"


@patch("backend.routers.activities.pantry_service.log_activity", return_value=SAMPLE_ACTIVITY)
def test_create_activity_record_only(mock_log, client, auth_headers):
    response = client.post(
        "/api/activities",
        headers=auth_headers,
        json={
            "itemId": "550e8400-e29b-41d4-a716-446655440000",
            "type": "ADD",
            "amount": 2,
            "source": "MANUAL",
            "adjustQuantity": False,
        },
    )
    assert response.status_code == 201
    mock_log.assert_called_once()
    assert mock_log.call_args.kwargs.get("adjust_quantity") is False


def test_create_activity_invalid_item_id(client, auth_headers):
    response = client.post(
        "/api/activities",
        headers=auth_headers,
        json={"itemId": "bad-id", "type": "ADD", "amount": 2},
    )
    assert response.status_code == 422