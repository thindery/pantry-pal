"""PP-174: the billing portal must use the Stripe SDK's real namespace.

stripe-python exposes `stripe.billing_portal`; `stripe.billingPortal` raises
AttributeError, which turned "Manage billing" and the already-subscribed
checkout redirect (PP-089) into 500s. Earlier tests mocked `_portal_redirect`
away, so they could not see it. These tests patch only the SDK call itself.
"""

from __future__ import annotations

import asyncio
from types import SimpleNamespace
from unittest.mock import patch

import stripe

from backend.services import stripe_service


def _fake_portal(**kwargs):
    return SimpleNamespace(id="bps_test_1", url="https://billing.stripe.example.test/p/1", **kwargs)


def test_portal_redirect_uses_billing_portal_namespace():
    with patch.object(stripe.billing_portal.Session, "create", side_effect=_fake_portal) as create:
        result = stripe_service._portal_redirect("cus_test_1", "https://pantryhub.example.test/settings")
    create.assert_called_once_with(customer="cus_test_1", return_url="https://pantryhub.example.test/settings")
    assert result == {"sessionId": "bps_test_1", "url": "https://billing.stripe.example.test/p/1"}


def test_create_portal_session_uses_billing_portal_namespace():
    with patch.object(stripe.billing_portal.Session, "create", side_effect=_fake_portal) as create, patch(
        "backend.services.stripe_service.get_user_subscription",
        return_value={"stripeCustomerId": "cus_test_2"},
    ), patch("backend.services.stripe_service._ensure_customer_email"):
        result = asyncio.run(
            stripe_service.create_portal_session("user_1", "https://pantryhub.example.test/settings")
        )
    create.assert_called_once_with(customer="cus_test_2", return_url="https://pantryhub.example.test/settings")
    assert result == {"url": "https://billing.stripe.example.test/p/1"}


def test_service_never_references_camel_case_namespace():
    import inspect

    assert "billingPortal" not in inspect.getsource(stripe_service)
