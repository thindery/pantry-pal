"""PP-164: weekly-ad hub (link-out). Unit tests plus Postgres tests on the seeded table."""

from __future__ import annotations

import os
from unittest.mock import patch

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


def test_rejects_bad_zip(client, auth_headers):
    r = client.get("/api/weekly-ads?zip=12", headers=auth_headers)
    assert r.status_code == 400


def test_passes_clean_zip_to_lookup(client, auth_headers):
    fake = {"zip": "65804", "covered": False, "stores": [], "fallback": []}
    with patch.object(weekly_ads, "stores_for_zip", return_value=fake) as lookup:
        r = client.get("/api/weekly-ads?zip=65804-0001", headers=auth_headers)
    assert r.status_code == 200
    lookup.assert_called_once_with("65804")
    assert r.json()["data"] == fake


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
