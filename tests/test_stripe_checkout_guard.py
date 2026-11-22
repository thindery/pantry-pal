"""PP-089: checkout should not create a second subscription, and webhooks must accept Stripe objects."""

from __future__ import annotations

from unittest.mock import patch
import asyncio

from backend.services import stripe_service


class FakeStripeObject:
    def __init__(self, data):
        self._data = data

    def __getitem__(self, key):
        return self._data[key]

    def to_dict_recursive(self):
        return self._data


def test_to_dict_handles_stripe_objects_without_get():
    data = FakeStripeObject({"object": {"id": "sub_123", "status": "active"}})
    assert stripe_service._to_dict(data)["object"]["id"] == "sub_123"


def test_process_webhook_accepts_stripe_data_object():
    data = FakeStripeObject(
        {
            "object": {
                "id": "sub_extra",
                "metadata": {"userId": "user-1"},
                "status": "canceled",
            }
        }
    )
    existing = {
        "stripeSubscriptionId": "sub_kept",
        "subscriptionStatus": "active",
        "tier": "pro",
        "stripeCustomerId": "cus_123",
    }
    with patch(
        "backend.services.stripe_service.get_user_subscription",
        return_value=existing,
    ) as mock_get, patch(
        "backend.services.stripe_service.downgrade_to_free"
    ) as mock_down, patch(
        "backend.services.stripe_service.update_user_subscription"
    ) as mock_update:
        result = stripe_service.process_webhook("customer.subscription.deleted", data)

    assert result == {"received": True}
    mock_get.assert_called_once_with("user-1")
    mock_down.assert_not_called()
    mock_update.assert_not_called()


def test_create_checkout_session_sends_active_subscriber_to_portal():
    existing = {
        "stripeCustomerId": "cus_123",
        "stripeSubscriptionId": "sub_kept",
        "subscriptionStatus": "active",
        "tier": "pro",
    }
    portal = {"sessionId": "bps_123", "url": "https://billing.stripe.com/session/test"}
    with patch.dict(
        "backend.services.stripe_service.PRICE_IDS",
        {"pro": {"month": "price_test"}},
        clear=False,
    ), patch(
        "backend.services.stripe_service.get_user_subscription",
        return_value=existing,
    ), patch(
        "backend.services.stripe_service._portal_redirect",
        return_value=portal,
    ) as mock_portal, patch(
        "backend.services.stripe_service.stripe.checkout.Session.create"
    ) as mock_checkout:
        result = asyncio.run(
            stripe_service.create_checkout_session(
                "user-1",
                "pro",
                "month",
                "https://www.mypantryhub.com/checkout/success",
                "https://www.mypantryhub.com/checkout/cancel",
            )
        )

    assert result["url"] == portal["url"]
    mock_portal.assert_called_once_with(
        "cus_123",
        "https://www.mypantryhub.com/checkout/cancel",
    )
    mock_checkout.assert_not_called()


def test_process_webhook_downgrades_only_the_linked_subscription():
    data = {
        "object": {
            "id": "sub_kept",
            "customer": "cus_123",
            "metadata": {"userId": "user-1"},
            "status": "canceled",
        }
    }
    existing = {
        "stripeSubscriptionId": "sub_kept",
        "subscriptionStatus": "active",
        "tier": "pro",
        "stripeCustomerId": "cus_123",
    }
    with patch(
        "backend.services.stripe_service.get_user_subscription",
        return_value=existing,
    ), patch(
        "backend.services.stripe_service._first_active_subscription",
        return_value=None,
    ), patch(
        "backend.services.stripe_service.downgrade_to_free"
    ) as mock_down:
        stripe_service.process_webhook("customer.subscription.deleted", data)

    mock_down.assert_called_once_with("user-1")
