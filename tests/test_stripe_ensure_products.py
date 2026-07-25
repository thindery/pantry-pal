"""Idempotent Stripe product/price provisioning tests."""

from __future__ import annotations

from types import SimpleNamespace
from unittest.mock import patch

import backend.services.stripe_service as stripe_service


class _ListResult:
    def __init__(self, data):
        self.data = data

    def auto_paging_iter(self):
        return iter(self.data)


def _reset_price_ids():
    for tier in ("pro", "family"):
        for interval in ("month", "year"):
            stripe_service.PRICE_IDS[tier][interval] = ""


def test_ensure_skips_without_api_key(monkeypatch):
    monkeypatch.setattr(stripe_service.stripe, "api_key", "")
    with patch.object(stripe_service.stripe.Product, "list") as mock_list:
        stripe_service.ensure_stripe_products()
        mock_list.assert_not_called()


def test_ensure_reuses_existing_lookup_keys_no_create(monkeypatch):
    monkeypatch.setattr(stripe_service.stripe, "api_key", "sk_test_real_key")
    _reset_price_ids()

    products = [
        SimpleNamespace(
            id="prod_pro",
            name="Pantry Hub Pro",
            metadata={"app": "pantry_hub", "tier": "pro"},
        ),
        SimpleNamespace(
            id="prod_family",
            name="Pantry Hub Family",
            metadata={"app": "pantry_hub", "tier": "family"},
        ),
    ]

    prices_by_lookup = {
        "pantry_hub_pro_month": SimpleNamespace(
            id="price_pro_m",
            lookup_key="pantry_hub_pro_month",
            recurring=SimpleNamespace(interval="month"),
            product="prod_pro",
        ),
        "pantry_hub_pro_year": SimpleNamespace(
            id="price_pro_y",
            lookup_key="pantry_hub_pro_year",
            recurring=SimpleNamespace(interval="year"),
            product="prod_pro",
        ),
        "pantry_hub_family_month": SimpleNamespace(
            id="price_fam_m",
            lookup_key="pantry_hub_family_month",
            recurring=SimpleNamespace(interval="month"),
            product="prod_family",
        ),
        "pantry_hub_family_year": SimpleNamespace(
            id="price_fam_y",
            lookup_key="pantry_hub_family_year",
            recurring=SimpleNamespace(interval="year"),
            product="prod_family",
        ),
    }

    def list_prices(**kwargs):
        keys = kwargs.get("lookup_keys") or []
        if keys:
            key = keys[0]
            data = [prices_by_lookup[key]] if key in prices_by_lookup else []
            return _ListResult(data)
        return _ListResult([])

    with (
        patch.object(stripe_service.stripe.Product, "list", return_value=_ListResult(products)),
        patch.object(stripe_service.stripe.Product, "create") as mock_prod_create,
        patch.object(stripe_service.stripe.Price, "list", side_effect=list_prices),
        patch.object(stripe_service.stripe.Price, "create") as mock_price_create,
        patch.object(stripe_service.stripe.Product, "modify"),
    ):
        result = stripe_service.ensure_stripe_products()

    mock_prod_create.assert_not_called()
    mock_price_create.assert_not_called()
    assert result["pro"]["monthly"] == "price_pro_m"
    assert result["pro"]["yearly"] == "price_pro_y"
    assert result["family"]["monthly"] == "price_fam_m"
    assert result["family"]["yearly"] == "price_fam_y"


def test_ensure_creates_once_when_missing(monkeypatch):
    monkeypatch.setattr(stripe_service.stripe, "api_key", "sk_test_real_key")
    _reset_price_ids()

    created_products: list[str] = []
    created_prices: list[str] = []
    state: dict = {"products": [], "prices": {}}

    def list_products(**_kwargs):
        return _ListResult(state["products"])

    def create_product(**kwargs):
        created_products.append(kwargs["name"])
        p = SimpleNamespace(
            id=f"prod_{kwargs['metadata']['tier']}",
            name=kwargs["name"],
            metadata=kwargs["metadata"],
        )
        state["products"].append(p)
        return p

    def list_prices(**kwargs):
        keys = kwargs.get("lookup_keys") or []
        if keys:
            key = keys[0]
            data = state["prices"].get(key, [])
            return _ListResult(data)
        product = kwargs.get("product")
        data = [
            p
            for prices in state["prices"].values()
            for p in prices
            if getattr(p, "product", None) == product
        ]
        return _ListResult(data)

    def create_price(**kwargs):
        created_prices.append(kwargs["lookup_key"])
        p = SimpleNamespace(
            id=f"price_{kwargs['lookup_key']}",
            lookup_key=kwargs["lookup_key"],
            product=kwargs["product"],
            recurring=SimpleNamespace(interval=kwargs["recurring"]["interval"]),
        )
        state["prices"].setdefault(kwargs["lookup_key"], []).append(p)
        return p

    with (
        patch.object(stripe_service.stripe.Product, "list", side_effect=list_products),
        patch.object(stripe_service.stripe.Product, "create", side_effect=create_product),
        patch.object(stripe_service.stripe.Price, "list", side_effect=list_prices),
        patch.object(stripe_service.stripe.Price, "create", side_effect=create_price),
        patch.object(stripe_service.stripe.Product, "modify"),
    ):
        first = stripe_service.ensure_stripe_products()
        second = stripe_service.ensure_stripe_products()

    assert len(created_products) == 2
    assert len(created_prices) == 4
    assert first == second
    assert first["pro"]["monthly"].startswith("price_")
