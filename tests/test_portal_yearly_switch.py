"""PP-247: portal configuration and the switch-to-yearly flag."""

from __future__ import annotations

from unittest.mock import patch

from backend.services import stripe_service, subscription_service


def _env(monkeypatch, config="bpc_test"):
    monkeypatch.setenv("STRIPE_PRO_MONTHLY_PRICE_ID", "price_m")
    monkeypatch.setenv("STRIPE_PRO_YEARLY_PRICE_ID", "price_y")
    if config is None:
        monkeypatch.delenv("STRIPE_PORTAL_CONFIGURATION_ID", raising=False)
    else:
        monkeypatch.setenv("STRIPE_PORTAL_CONFIGURATION_ID", config)


def test_interval_for_price(monkeypatch):
    _env(monkeypatch)
    assert subscription_service.billing_interval_for_price("price_m") == "month"
    assert subscription_service.billing_interval_for_price("price_y") == "year"
    assert subscription_service.billing_interval_for_price("price_other") is None
    assert subscription_service.billing_interval_for_price(None) is None


def test_yearly_switch_only_for_active_monthly_pro_with_config(monkeypatch):
    _env(monkeypatch)
    base = {"tier": "pro", "subscriptionStatus": "active", "cancelAtPeriodEnd": False, "stripePriceId": "price_m"}
    assert subscription_service._yearly_switch_available(base) is True
    assert subscription_service._yearly_switch_available({**base, "stripePriceId": "price_y"}) is False
    assert subscription_service._yearly_switch_available({**base, "cancelAtPeriodEnd": True}) is False
    assert subscription_service._yearly_switch_available({**base, "subscriptionStatus": "past_due"}) is False
    assert subscription_service._yearly_switch_available({**base, "tier": "free"}) is False
    _env(monkeypatch, config=None)
    assert subscription_service._yearly_switch_available(base) is False


def test_portal_session_uses_configuration_only_when_set(monkeypatch):
    _env(monkeypatch)
    with patch.object(stripe_service.stripe.billing_portal.Session, "create") as create:
        create.return_value = type("S", (), {"url": "https://billing.example/x", "id": "bps_1"})()
        stripe_service._portal_redirect("cus_1", "https://www.mypantryhub.com/dashboard/account/")
        assert create.call_args.kwargs["configuration"] == "bpc_test"
    _env(monkeypatch, config=None)
    with patch.object(stripe_service.stripe.billing_portal.Session, "create") as create:
        create.return_value = type("S", (), {"url": "https://billing.example/x", "id": "bps_1"})()
        stripe_service._portal_redirect("cus_1", "https://www.mypantryhub.com/dashboard/account/")
        assert "configuration" not in create.call_args.kwargs
