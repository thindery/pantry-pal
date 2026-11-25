"""PP-178: Send to Instacart (Beta). The Instacart HTTP call is mocked; no network, no real key."""

from __future__ import annotations

import asyncio

import httpx
import pytest

from backend.services import instacart_service


def run(items):
    return asyncio.run(instacart_service.create_shopping_list_link(items))

URL = "https://customer-dev.instacart.tools/store/shopping_lists/123"
ITEMS = [
    {"name": "Whole milk", "quantity": 2, "unit": "cans", "upc": "036000291452"},
    {"name": "Flour", "quantity": 2.5, "unit": "lbs"},
]


@pytest.fixture(autouse=True)
def _clean(monkeypatch):
    monkeypatch.delenv(instacart_service.ENV_API_KEY, raising=False)
    monkeypatch.delenv(instacart_service.ENV_API_BASE, raising=False)
    instacart_service.clear_cache()
    yield
    instacart_service.clear_cache()


class FakeClient:
    """Stands in for httpx.AsyncClient. Records calls on the class."""

    calls: list[dict] = []
    response: httpx.Response | Exception = httpx.Response(200, json={"products_link_url": URL})

    def __init__(self, *args, **kwargs):
        pass

    async def __aenter__(self):
        return self

    async def __aexit__(self, *exc):
        return False

    async def post(self, url, json=None, headers=None):
        FakeClient.calls.append({"url": url, "json": json, "headers": headers})
        if isinstance(FakeClient.response, Exception):
            raise FakeClient.response
        return FakeClient.response


@pytest.fixture
def fake(monkeypatch):
    FakeClient.calls = []
    FakeClient.response = httpx.Response(200, json={"products_link_url": URL})
    monkeypatch.setattr(instacart_service.httpx, "AsyncClient", FakeClient)
    return FakeClient


@pytest.fixture
def keyed(monkeypatch):
    monkeypatch.setenv(instacart_service.ENV_API_KEY, "test-key-not-real")


# ---- pure helpers -------------------------------------------------------------------


def test_unit_mapping_uses_only_supported_units():
    assert instacart_service.normalize_unit("lbs") == "lb"
    assert instacart_service.normalize_unit("OZ") == "ounce"
    assert instacart_service.normalize_unit("cans") == "can"
    assert instacart_service.normalize_unit("boxes") == "package"
    assert instacart_service.normalize_unit("bottles") == "each"
    assert instacart_service.normalize_unit("other") == "each"
    assert instacart_service.normalize_unit("furlongs") == "each"
    assert instacart_service.normalize_unit(None) == "each"


def test_upc_normalization():
    assert instacart_service.normalize_upc("036000291452") == "036000291452"
    assert instacart_service.normalize_upc("0036000291452") == "036000291452"  # UPC-A as EAN-13
    assert instacart_service.normalize_upc("00036000291452") == "00036000291452"  # 14 digits
    assert instacart_service.normalize_upc("5449000000996") is None  # real EAN-13, not a UPC
    assert instacart_service.normalize_upc("12345") is None
    assert instacart_service.normalize_upc("") is None
    assert instacart_service.normalize_upc(None) is None


def test_line_items_have_measurements_and_optional_upc():
    items = instacart_service.build_line_items(ITEMS)
    assert items[0] == {
        "name": "Whole milk",
        "line_item_measurements": [{"quantity": 2.0, "unit": "can"}],
        "upcs": ["036000291452"],
    }
    assert items[1] == {
        "name": "Flour",
        "line_item_measurements": [{"quantity": 2.5, "unit": "lb"}],
    }


def test_blank_names_dropped_bad_quantity_defaults_and_duplicate_upc_sent_once():
    items = instacart_service.build_line_items(
        [
            {"name": "   ", "quantity": 1},
            {"name": "Eggs", "quantity": -3, "unit": "units", "upc": "036000291452"},
            {"name": "More eggs", "quantity": "abc", "upc": "036000291452"},
        ]
    )
    assert [i["name"] for i in items] == ["Eggs", "More eggs"]
    assert items[0]["line_item_measurements"] == [{"quantity": 1.0, "unit": "each"}]
    assert items[0]["upcs"] == ["036000291452"]
    assert "upcs" not in items[1]  # Instacart rejects duplicate UPCs across line items


def test_payload_shape_has_title_link_type_and_linkback_but_no_affiliate_params():
    payload = instacart_service.build_payload(instacart_service.build_line_items(ITEMS))
    assert payload["title"] == "My Pantry Hub list"
    assert payload["link_type"] == "shopping_list"
    assert payload["landing_page_configuration"]["partner_linkback_url"].startswith(
        "https://www.mypantryhub.com"
    )
    flat = repr(payload).lower()
    assert "aff" not in flat and "offer_id" not in flat


