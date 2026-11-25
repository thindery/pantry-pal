"""PP-166: $1 first-month offer on Pro monthly. Stripe is mocked (test-mode key unavailable)."""

from __future__ import annotations

import asyncio
from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest

from backend.services import first_month_offer, stripe_service

SUCCESS = "https://www.mypantryhub.com/checkout/success"
CANCEL = "https://www.mypantryhub.com/checkout/cancel"
PRICES = {
    "pro": {"month": "price_pro_m", "year": "price_pro_y"},
    "family": {"month": "price_fam_m", "year": "price_fam_y"},
}


@pytest.fixture(autouse=True)
def _clear_offer_env(monkeypatch):
    monkeypatch.delenv(first_month_offer.ENV_COUPON_ID, raising=False)


def _checkout(tier="pro", interval="month", existing=None, ever_subscribed=False, open_session=None):
    """Run create_checkout_session with Stripe mocked. Returns the Session.create mock."""
    created = MagicMock()
    created.url = "https://checkout.stripe.test/c/1"
    created.id = "cs_test_1"
    with patch.dict("backend.services.stripe_service.PRICE_IDS", PRICES, clear=False), patch(
        "backend.services.stripe_service.get_user_subscription",
        return_value=existing,
    ), patch("backend.services.stripe_service.update_user_subscription"), patch(
        "backend.services.stripe_service._create_customer", return_value="cus_new"
    ), patch("backend.services.stripe_service._ensure_customer_email"), patch(
        "backend.services.stripe_service._first_active_subscription", return_value=None
    ), patch(
        "backend.services.stripe_service._has_ever_subscribed", return_value=ever_subscribed
    ), patch(
        "backend.services.stripe_service._open_checkout_session", return_value=open_session
    ) as open_mock, patch(
        "backend.services.stripe_service.stripe.checkout.Session.create", return_value=created
    ) as create_mock:
        result = asyncio.run(stripe_service.create_checkout_session("user-1", tier, interval, SUCCESS, CANCEL))
    return result, create_mock, open_mock


# ---- config ----


def test_offer_off_by_default():
    assert first_month_offer.coupon_id() is None
    assert first_month_offer.is_enabled() is False
    assert first_month_offer.public_offer() == {"enabled": False}


def test_blank_coupon_env_is_off(monkeypatch):
    monkeypatch.setenv(first_month_offer.ENV_COUPON_ID, "   ")
    assert first_month_offer.is_enabled() is False


def test_public_offer_never_exposes_coupon_id(monkeypatch):
    monkeypatch.setenv(first_month_offer.ENV_COUPON_ID, "COUPON_SECRET_ID")
    offer = first_month_offer.public_offer()
    assert offer["enabled"] is True
    assert offer["listPriceCents"] == 499 and offer["offerPriceCents"] == 100 and offer["discountCents"] == 399
    assert "COUPON_SECRET_ID" not in str(offer)


def test_coupon_applies_to_pro_monthly_only(monkeypatch):
    monkeypatch.setenv(first_month_offer.ENV_COUPON_ID, "FIRST1")
    assert first_month_offer.coupon_for("pro", "month") == "FIRST1"
    assert first_month_offer.coupon_for("pro", "year") is None
    assert first_month_offer.coupon_for("family", "month") is None
    assert first_month_offer.coupon_for("family", "year") is None


# ---- checkout ----


def test_offer_unset_checkout_is_exactly_as_before():
    _, create_mock, open_mock = _checkout()
    kwargs = create_mock.call_args.kwargs
    assert kwargs["allow_promotion_codes"] is True
    assert "discounts" not in kwargs
    assert kwargs["metadata"] == {"userId": "user-1", "tier": "pro"}
    assert kwargs["subscription_data"] == {"metadata": {"userId": "user-1", "tier": "pro"}}
    assert kwargs["idempotency_key"] == stripe_service.checkout_idempotency_key("user-1", "pro", "month", SUCCESS, CANCEL)
    assert open_mock.call_args.args[2] == ""


def test_pro_monthly_with_offer_applies_coupon(monkeypatch):
    monkeypatch.setenv(first_month_offer.ENV_COUPON_ID, "FIRST1")
    result, create_mock, open_mock = _checkout()
    kwargs = create_mock.call_args.kwargs
    assert kwargs["discounts"] == [{"coupon": "FIRST1"}]
    # Stripe rejects discounts + allow_promotion_codes together.
    assert "allow_promotion_codes" not in kwargs
    assert kwargs["line_items"] == [{"price": "price_pro_m", "quantity": 1}]
    assert kwargs["metadata"]["offer"] == first_month_offer.OFFER_MARKER
    assert kwargs["subscription_data"]["metadata"]["offer"] == first_month_offer.OFFER_MARKER
    assert kwargs["idempotency_key"] == stripe_service.checkout_idempotency_key("user-1", "pro", "month", SUCCESS, CANCEL) + "-offer-FIRST1"
    assert open_mock.call_args.args[2] == first_month_offer.OFFER_MARKER
    assert result["url"] == "https://checkout.stripe.test/c/1"


