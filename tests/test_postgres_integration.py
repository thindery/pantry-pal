"""PostgreSQL integration tests (PP-019). Run with RUN_POSTGRES_TESTS=1."""

import os
import uuid

import pytest

pytestmark = pytest.mark.skipif(
    os.environ.get("RUN_POSTGRES_TESTS") != "1",
    reason="Set RUN_POSTGRES_TESTS=1 and DATABASE_URL to run",
)


def test_migrations_apply():
    from database.migrate import migrate

    migrate()


def test_item_crud_roundtrip(client, auth_headers):
    name = f"integration-{uuid.uuid4().hex[:8]}"

    create = client.post(
        "/api/items",
        json={"name": name, "quantity": 3, "unit": "pieces", "category": "produce"},
        headers=auth_headers,
    )
    assert create.status_code == 201, create.text
    item_id = create.json()["data"]["id"]

    listed = client.get("/api/items", headers=auth_headers)
    assert listed.status_code == 200
    ids = [i["id"] for i in listed.json()["data"]]
    assert item_id in ids

    updated = client.put(
        f"/api/items/{item_id}",
        json={"quantity": 5},
        headers=auth_headers,
    )
    assert updated.status_code == 200
    assert updated.json()["data"]["quantity"] == 5

    deleted = client.delete(f"/api/items/{item_id}", headers=auth_headers)
    assert deleted.status_code == 200


def test_barcode_save_logs_barcode_scan_activity(client, auth_headers):
    """Barcode add must log BARCODE_SCAN without tripping activities.source CHECK."""
    barcode = f"9{uuid.uuid4().int % 10**12:012d}"

    response = client.post(
        f"/api/barcode/{barcode}",
        headers=auth_headers,
        json={
            "name": "Scan Test Product",
            "quantity": 1,
            "unit": "units",
            "category": "snacks",
        },
    )
    assert response.status_code == 201, response.text
    data = response.json()
    assert data["success"] is True
    assert data["item"]["barcode"] == barcode
    assert data["activity"]["source"] == "BARCODE_SCAN"

    try:
        deleted = client.delete(f"/api/items/{data['item']['id']}", headers=auth_headers)
        assert deleted.status_code == 200
    except Exception:
        pass