# ---- service ------------------------------------------------------------------------


def test_flag_off_without_key():
    assert instacart_service.is_enabled() is False


def test_api_base_defaults_to_dev_and_can_be_overridden(monkeypatch):
    assert instacart_service.api_base() == "https://connect.dev.instacart.tools"
    monkeypatch.setenv(instacart_service.ENV_API_BASE, "https://connect.instacart.com/")
    assert instacart_service.api_base() == "https://connect.instacart.com"


def test_posts_to_products_link_with_bearer_key(keyed, fake):
    result = run(ITEMS)
    assert result == {"url": URL, "itemCount": 2, "cached": False}
    (call,) = fake.calls
    assert call["url"] == "https://connect.dev.instacart.tools/idp/v1/products/products_link"
    assert call["headers"]["Authorization"] == "Bearer test-key-not-real"
    assert call["json"]["link_type"] == "shopping_list"
    assert len(call["json"]["line_items"]) == 2


def test_uses_prod_base_when_configured(keyed, fake, monkeypatch):
    monkeypatch.setenv(instacart_service.ENV_API_BASE, "https://connect.instacart.com")
    run(ITEMS)
    assert fake.calls[0]["url"] == "https://connect.instacart.com/idp/v1/products/products_link"


def test_same_list_is_cached_changed_list_is_not(keyed, fake):
    first = run(ITEMS)
    second = run(list(ITEMS))
    assert first["cached"] is False and second["cached"] is True
    assert len(fake.calls) == 1
    run(ITEMS + [{"name": "Rice", "quantity": 1}])
    assert len(fake.calls) == 2


def test_upstream_error_is_not_cached_and_hides_details(keyed, fake):
    fake.response = httpx.Response(400, json={"error": {"message": "secret detail"}})
    with pytest.raises(instacart_service.InstacartError) as err:
        run(ITEMS)
    assert "secret detail" not in str(err.value)
    fake.response = httpx.Response(200, json={"products_link_url": URL})
    ok = run(ITEMS)
    assert ok["cached"] is False


def test_network_error_and_bad_body_raise(keyed, fake):
    fake.response = httpx.ConnectTimeout("slow")
    with pytest.raises(instacart_service.InstacartError):
        run(ITEMS)
    fake.response = httpx.Response(200, json={"nope": 1})
    with pytest.raises(instacart_service.InstacartError):
        run(ITEMS)
    fake.response = httpx.Response(200, json={"products_link_url": "http://insecure.example"})
    with pytest.raises(instacart_service.InstacartError):
        run(ITEMS)


# ---- routes -------------------------------------------------------------------------


def test_status_requires_auth(client):
    assert client.get("/api/instacart/status").status_code == 401


def test_status_disabled_without_key(client, auth_headers):
    res = client.get("/api/instacart/status", headers=auth_headers)
    assert res.status_code == 200
    assert res.json()["data"]["enabled"] is False


def test_status_enabled_never_leaks_key(client, auth_headers, keyed):
    res = client.get("/api/instacart/status", headers=auth_headers)
    assert res.json()["data"]["enabled"] is True
    assert "test-key-not-real" not in res.text


def test_post_is_404_without_key_and_makes_no_call(client, auth_headers, fake):
    res = client.post("/api/instacart/shopping-list", json={"items": ITEMS}, headers=auth_headers)
    assert res.status_code == 404
    assert fake.calls == []


def test_post_requires_auth(client, keyed, fake):
    res = client.post("/api/instacart/shopping-list", json={"items": ITEMS})
    assert res.status_code == 401
    assert fake.calls == []


def test_post_returns_link(client, auth_headers, keyed, fake):
    res = client.post("/api/instacart/shopping-list", json={"items": ITEMS}, headers=auth_headers)
    assert res.status_code == 200
    assert res.json()["data"] == {"url": URL, "itemCount": 2}
    assert "test-key-not-real" not in res.text


def test_post_validates_body(client, auth_headers, keyed, fake):
    assert client.post("/api/instacart/shopping-list", json={"items": []}, headers=auth_headers).status_code == 422
    bad = {"items": [{"name": "x", "quantity": 0}]}
    assert client.post("/api/instacart/shopping-list", json=bad, headers=auth_headers).status_code == 422
    assert fake.calls == []


def test_post_upstream_failure_is_502(client, auth_headers, keyed, fake):
    fake.response = httpx.Response(500, text="boom")
    res = client.post("/api/instacart/shopping-list", json={"items": ITEMS}, headers=auth_headers)
    assert res.status_code == 502
    assert res.json()["error"]["code"] == "INSTACART_ERROR"