@pytest.mark.parametrize("tier,interval", [("pro", "year"), ("family", "month"), ("family", "year")])
def test_other_plans_never_get_the_coupon(monkeypatch, tier, interval):
    monkeypatch.setenv(first_month_offer.ENV_COUPON_ID, "FIRST1")
    _, create_mock, _ = _checkout(tier=tier, interval=interval)
    kwargs = create_mock.call_args.kwargs
    assert "discounts" not in kwargs
    assert kwargs["allow_promotion_codes"] is True
    assert "offer" not in kwargs["metadata"]
    assert kwargs["idempotency_key"] == stripe_service.checkout_idempotency_key("user-1", tier, interval, SUCCESS, CANCEL)


def test_returning_subscriber_gets_normal_checkout(monkeypatch):
    monkeypatch.setenv(first_month_offer.ENV_COUPON_ID, "FIRST1")
    _, create_mock, _ = _checkout(ever_subscribed=True)
    kwargs = create_mock.call_args.kwargs
    assert "discounts" not in kwargs
    assert kwargs["allow_promotion_codes"] is True
    assert kwargs["idempotency_key"] == stripe_service.checkout_idempotency_key("user-1", "pro", "month", SUCCESS, CANCEL)


def test_eligibility_skipped_when_offer_off():
    with patch("backend.services.stripe_service._has_ever_subscribed") as ever:
        _checkout()
    ever.assert_not_called()  # no extra Stripe call when the offer is off


def test_has_ever_subscribed_checks_stored_then_stripe():
    assert stripe_service._has_ever_subscribed("cus_1", {"stripeSubscriptionId": "sub_old"}) is True
    with patch("backend.services.stripe_service.stripe.Subscription.list", return_value={"data": []}):
        assert stripe_service._has_ever_subscribed("cus_1", None) is False
    with patch("backend.services.stripe_service.stripe.Subscription.list", return_value={"data": [{"id": "sub_x"}]}):
        assert stripe_service._has_ever_subscribed("cus_1", None) is True
    with patch("backend.services.stripe_service.stripe.Subscription.list", side_effect=RuntimeError("boom")):
        assert stripe_service._has_ever_subscribed("cus_1", None) is True  # fail safe: no discount


def test_pp089_active_subscriber_still_goes_to_portal_with_offer_on(monkeypatch):
    monkeypatch.setenv(first_month_offer.ENV_COUPON_ID, "FIRST1")
    existing = {
        "stripeCustomerId": "cus_123",
        "stripeSubscriptionId": "sub_kept",
        "subscriptionStatus": "active",
        "tier": "pro",
    }
    portal = {"sessionId": "bps_1", "url": "https://billing.stripe.test/p"}
    with patch.dict("backend.services.stripe_service.PRICE_IDS", PRICES, clear=False), patch(
        "backend.services.stripe_service.get_user_subscription", return_value=existing
    ), patch("backend.services.stripe_service._ensure_customer_email"), patch(
        "backend.services.stripe_service._portal_redirect", return_value=portal
    ), patch("backend.services.stripe_service.stripe.checkout.Session.create") as create_mock:
        result = asyncio.run(stripe_service.create_checkout_session("user-1", "pro", "month", SUCCESS, CANCEL))
    assert result == portal
    create_mock.assert_not_called()


def test_open_session_reused_only_when_offer_marker_matches():
    def session(sid, metadata):
        return {"id": sid, "mode": "subscription", "url": f"https://checkout.stripe.test/{sid}", "metadata": metadata}

    listed = MagicMock()
    listed.auto_paging_iter.return_value = iter(
        [session("cs_plain", {}), session("cs_offer", {"offer": first_month_offer.OFFER_MARKER})]
    )
    with patch("backend.services.stripe_service.stripe.checkout.Session.list", return_value=listed):
        assert stripe_service._open_checkout_session("cus_1", "price_pro_m")["sessionId"] == "cs_plain"

    listed.auto_paging_iter.return_value = iter(
        [session("cs_plain", {}), session("cs_offer", {"offer": first_month_offer.OFFER_MARKER})]
    )
    with patch("backend.services.stripe_service.stripe.checkout.Session.list", return_value=listed):
        found = stripe_service._open_checkout_session("cus_1", "price_pro_m", first_month_offer.OFFER_MARKER)
        assert found["sessionId"] == "cs_offer"

    listed.auto_paging_iter.return_value = iter([session("cs_plain", {})])
    with patch("backend.services.stripe_service.stripe.checkout.Session.list", return_value=listed):
        assert stripe_service._open_checkout_session("cus_1", "price_pro_m", first_month_offer.OFFER_MARKER) is None


# ---- comp (100% discount) exclusion ----


