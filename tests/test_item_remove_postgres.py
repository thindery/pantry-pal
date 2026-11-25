"""PP-176: removing an item keeps its history (PP-162 / PP-163), against real Postgres.

The unit tests for delete mock the database, so they cannot see the FK rules,
the barcode snapshot, or the shared product cache. This drives the real routes
and checks the rows. Run with RUN_POSTGRES_TESTS=1 (`npm run test:postgres`).
"""

from __future__ import annotations

import os
import uuid

import pytest

from billing_harness import make_user

pytestmark = pytest.mark.skipif(
    os.environ.get("RUN_POSTGRES_TESTS") != "1",
    reason="Set RUN_POSTGRES_TESTS=1 and DATABASE_URL to run",
)


@pytest.fixture(scope="module", autouse=True)
def _migrated():
    from database.migrate import migrate

    migrate()


def _query(sql: str, params: tuple) -> list[dict]:
    from database.db import db_connection

    with db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(sql, params)
            return list(cur.fetchall())


def _scan_add(client, user, barcode: str, name: str) -> dict:
    response = client.post(
        f"/api/barcode/{barcode}",
        headers=user["headers"],
        json={"name": name, "quantity": 2, "unit": "cans", "category": "pantry"},
    )
    assert response.status_code == 201, response.text
    return response.json()["item"]


def _barcode() -> str:
    return f"8{uuid.uuid4().int % 10**12:012d}"


def test_remove_keeps_history_and_product_cache(client):
    user = make_user()
    barcode = _barcode()
    item = _scan_add(client, user, barcode, "PP176 Cream of Mushroom")

    used = client.post(
        "/api/activities",
        headers=user["headers"],
        json={"itemId": item["id"], "type": "REMOVE", "amount": 1, "source": "MANUAL"},
    )
    assert used.status_code == 201, used.text
    before = _query("SELECT id FROM activities WHERE user_id = %s", (user["id"],))
    assert len(before) == 2  # barcode add + one use

    removed = client.delete(f"/api/items/{item['id']}", headers=user["headers"])
    assert removed.status_code == 200, removed.text

    assert _query("SELECT id FROM pantry_items WHERE id = %s", (item["id"],)) == []
    rows = _query(
        "SELECT id, item_id, item_name, item_barcode, type, amount, metadata FROM activities WHERE user_id = %s",
        (user["id"],),
    )
    # Earlier history survives, unlinked but still traceable by barcode and name.
    assert {r["id"] for r in before} <= {r["id"] for r in rows}
    assert len(rows) == 3
    assert all(r["item_id"] is None for r in rows)
    assert all(r["item_barcode"] == barcode for r in rows)
    assert all(r["item_name"] == "PP176 Cream of Mushroom" for r in rows)
    [removal] = [r for r in rows if r["type"] == "DELETE"]
    assert float(removal["amount"]) == 1.0  # had 2, used 1
    assert "removed_from_pantry" in str(removal["metadata"])

    # The shared product database keeps the product.
    assert len(_query("SELECT barcode FROM product_cache WHERE barcode = %s", (barcode,))) == 1

    listed = client.get("/api/activities?limit=100", headers=user["headers"])
    assert listed.status_code == 200, listed.text
    assert len(listed.json()["data"]) == 3


def test_remove_only_touches_the_owners_row(client):
    owner = make_user()
    other = make_user()
    barcode = _barcode()
    mine = _scan_add(client, owner, barcode, "PP176 Shared Soup")
    theirs = _scan_add(client, other, barcode, "PP176 Shared Soup")

    # Another user cannot remove it.
    denied = client.delete(f"/api/items/{mine['id']}", headers=other["headers"])
    assert denied.status_code == 404, denied.text
    assert len(_query("SELECT id FROM pantry_items WHERE id = %s", (mine["id"],))) == 1

    assert client.delete(f"/api/items/{mine['id']}", headers=owner["headers"]).status_code == 200
    assert len(_query("SELECT id FROM pantry_items WHERE id = %s", (theirs["id"],))) == 1
    theirs_history = _query("SELECT item_id FROM activities WHERE user_id = %s", (other["id"],))
    assert theirs_history and all(r["item_id"] == theirs["id"] for r in theirs_history)


def test_removing_last_group_member_drops_the_empty_group(client):
    user = make_user()
    a = _scan_add(client, user, _barcode(), "PP176 Chicken Noodle A")
    b = _scan_add(client, user, _barcode(), "PP176 Chicken Noodle B")
    created = client.post(
        "/api/item-groups",
        headers=user["headers"],
        json={"name": "PP176 Chicken Noodle", "itemIds": [a["id"], b["id"]], "targetQuantity": 4},
    )
    assert created.status_code == 201, created.text
    group_id = created.json()["data"]["id"]

    assert client.delete(f"/api/items/{a['id']}", headers=user["headers"]).status_code == 200
    assert len(_query("SELECT id FROM item_groups WHERE id = %s", (group_id,))) == 1

    assert client.delete(f"/api/items/{b['id']}", headers=user["headers"]).status_code == 200
    assert _query("SELECT id FROM item_groups WHERE id = %s", (group_id,)) == []
