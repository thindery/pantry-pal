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