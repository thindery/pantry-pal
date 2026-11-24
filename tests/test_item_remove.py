"""Tests for pantry item deletion (PP-162)."""

from __future__ import annotations

from unittest.mock import MagicMock, patch

import pytest

from backend.services import pantry_service

VALID_ITEM_ID = "22222222-2222-4222-8222-222222222222"
VALID_GROUP_ID = "11111111-1111-4111-8111-111111111111"
OTHER_ITEM_ID = "33333333-3333-4333-8333-333333333333"


def test_delete_item_requires_auth(client):
    response = client.delete(f"/api/items/{VALID_ITEM_ID}")
    assert response.status_code == 401


def test_delete_item_invalid_uuid(client, auth_headers):
    response = client.delete("/api/items/not-a-uuid", headers=auth_headers)
    assert response.status_code == 400
    data = response.json()
    assert data["error"]["code"] == "VALIDATION_ERROR"


@patch("backend.routers.items.pantry_service.delete_item", return_value=False)
def test_delete_item_other_user_returns_404(mock_delete, client, auth_headers):
    response = client.delete(f"/api/items/{VALID_ITEM_ID}", headers=auth_headers)
    assert response.status_code == 404
    assert response.json()["error"]["code"] == "NOT_FOUND"
    mock_delete.assert_called_once_with("test_user_contract_001", VALID_ITEM_ID)


@patch("backend.routers.items.pantry_service.delete_item", return_value=True)
def test_delete_item_happy_path(mock_delete, client, auth_headers):
    response = client.delete(f"/api/items/{VALID_ITEM_ID}", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["data"]["deleted"] is True
    assert data["data"]["id"] == VALID_ITEM_ID
    mock_delete.assert_called_once_with("test_user_contract_001", VALID_ITEM_ID)


def test_service_delete_item_without_group_deletes_pantry_item_only():
    mock_cursor = MagicMock()
    mock_cursor.fetchone.side_effect = [
        {"group_id": None},
        {"count": 0},
    ]
    mock_cursor.rowcount = 1

    mock_conn = MagicMock()
    mock_conn.cursor.return_value.__enter__.return_value = mock_cursor

    with patch("backend.services.pantry_service.db_connection") as mock_db:
        mock_db.return_value.__enter__.return_value = mock_conn

        result = pantry_service.delete_item("u1", VALID_ITEM_ID)
        assert result is True

        executed_sqls = [call_args[0][0] for call_args in mock_cursor.execute.call_args_list]

        # Must delete only the user's pantry row
        assert any("DELETE FROM pantry_items" in sql for sql in executed_sqls)
        # Must verify ownership before deleting
        assert any("WHERE user_id = %s AND id = %s" in sql for sql in executed_sqls)
        # Must never touch shared product cache
        for sql in executed_sqls:
            assert "product_cache" not in sql, f"Found forbidden product_cache reference: {sql}"
        # No group delete when item had no group
        assert not any("DELETE FROM item_groups" in sql for sql in executed_sqls)
        mock_conn.commit.assert_called_once()


def test_service_delete_item_last_group_member_deletes_group():
    mock_cursor = MagicMock()
    mock_cursor.fetchone.side_effect = [
        {"group_id": VALID_GROUP_ID},
        {"count": 0},
    ]
    mock_cursor.rowcount = 1

    mock_conn = MagicMock()
    mock_conn.cursor.return_value.__enter__.return_value = mock_cursor

    with patch("backend.services.pantry_service.db_connection") as mock_db:
        mock_db.return_value.__enter__.return_value = mock_conn

        result = pantry_service.delete_item("u1", VALID_ITEM_ID)
        assert result is True

        executed_sqls = [call_args[0][0] for call_args in mock_cursor.execute.call_args_list]

        # Group delete issued because count is 0
        assert any("DELETE FROM item_groups" in sql for sql in executed_sqls)
        # Scoped to user
        assert any(
            "WHERE user_id = %s AND id = %s" in sql
            for sql in executed_sqls
            if "item_groups" in sql
        )


def test_service_delete_item_non_last_group_member_keeps_group():
    mock_cursor = MagicMock()
    mock_cursor.fetchone.side_effect = [
        {"group_id": VALID_GROUP_ID},
        {"count": 1},
    ]
    mock_cursor.rowcount = 1

    mock_conn = MagicMock()
    mock_conn.cursor.return_value.__enter__.return_value = mock_cursor

    with patch("backend.services.pantry_service.db_connection") as mock_db:
        mock_db.return_value.__enter__.return_value = mock_conn

        result = pantry_service.delete_item("u1", VALID_ITEM_ID)
        assert result is True

        executed_sqls = [call_args[0][0] for call_args in mock_cursor.execute.call_args_list]

        # No group delete when other members remain
        assert not any("DELETE FROM item_groups" in sql for sql in executed_sqls)


def test_service_delete_item_missing_row_returns_false():
    mock_cursor = MagicMock()
    mock_cursor.fetchone.return_value = None

    mock_conn = MagicMock()
    mock_conn.cursor.return_value.__enter__.return_value = mock_cursor

    with patch("backend.services.pantry_service.db_connection") as mock_db:
        mock_db.return_value.__enter__.return_value = mock_conn

        result = pantry_service.delete_item("u1", VALID_ITEM_ID)
        assert result is False
        mock_conn.commit.assert_not_called()
        mock_cursor.execute.assert_called_once()
        # Only the lookup should have run
        sql = mock_cursor.execute.call_args[0][0]
        assert "SELECT group_id" in sql
