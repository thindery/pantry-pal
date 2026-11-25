"""PP-170: checkout idempotency key includes the redirect URLs."""

from __future__ import annotations

import asyncio
from unittest.mock import MagicMock, patch

import stripe

from backend.services import stripe_service

S = "https://www.mypantryhub.com/checkout/success?session_id={CHECKOUT_SESSION_ID}"
C = "https://www.mypantryhub.com/pricing/"


def test_same_request_same_key():
    a = stripe_service.checkout_idempotency_key("u1", "pro", "month", S, C)
    b = stripe_service.checkout_idempotency_key("u1", "pro", "month", S, C)
    assert a == b
    assert a.startswith("pantryhub-checkout-u1-pro-month-")


def test_changed_urls_change_key():
    base = stripe_service.checkout_idempotency_key("u1", "pro", "month", S, C)
    assert stripe_service.checkout_idempotency_key("u1", "pro", "month", S.replace("www.", ""), C) != base
    assert stripe_service.checkout_idempotency_key("u1", "pro", "month", S, C + "x") != base
    assert stripe_service.checkout_idempotency_key("u1", "pro", "year", S, C) != base


def test_key_does_not_leak_urls_and_fits_stripe_limit():
    key = stripe_service.checkout_idempotency_key("user-" + "x" * 100, "family", "year", S, C)
    assert "mypantryhub" not in key
    assert len(key) <= 255


def test_create_checkout_session_passes_url_aware_key():
    fake_session = MagicMock(id="cs_test_1", url="https://checkout.stripe.com/x")
    empty = MagicMock()
    empty.auto_paging_iter.return_value = iter([])
    with patch.dict(stripe_service.PRICE_IDS, {"pro": {"month": "price_pro_m"}}), patch(
        "backend.services.stripe_service.get_user_subscription", return_value={"stripeCustomerId": "cus_1"}
    ), patch("backend.services.stripe_service._ensure_customer_email"), patch(
        "backend.services.stripe_service._first_active_subscription", return_value=None
    ), patch.object(stripe.checkout.Session, "list", return_value=empty), patch.object(
        stripe.checkout.Session, "create", return_value=fake_session
    ) as m_create:
        asyncio.run(stripe_service.create_checkout_session("u1", "pro", "month", S, C))
    key = m_create.call_args.kwargs["idempotency_key"]
    assert key == stripe_service.checkout_idempotency_key("u1", "pro", "month", S, C)
