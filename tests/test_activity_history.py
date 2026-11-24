"""PP-163: removing a pantry item keeps its activity history and logs a DELETE activity."""

from __future__ import annotations

from pathlib import Path
from unittest.mock import MagicMock, patch

from backend.services import pantry_service

ITEM_ID = "22222222-2222-4222-8222-222222222222"
MIGRATIONS = Path(__file__).resolve().parent.parent / "database" / "migrations"


def _run_delete(fetchone_side_effect, user_id="u1"):
    cur = MagicMock()
    cur.fetchone.side_effect = fetchone_side_effect
    cur.rowcount = 1
    conn = MagicMock()
    conn.cursor.return_value.__enter__.return_value = cur
    with patch("backend.services.pantry_service.db_connection") as db:
        db.return_value.__enter__.return_value = conn
        result = pantry_service.delete_item(user_id, ITEM_ID)
    return result, cur, conn


def test_remove_writes_delete_activity_before_deleting_and_keeps_history():
    result, cur, conn = _run_delete(
        [{"name": "Cream of Chicken", "barcode": "051000012616", "quantity": 3.0, "group_id": None}]
    )
    assert result is True
    calls = cur.execute.call_args_list
    sqls = [c[0][0] for c in calls]

    select_i = next(i for i, s in enumerate(sqls) if "FOR UPDATE" in s)
    snap_i = next(i for i, s in enumerate(sqls) if s.startswith("UPDATE activities SET item_barcode"))
    insert_i = next(i for i, s in enumerate(sqls) if "INSERT INTO activities" in s)
    delete_i = next(i for i, s in enumerate(sqls) if "DELETE FROM pantry_items" in s)
    assert select_i < snap_i < insert_i < delete_i

    params = calls[insert_i][0][1]
    assert params[1] == "u1"
    assert params[2] == ITEM_ID
    assert params[3] == "Cream of Chicken"
    assert params[4] == "DELETE"
    assert params[5] == 3.0
    assert "removed_from_pantry" in params[8]
    assert params[9] == "051000012616"

    # History is never deleted; everything is user-scoped; shared product cache untouched.
    assert not any("DELETE FROM activities" in s for s in sqls)
    assert all("product_cache" not in s for s in sqls)
    assert calls[snap_i][0][1] == ("051000012616", "u1", ITEM_ID)
    assert calls[delete_i][0][1] == ("u1", ITEM_ID)
    conn.commit.assert_called_once()


def test_remove_without_barcode_skips_snapshot_update():
    result, cur, _ = _run_delete(
        [{"name": "Tomatoes", "barcode": None, "quantity": 0.0, "group_id": None}]
    )
    assert result is True
    sqls = [c[0][0] for c in cur.execute.call_args_list]
    assert not any(s.startswith("UPDATE activities") for s in sqls)
    assert sum("INSERT INTO activities" in s for s in sqls) == 1


def test_other_users_item_writes_nothing():
    result, cur, conn = _run_delete([None], user_id="someone_else")
    assert result is False
    sqls = [c[0][0] for c in cur.execute.call_args_list]
    assert len(sqls) == 1 and "FOR UPDATE" in sqls[0]
    assert cur.execute.call_args_list[0][0][1] == ("someone_else", ITEM_ID)
    conn.commit.assert_not_called()


def test_row_to_activity_handles_removed_item():
    row = {
        "id": "a1",
        "user_id": "u1",
        "item_id": None,
        "item_name": "Cream of Chicken",
        "item_barcode": "051000012616",
        "type": "DELETE",
        "amount": 3,
        "timestamp": "2026-11-23T21:00:00Z",
        "source": "MANUAL",
        "metadata": '{"reason":"removed_from_pantry"}',
    }
    out = pantry_service._row_to_activity(row)
    assert out["itemId"] is None
    assert out["itemName"] == "Cream of Chicken"
    assert out["itemBarcode"] == "051000012616"
    assert out["type"] == "DELETE"


def test_migration_024_sets_null_and_allows_delete_type():
    fwd = (MIGRATIONS / "024_activity_keep_history.sql").read_text()
    assert "ON DELETE SET NULL" in fwd
    assert "ON DELETE CASCADE" not in fwd
    assert "'DELETE'" in fwd
    assert "item_barcode" in fwd
    assert (MIGRATIONS / "024_activity_keep_history.rollback.sql").exists()
