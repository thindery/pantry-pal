"""Tests for item groups API routes and service layer."""

from __future__ import annotations

import uuid
from unittest.mock import MagicMock, patch

import pytest

from backend.services import item_group_service
from backend.services.item_group_service import GroupNotFoundError, ItemNotFoundError
from backend.services.pantry_service import _row_to_item

VALID_GROUP_ID = "11111111-1111-4111-8111-111111111111"
VALID_ITEM_ID_1 = "22222222-2222-4222-8222-222222222222"
VALID_ITEM_ID_2 = "33333333-3333-4333-8333-333333333333"

SAMPLE_GROUP = {
    "id": VALID_GROUP_ID,
    "name": "Cream of Chicken Soup",
    "targetQuantity": 3.0,
    "itemIds": [VALID_ITEM_ID_1, VALID_ITEM_ID_2],
    "createdAt": "2026-11-23T19:00:00Z",
}


def test_item_groups_require_auth(client):
    assert client.get("/api/item-groups").status_code == 401
    assert client.post("/api/item-groups", json={"name": "Soup", "itemIds": [VALID_ITEM_ID_1]}).status_code == 401
    assert client.patch(f"/api/item-groups/{VALID_GROUP_ID}", json={"name": "New Name"}).status_code == 401
    assert client.delete(f"/api/item-groups/{VALID_GROUP_ID}").status_code == 401
    assert client.post(f"/api/item-groups/{VALID_GROUP_ID}/items", json={"itemId": VALID_ITEM_ID_1}).status_code == 401
    assert client.delete(f"/api/item-groups/{VALID_GROUP_ID}/items/{VALID_ITEM_ID_1}").status_code == 401


def test_invalid_uuid_returns_400(client, auth_headers):
    # Route param invalid UUID
    assert client.patch("/api/item-groups/not-a-uuid", headers=auth_headers, json={"name": "New Name"}).status_code == 400
    assert client.delete("/api/item-groups/not-a-uuid", headers=auth_headers).status_code == 400
    assert client.post("/api/item-groups/not-a-uuid/items", headers=auth_headers, json={"itemId": VALID_ITEM_ID_1}).status_code == 400
    assert client.post(f"/api/item-groups/{VALID_GROUP_ID}/items", headers=auth_headers, json={"itemId": "not-a-uuid"}).status_code == 400
    assert client.delete("/api/item-groups/not-a-uuid/items/not-a-uuid", headers=auth_headers).status_code == 400
    assert client.delete(f"/api/item-groups/{VALID_GROUP_ID}/items/not-a-uuid", headers=auth_headers).status_code == 400
    # Create body invalid item ID
    res = client.post("/api/item-groups", headers=auth_headers, json={"name": "Soup", "itemIds": ["bad-id"]})
    assert res.status_code == 400


@patch("backend.routers.item_groups.item_group_service.get_user_groups", return_value=[SAMPLE_GROUP])
def test_list_item_groups(mock_list, client, auth_headers):
    res = client.get("/api/item-groups", headers=auth_headers)
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert len(data["data"]) == 1
    assert data["data"][0]["name"] == "Cream of Chicken Soup"
    mock_list.assert_called_once_with("test_user_contract_001")


@patch("backend.routers.item_groups.item_group_service.create_group", return_value=SAMPLE_GROUP)
def test_create_item_group_happy_path(mock_create, client, auth_headers):
    payload = {
        "name": "Cream of Chicken Soup",
        "itemIds": [VALID_ITEM_ID_1, VALID_ITEM_ID_2],
        "targetQuantity": 3.0,
    }
    res = client.post("/api/item-groups", headers=auth_headers, json=payload)
    assert res.status_code == 201
    data = res.json()
    assert data["success"] is True
    assert data["data"]["id"] == VALID_GROUP_ID
    mock_create.assert_called_once_with(
        user_id="test_user_contract_001",
        name="Cream of Chicken Soup",
        item_ids=[VALID_ITEM_ID_1, VALID_ITEM_ID_2],
        target_quantity=3.0,
    )


@patch("backend.routers.item_groups.item_group_service.create_group", side_effect=ItemNotFoundError("One or more items not found"))
def test_create_item_group_other_user_item_returns_404(mock_create, client, auth_headers):
    payload = {
        "name": "Soup",
        "itemIds": [VALID_ITEM_ID_1],
    }
    res = client.post("/api/item-groups", headers=auth_headers, json=payload)
    assert res.status_code == 404
    assert res.json()["error"]["code"] == "NOT_FOUND"


@patch("backend.routers.item_groups.item_group_service.update_group", return_value={**SAMPLE_GROUP, "name": "Renamed Soup"})
def test_patch_item_group_rename(mock_update, client, auth_headers):
    res = client.patch(
        f"/api/item-groups/{VALID_GROUP_ID}",
        headers=auth_headers,
        json={"name": "Renamed Soup"},
    )
    assert res.status_code == 200
    assert res.json()["data"]["name"] == "Renamed Soup"
    mock_update.assert_called_once_with(
        user_id="test_user_contract_001",
        group_id=VALID_GROUP_ID,
        name="Renamed Soup",
        target_quantity=None,
        update_target=False,
    )


@patch("backend.routers.item_groups.item_group_service.update_group", return_value={**SAMPLE_GROUP, "targetQuantity": None})
def test_patch_item_group_clear_target(mock_update, client, auth_headers):
    res = client.patch(
        f"/api/item-groups/{VALID_GROUP_ID}",
        headers=auth_headers,
        json={"targetQuantity": None},
    )
    assert res.status_code == 200
    mock_update.assert_called_once_with(
        user_id="test_user_contract_001",
        group_id=VALID_GROUP_ID,
        name=None,
        target_quantity=None,
        update_target=True,
    )


