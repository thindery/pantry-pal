"""PP-164: weekly-ad hub (link-out).
PP-179: favorite stores per ZIP code.
Unit tests plus Postgres tests on the seeded table.
"""

from __future__ import annotations

import os
import uuid
from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest

from backend.services import weekly_ads


@pytest.mark.parametrize(
    "raw,expected",
    [("65804", "65804"), (" 65804 ", "65804"), ("65804-1234", "65804"), ("6580", None), ("abcde", None), ("", None), (None, None)],
)
def test_normalize_zip(raw, expected):
    assert weekly_ads.normalize_zip(raw) == expected


def test_requires_auth(client):
    assert client.get("/api/weekly-ads?zip=65804").status_code == 401
    assert client.put("/api/weekly-ads/favorites/65804/sgf-aldi").status_code == 401
    assert client.delete("/api/weekly-ads/favorites/65804/sgf-aldi").status_code == 401


def test_rejects_bad_zip(client, auth_headers):
    assert client.get("/api/weekly-ads?zip=12", headers=auth_headers).status_code == 400
    assert client.put("/api/weekly-ads/favorites/12/sgf-aldi", headers=auth_headers).status_code == 400
    assert client.delete("/api/weekly-ads/favorites/12/sgf-aldi", headers=auth_headers).status_code == 400
    assert client.put("/api/weekly-ads/favorites/abcde/sgf-aldi", headers=auth_headers).status_code == 400


def test_passes_clean_zip_to_lookup(client, auth_headers):
    fake = {"zip": "65804", "covered": False, "stores": [], "fallback": []}
    with patch.object(weekly_ads, "stores_for_zip", return_value=fake) as lookup:
        r = client.get("/api/weekly-ads?zip=65804-0001", headers=auth_headers)
    assert r.status_code == 200
    lookup.assert_called_once_with("65804", user_id="test_user_contract_001")
    assert r.json()["data"] == fake


def test_favorite_unknown_or_inactive_store_returns_404(client, auth_headers):
    with patch.object(weekly_ads, "store_applies_to_zip", return_value=False):
        assert client.put("/api/weekly-ads/favorites/65804/nonexistent", headers=auth_headers).status_code == 404
        assert client.delete("/api/weekly-ads/favorites/65804/nonexistent", headers=auth_headers).status_code == 404


def test_star_and_unstar_endpoint_idempotency(client, auth_headers):
    with (
        patch.object(weekly_ads, "store_applies_to_zip", return_value=True),
        patch.object(weekly_ads, "add_favorite") as mock_add,
        patch.object(weekly_ads, "remove_favorite") as mock_remove,
    ):
        # Star first time
        r1 = client.put("/api/weekly-ads/favorites/65804/sgf-aldi", headers=auth_headers)
        assert r1.status_code == 200
        assert r1.json()["data"]["isFavorite"] is True

        # Star second time (idempotent)
        r2 = client.put("/api/weekly-ads/favorites/65804/sgf-aldi", headers=auth_headers)
        assert r2.status_code == 200
        assert r2.json()["data"]["isFavorite"] is True
        assert mock_add.call_count == 2

        # Unstar first time
        r3 = client.delete("/api/weekly-ads/favorites/65804/sgf-aldi", headers=auth_headers)
        assert r3.status_code == 200
        assert r3.json()["data"]["isFavorite"] is False

        # Unstar second time (idempotent)
        r4 = client.delete("/api/weekly-ads/favorites/65804/sgf-aldi", headers=auth_headers)
        assert r4.status_code == 200
        assert r4.json()["data"]["isFavorite"] is False
        assert mock_remove.call_count == 2


def test_store_applies_to_zip_service_logic():
    # 1. Fallback store
    mock_cursor = MagicMock()
    mock_cursor.fetchone.return_value = (1,)
    mock_conn = MagicMock()
    mock_conn.cursor.return_value.__enter__.return_value = mock_cursor

    with patch.object(weekly_ads, "db_connection") as mock_db:
        mock_db.return_value.__enter__.return_value = mock_conn
        assert weekly_ads.store_applies_to_zip("national-walmart", "65804") is True

    # 2. Unknown store returns False
    mock_cursor.fetchone.return_value = None
    with patch.object(weekly_ads, "db_connection") as mock_db:
        mock_db.return_value.__enter__.return_value = mock_conn
        assert weekly_ads.store_applies_to_zip("unknown", "65804") is False


def test_service_per_zip_and_per_user_isolation():
    mock_cursor = MagicMock()
    # When user query runs, return store 'sgf-aldi' as favorite for user_1 and 65804
    mock_cursor.fetchall.side_effect = [
        [{"store_id": "sgf-aldi"}],  # favorite_ids query
        [{"id": "sgf-aldi", "chain": "ALDI", "name": "ALDI", "weekly_ad_url": "https://aldi.us", "note": None}],  # stores query
    ]
    mock_conn = MagicMock()
    mock_conn.cursor.return_value.__enter__.return_value = mock_cursor

    with patch.object(weekly_ads, "db_connection") as mock_db:
        mock_db.return_value.__enter__.return_value = mock_conn
        res = weekly_ads.stores_for_zip("65804", user_id="user_1")

    assert res["stores"][0]["id"] == "sgf-aldi"
    assert res["stores"][0]["isFavorite"] is True

    # Verify SQL query checked user_id and zip
    first_call_args = mock_cursor.execute.call_args_list[0]
    assert "weekly_ad_store_favorites" in first_call_args[0][0]
    assert first_call_args[0][1] == ("user_1", "65804")