def test_invoice_is_comp_detects_full_discount():
    assert first_month_offer.invoice_is_comp(
        {"subtotal": 499, "total": 0, "total_discount_amounts": [{"amount": 499}]}
    )
    assert first_month_offer.invoice_is_comp(
        {"subtotal": 499, "discount": {"coupon": {"percent_off": 100}}}
    )


def test_invoice_is_comp_false_for_offer_and_normal_invoices():
    # $1 first month: $3.99 of $4.99 discounted.
    assert not first_month_offer.invoice_is_comp(
        {"subtotal": 499, "total": 100, "total_discount_amounts": [{"amount": 399}]}
    )
    assert not first_month_offer.invoice_is_comp({"subtotal": 499, "total": 499})
    assert not first_month_offer.invoice_is_comp({"subtotal": 0})
    assert not first_month_offer.invoice_is_comp({})


def _paid(invoice, sub_meta):
    sub = {"id": "sub_1", "customer": "cus_1", "metadata": sub_meta, "status": "active"}
    with patch("backend.services.stripe_service.stripe.Subscription.retrieve", return_value=sub), patch(
        "backend.services.stripe_service.admin_service.record_transaction"
    ) as record, patch("backend.services.stripe_service._apply_subscription_entitlement", return_value=True), patch(
        "backend.services.stripe_service.get_user_subscription", return_value={"stripeSubscriptionId": "sub_1"}
    ), patch("backend.services.stripe_service._recipient_email", return_value=None), patch(
        "backend.services.stripe_service.email_service.send_payment_confirmation"
    ):
        stripe_service._handle_invoice_paid(invoice)
    return record.call_args.args[0]


def test_invoice_paid_tags_offer_and_not_comp():
    rec = _paid(
        {"id": "in_1", "subscription": "sub_1", "customer": "cus_1", "amount_paid": 100, "subtotal": 499,
         "total_discount_amounts": [{"amount": 399}]},
        {"userId": "user-1", "tier": "pro", "offer": first_month_offer.OFFER_MARKER},
    )
    assert rec["offer"] == first_month_offer.OFFER_MARKER
    assert rec["isComp"] is False
    assert rec["amountCents"] == 100


def test_invoice_paid_marks_100_percent_discount_as_comp():
    rec = _paid(
        {"id": "in_2", "subscription": "sub_2", "customer": "cus_2", "amount_paid": 0, "subtotal": 499,
         "total_discount_amounts": [{"amount": 499}]},
        {"userId": "tylor", "tier": "pro"},
    )
    assert rec["isComp"] is True
    assert rec["offer"] is None


# ---- admin stats ----


def _fake_cursor(rows):
    cur = MagicMock()
    cur.fetchone.side_effect = rows
    return cur


def test_offer_metrics_query_excludes_comp_and_shapes_result():
    from backend.services import admin_service

    cur = _fake_cursor([{"redemptions": 3, "revenue": 300}, {"converted": 1}])
    metrics = admin_service._offer_metrics(cur)
    assert metrics == {"redemptions": 3, "revenueCents": 300, "convertedToFullPrice": 1}
    for call in cur.execute.call_args_list:
        assert "NOT is_comp" in call.args[0] or "NOT t.is_comp" in call.args[0]


def test_admin_revenue_queries_exclude_comp():
    src = Path("backend/services/admin_service.py").read_text()
    assert src.count("status = 'succeeded' AND NOT is_comp") >= 3


def test_record_transaction_writes_offer_and_comp():
    from backend.services import admin_service

    cur = MagicMock()
    conn = MagicMock()
    conn.cursor.return_value.__enter__.return_value = cur
    ctx = MagicMock()
    ctx.__enter__.return_value = conn
    with patch("backend.services.admin_service.db_connection", return_value=ctx):
        admin_service.record_transaction({"userId": "u", "offer": "o", "isComp": True})
    sql, params = cur.execute.call_args.args
    assert "offer, is_comp" in sql
    assert params[-2:] == ("o", True)
    assert sql.count("%s") == len(params)


# ---- public endpoint + migration ----


def test_public_offer_endpoint_off_and_on(client, monkeypatch):
    off = client.get("/api/public/offer")
    assert off.status_code == 200
    assert off.json()["data"] == {"enabled": False}

    monkeypatch.setenv(first_month_offer.ENV_COUPON_ID, "FIRST1")
    on = client.get("/api/public/offer")
    assert on.json()["data"]["enabled"] is True
    assert "FIRST1" not in on.text


def test_migration_026_is_additive_with_rollback():
    up = Path("database/migrations/026_admin_transactions_offer_comp.sql").read_text()
    down = Path("database/migrations/026_admin_transactions_offer_comp.rollback.sql").read_text()
    assert "ADD COLUMN IF NOT EXISTS offer" in up and "ADD COLUMN IF NOT EXISTS is_comp" in up
    assert "DROP TABLE" not in up and "DELETE FROM" not in up
    assert "DROP COLUMN IF EXISTS is_comp" in down