@patch("backend.routers.item_groups.item_group_service.update_group", side_effect=GroupNotFoundError("Group not found"))
def test_patch_item_group_other_user_returns_404(mock_update, client, auth_headers):
    res = client.patch(
        f"/api/item-groups/{VALID_GROUP_ID}",
        headers=auth_headers,
        json={"name": "Something"},
    )
    assert res.status_code == 404
    assert res.json()["error"]["code"] == "NOT_FOUND"


@patch("backend.routers.item_groups.item_group_service.delete_group", return_value={"deleted": True, "id": VALID_GROUP_ID, "unlinkedItemIds": [VALID_ITEM_ID_1, VALID_ITEM_ID_2]})
def test_delete_item_group_happy_path(mock_delete, client, auth_headers):
    res = client.delete(f"/api/item-groups/{VALID_GROUP_ID}", headers=auth_headers)
    assert res.status_code == 200
    data = res.json()["data"]
    assert data["deleted"] is True
    assert data["id"] == VALID_GROUP_ID
    assert data["unlinkedItemIds"] == [VALID_ITEM_ID_1, VALID_ITEM_ID_2]


@patch("backend.routers.item_groups.item_group_service.delete_group", side_effect=GroupNotFoundError("Group not found"))
def test_delete_item_group_other_user_returns_404(mock_delete, client, auth_headers):
    res = client.delete(f"/api/item-groups/{VALID_GROUP_ID}", headers=auth_headers)
    assert res.status_code == 404
    assert res.json()["error"]["code"] == "NOT_FOUND"


@patch("backend.routers.item_groups.item_group_service.add_item_to_group", return_value=SAMPLE_GROUP)
def test_add_item_to_group_happy_path(mock_add, client, auth_headers):
    res = client.post(
        f"/api/item-groups/{VALID_GROUP_ID}/items",
        headers=auth_headers,
        json={"itemId": VALID_ITEM_ID_1},
    )
    assert res.status_code == 200
    mock_add.assert_called_once_with("test_user_contract_001", VALID_GROUP_ID, VALID_ITEM_ID_1)


@patch("backend.routers.item_groups.item_group_service.add_item_to_group", side_effect=ItemNotFoundError("Item not found"))
def test_add_item_to_group_other_user_item_returns_404(mock_add, client, auth_headers):
    res = client.post(
        f"/api/item-groups/{VALID_GROUP_ID}/items",
        headers=auth_headers,
        json={"itemId": VALID_ITEM_ID_1},
    )
    assert res.status_code == 404


@patch("backend.routers.item_groups.item_group_service.remove_item_from_group", return_value={"unlinked": True, "id": VALID_GROUP_ID, "itemId": VALID_ITEM_ID_1, "groupDeleted": False})
def test_remove_item_from_group_happy_path(mock_remove, client, auth_headers):
    res = client.delete(
        f"/api/item-groups/{VALID_GROUP_ID}/items/{VALID_ITEM_ID_1}",
        headers=auth_headers,
    )
    assert res.status_code == 200
    assert res.json()["data"]["unlinked"] is True


@patch("backend.routers.item_groups.item_group_service.remove_item_from_group", side_effect=GroupNotFoundError("Group not found"))
def test_remove_item_from_group_other_user_returns_404(mock_remove, client, auth_headers):
    res = client.delete(
        f"/api/item-groups/{VALID_GROUP_ID}/items/{VALID_ITEM_ID_1}",
        headers=auth_headers,
    )
    assert res.status_code == 404


def test_row_to_item_includes_group_id():
    row_with_group = {
        "id": "item-1",
        "user_id": "user-1",
        "name": "Soup",
        "quantity": 2.0,
        "unit": "can",
        "category": "canned goods",
        "last_updated": "2026-11-23T19:00:00Z",
        "group_id": VALID_GROUP_ID,
    }
    item = _row_to_item(row_with_group)
    assert item["groupId"] == VALID_GROUP_ID

    row_without_group = {
        "id": "item-2",
        "user_id": "user-1",
        "name": "Beans",
        "quantity": 1.0,
        "unit": "can",
        "category": "canned goods",
        "last_updated": "2026-11-23T19:00:00Z",
    }
    item2 = _row_to_item(row_without_group)
    assert item2["groupId"] is None


def test_service_delete_group_never_deletes_pantry_items():
    """Verify that deleting a group only updates pantry_items (SET group_id = NULL) and deletes from item_groups."""
    mock_cursor = MagicMock()
    mock_cursor.fetchone.return_value = {"id": VALID_GROUP_ID, "user_id": "u1", "name": "Soup"}
    mock_cursor.fetchall.return_value = [{"id": VALID_ITEM_ID_1}]

    mock_conn = MagicMock()
    mock_conn.cursor.return_value.__enter__.return_value = mock_cursor

    with patch("backend.services.item_group_service.db_connection") as mock_db:
        mock_db.return_value.__enter__.return_value = mock_conn

        res = item_group_service.delete_group("u1", VALID_GROUP_ID)
        assert res["deleted"] is True
        assert res["unlinkedItemIds"] == [VALID_ITEM_ID_1]

        # Inspect all SQL statements executed
        executed_sqls = [call_args[0][0] for call_args in mock_cursor.execute.call_args_list]

        # Must have UPDATE pantry_items SET group_id = NULL
        assert any("UPDATE pantry_items SET group_id = NULL" in sql for sql in executed_sqls)
        # Must have DELETE FROM item_groups
        assert any("DELETE FROM item_groups" in sql for sql in executed_sqls)
        # Must NEVER execute DELETE FROM pantry_items
        for sql in executed_sqls:
            assert "DELETE FROM pantry_items" not in sql, f"Found forbidden DELETE on pantry_items: {sql}"