def test_migration_033_sql_structure():
    migration_path = Path("database/migrations/033_weekly_ad_store_favorites.sql")
    rollback_path = Path("database/migrations/033_weekly_ad_store_favorites.rollback.sql")
    assert migration_path.exists()
    assert rollback_path.exists()

    sql = migration_path.read_text()
    assert "weekly_ad_store_favorites" in sql
    assert "REFERENCES users(id) ON DELETE CASCADE" in sql
    assert "REFERENCES weekly_ad_stores(id) ON DELETE CASCADE" in sql
    assert "PRIMARY KEY (user_id, zip, store_id)" in sql
    assert "idx_weekly_ad_store_favorites_user_zip" in sql

    rollback_sql = rollback_path.read_text()
    assert "DROP TABLE IF EXISTS weekly_ad_store_favorites;" in rollback_sql


pg = pytest.mark.skipif(
    os.environ.get("RUN_POSTGRES_TESTS") != "1",
    reason="Set RUN_POSTGRES_TESTS=1 and DATABASE_URL to run",
)


@pytest.fixture(scope="module")
def migrated():
    from database.migrate import migrate

    migrate()


@pg
def test_springfield_zip_gets_seeded_local_stores(migrated):
    result = weekly_ads.stores_for_zip("65804")
    assert result["covered"] is True
    assert result["fallback"] == []
    chains = {s["chain"] for s in result["stores"]}
    assert {"ALDI", "Walmart", "King Food Saver", "Cash Saver", "Harter House"} <= chains
    urls = {s["weeklyAdUrl"] for s in result["stores"]}
    assert "https://www.kingfoodsaver.com/weekly-ad" in urls
    assert "https://www.cashsaver417.com/weekly-ad/" in urls
    assert "https://harterhouseeastgate.net/ads" in urls
    assert "https://www.walmart.com/store/2221-springfield-mo/weekly-ads" in urls
    assert all(u.startswith("https://") for u in urls)


@pg
def test_uncovered_zip_gets_only_national_fallback(migrated):
    result = weekly_ads.stores_for_zip("10001")
    assert result["covered"] is False
    assert result["stores"] == []
    assert [s["chain"] for s in result["fallback"]] == ["Walmart", "ALDI", "Kroger"]


@pg
def test_new_area_is_data_only(migrated):
    from database.db import db_connection

    with db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO weekly_ad_stores (id, chain, name, zip_prefixes, weekly_ad_url)
                VALUES ('test-area-store', 'Test Mart', 'Test Mart', ARRAY['99999'], 'https://example.com/ad')
                ON CONFLICT (id) DO NOTHING
                """
            )
    try:
        result = weekly_ads.stores_for_zip("99999")
        assert result["covered"] is True
        assert [s["name"] for s in result["stores"]] == ["Test Mart"]
        assert weekly_ads.stores_for_zip("99998")["covered"] is False
    finally:
        with db_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("DELETE FROM weekly_ad_stores WHERE id = 'test-area-store'")


@pg
def test_favorites_postgres_isolation_and_cascade(migrated):
    from database.db import db_connection

    user_1 = str(uuid.uuid4())
    user_2 = str(uuid.uuid4())
    store_id = "sgf-aldi"

    with db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "INSERT INTO users (id, name, email) VALUES (%s, %s, %s), (%s, %s, %s)",
                (user_1, "User One", f"{user_1}@test.com", user_2, "User Two", f"{user_2}@test.com"),
            )

    try:
        # Star store in 65804 for user 1
        weekly_ads.add_favorite(user_1, "65804", store_id)

        # Idempotent star
        weekly_ads.add_favorite(user_1, "65804", store_id)

        # User 1 in 65804 has store as favorite
        res1 = weekly_ads.stores_for_zip("65804", user_id=user_1)
        aldi_1 = next(s for s in res1["stores"] if s["id"] == store_id)
        assert aldi_1["isFavorite"] is True

        # Per-ZIP isolation: User 1 in 65810 (where sgf-aldi is also local) or different zip
        # sgf-aldi is active for 656, 657, 658. Let's check another zip like 65601
        res1_diff_zip = weekly_ads.stores_for_zip("65601", user_id=user_1)
        aldi_diff = next(s for s in res1_diff_zip["stores"] if s["id"] == store_id)
        assert aldi_diff["isFavorite"] is False

        # Per-user isolation: User 2 in 65804 does NOT have store as favorite
        res2 = weekly_ads.stores_for_zip("65804", user_id=user_2)
        aldi_2 = next(s for s in res2["stores"] if s["id"] == store_id)
        assert aldi_2["isFavorite"] is False

        # Unstar store for user 1
        weekly_ads.remove_favorite(user_1, "65804", store_id)
        weekly_ads.remove_favorite(user_1, "65804", store_id)  # idempotent

        res1_unstarred = weekly_ads.stores_for_zip("65804", user_id=user_1)
        aldi_unstarred = next(s for s in res1_unstarred["stores"] if s["id"] == store_id)
        assert aldi_unstarred["isFavorite"] is False

        # Test cascade on user delete:
        weekly_ads.add_favorite(user_1, "65804", store_id)
        with db_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT COUNT(*) as c FROM weekly_ad_store_favorites WHERE user_id = %s", (user_1,))
                assert cur.fetchone()["c"] == 1

                # Delete user 1
                cur.execute("DELETE FROM users WHERE id = %s", (user_1,))

                # Cascaded delete in weekly_ad_store_favorites
                cur.execute("SELECT COUNT(*) as c FROM weekly_ad_store_favorites WHERE user_id = %s", (user_1,))
                assert cur.fetchone()["c"] == 0

    finally:
        with db_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("DELETE FROM weekly_ad_store_favorites WHERE user_id IN (%s, %s)", (user_1, user_2))
                cur.execute("DELETE FROM users WHERE id IN (%s, %s)", (user_1, user_2))
