"""PP-089: checkout should not create a second subscription, and webhooks must accept Stripe objects."""

from __future__ import annotations

from unittest.mock import patch
import asyncio

import pytest

from backend.services import stripe_service


@pytest.fixture(autouse=True)
def _noop_transactional_email():
    with patch("backend.services.stripe_service.email_service.send_payment_confirmation", return_value={"skipped": True}), patch(
        "backend.services.stripe_service.email_service.send_payment_failed",
        return_value={"skipped": True},
    ), patch(
        "backend.services.stripe_service.email_service.send_cancellation_scheduled",
        return_value={"skipped": True},
    ), patch(
        "backend.services.stripe_service.email_service.send_subscription_ended",
        return_value={"skipped": True},
    ), patch(
        "backend.services.stripe_service.email_service.send_welcome",
        return_value={"skipped": True},
    ), patch(
        "backend.services.stripe_service.get_user_contact",
        return_value={"email": None, "name": None},
    ):
        yield



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


def test_invoice_paid_alone_grants_pro():
    invoice = {
        "id": "in_test_paid",
        "customer": "cus_new",
        "amount_paid": 499,
        "currency": "usd",
        "parent": {"subscription_details": {"subscription": "sub_new"}},
    }
    sub = {
        "id": "sub_new",
        "customer": "cus_new",
        "status": "active",
        "metadata": {"userId": "user-new", "tier": "pro"},
        "items": {
            "data": [
                {
                    "price": {"id": "price_pro_month"},
                    "current_period_start": 1795292965,
                    "current_period_end": 1797884965,
                }
            ]
        },
    }
    with patch("backend.services.stripe_service.admin_service.record_transaction") as mock_txn, patch(
        "backend.services.stripe_service.stripe.Subscription.retrieve",
        return_value=sub,
    ), patch(
        "backend.services.stripe_service.get_user_subscription",
        return_value={"tier": "free", "subscriptionStatus": "incomplete"},
    ), patch(
        "backend.services.stripe_service.update_user_subscription"
    ) as mock_update:
        stripe_service.process_webhook("invoice.paid", {"object": invoice})

    mock_txn.assert_called_once()
    mock_update.assert_called_once()
    updates = mock_update.call_args.args[1]
    assert mock_update.call_args.args[0] == "user-new"
    assert updates["tier"] == "pro"
    assert updates["stripeSubscriptionId"] == "sub_new"
    assert updates["subscriptionStatus"] == "active"
    assert updates["subscriptionEndDate"] == "2026-12-21T20:29:25+00:00"


def test_invoice_paid_does_not_replace_a_different_active_subscription():
    invoice = {
        "id": "in_extra",
        "customer": "cus_1",
        "amount_paid": 499,
        "currency": "usd",
        "subscription": "sub_extra",
    }
    sub = {
        "id": "sub_extra",
        "customer": "cus_1",
        "status": "active",
        "metadata": {"userId": "user-1", "tier": "pro"},
    }
    existing = {
        "stripeSubscriptionId": "sub_kept",
        "subscriptionStatus": "active",
        "tier": "pro",
        "stripeCustomerId": "cus_1",
    }
    with patch("backend.services.stripe_service.admin_service.record_transaction") as mock_txn, patch(
        "backend.services.stripe_service.stripe.Subscription.retrieve",
        return_value=sub,
    ), patch(
        "backend.services.stripe_service.get_user_subscription",
        return_value=existing,
    ), patch(
        "backend.services.stripe_service.update_user_subscription"
    ) as mock_update:
        stripe_service.process_webhook("invoice.paid", {"object": invoice})

    mock_txn.assert_called_once()
    mock_update.assert_not_called()


def test_should_handle_skips_already_processed_event():
    processed_rows = iter(
        [
            None,  # INSERT ON CONFLICT DO NOTHING returned no row
            {"processed": True},
        ]
    )

    class FakeCursor:
        def __enter__(self):
            return self

        def __exit__(self, *args):
            return False

        def execute(self, sql, params=None):
            self.sql = sql

        def fetchone(self):
            try:
                return next(processed_rows)
            except StopIteration:
                return {"processed": True}

    class FakeConn:
        def cursor(self):
            return FakeCursor()

        def __enter__(self):
            return self

        def __exit__(self, *args):
            return False

    with patch("backend.services.stripe_service.db_connection") as mock_db:
        mock_db.return_value.__enter__.return_value = FakeConn()
        # First call: INSERT returns nothing (conflict), SELECT processed=True
        assert (
            stripe_service.should_handle_webhook_event(
                {"id": "evt_done", "type": "invoice.paid", "data": {"object": {}}}
            )
            is False
        )


def test_should_handle_retries_unprocessed_event():
    class FakeCursor:
        def __enter__(self):
            return self

        def __exit__(self, *args):
            return False

        def execute(self, sql, params=None):
            self.sql = sql

        def fetchone(self):
            if "INSERT" in (self.sql or ""):
                return None
            return {"processed": False}

    class FakeConn:
        def cursor(self):
            return FakeCursor()

        def __enter__(self):
            return self

        def __exit__(self, *args):
            return False

    with patch("backend.services.stripe_service.db_connection") as mock_db:
        mock_db.return_value.__enter__.return_value = FakeConn()
        assert (
            stripe_service.should_handle_webhook_event(
                {"id": "evt_retry", "type": "invoice.paid", "data": {"object": {}}}
            )
            is True
        )


def test_new_checkout_customer_includes_email():
    existing = {"stripeCustomerId": None}
    created = type("C", (), {"id": "cus_new"})()
    session = type("S", (), {"id": "cs_new", "url": "https://checkout.stripe.com/c"})()
    with patch.dict("backend.services.stripe_service.PRICE_IDS", {"pro": {"month": "price_test"}}, clear=False), patch(
        "backend.services.stripe_service.get_user_subscription",
        return_value=existing,
    ), patch(
        "backend.services.stripe_service.update_user_subscription",
    ), patch(
        "backend.services.stripe_service._first_active_subscription",
        return_value=None,
    ), patch(
        "backend.services.stripe_service._open_checkout_session",
        return_value=None,
    ), patch(
        "backend.services.stripe_service.stripe.Customer.create",
        return_value=created,
    ) as mock_create, patch(
        "backend.services.stripe_service.stripe.checkout.Session.create",
        return_value=session,
    ):
        import asyncio

        asyncio.run(
            stripe_service.create_checkout_session(
                "user-1",
                "pro",
                "month",
                "https://www.mypantryhub.com/checkout/success",
                "https://www.mypantryhub.com/checkout/cancel",
                email="member@example.com",
                name="Member Example",
            )
        )
    kwargs = mock_create.call_args.kwargs
    assert kwargs["email"] == "member@example.com"
    assert kwargs["name"] == "Member Example"
    assert kwargs["metadata"]["userId"] == "user-1"


def test_existing_customer_without_email_is_backfilled():
    with patch(
        "backend.services.stripe_service.stripe.Customer.retrieve",
        return_value={"id": "cus_1", "email": None, "name": None},
    ), patch(
        "backend.services.stripe_service.stripe.Customer.modify"
    ) as mock_modify:
        stripe_service._ensure_customer_email("cus_1", email="member@example.com", name="Member")
    mock_modify.assert_called_once_with("cus_1", email="member@example.com", name="Member")


def test_subscription_updated_keeps_active_status_when_cancel_at_period_end():
    event = {
        "object": {
            "id": "sub_kept",
            "status": "active",
            "cancel_at_period_end": True,
            "metadata": {"userId": "user-1", "tier": "pro"},
            "items": {"data": [{"current_period_end": 1797884965, "price": {"id": "price_1"}}]},
        }
    }
    existing = {
        "stripeSubscriptionId": "sub_kept",
        "subscriptionStatus": "active",
        "tier": "pro",
    }
    with patch(
        "backend.services.stripe_service.get_user_subscription",
        return_value=existing,
    ), patch(
        "backend.services.stripe_service.update_user_subscription"
    ) as mock_update:
        stripe_service.process_webhook("customer.subscription.updated", event)
    updates = mock_update.call_args.args[1]
    assert updates["subscriptionStatus"] == "active"
    assert updates["cancelAtPeriodEnd"] is True
    assert updates["subscriptionEndDate"] == "2026-12-21T20:29:25+00:00"


def test_refund_of_linked_subscription_downgrades_when_no_other_active_sub():
    charge = {
        "id": "ch_linked",
        "customer": "cus_1",
        "invoice": "in_1",
        "amount": 499,
        "amount_refunded": 499,
        "refunded": True,
        "currency": "usd",
    }
    invoice = {"id": "in_1", "subscription": "sub_kept", "customer": "cus_1"}
    sub = {"id": "sub_kept", "metadata": {"userId": "user-1", "tier": "pro"}}
    existing = {
        "stripeSubscriptionId": "sub_kept",
        "subscriptionStatus": "active",
        "tier": "pro",
        "stripeCustomerId": "cus_1",
    }
    with patch("backend.services.stripe_service.admin_service.record_refund") as mock_refund, patch(
        "backend.services.stripe_service.stripe.Invoice.retrieve",
        return_value=invoice,
    ), patch(
        "backend.services.stripe_service.stripe.Subscription.retrieve",
        return_value=sub,
    ), patch(
        "backend.services.stripe_service.get_user_subscription",
        return_value=existing,
    ), patch(
        "backend.services.stripe_service._first_active_subscription",
        return_value=None,
    ), patch(
        "backend.services.stripe_service.downgrade_to_free"
    ) as mock_down:
        stripe_service.process_webhook("charge.refunded", {"object": charge})
    mock_refund.assert_called_once()
    mock_down.assert_called_once_with("user-1")


def test_refund_of_duplicate_subscription_does_not_downgrade():
    charge = {
        "id": "ch_extra",
        "customer": "cus_1",
        "invoice": "in_extra",
        "amount": 499,
        "amount_refunded": 499,
        "refunded": True,
        "currency": "usd",
    }
    invoice = {"id": "in_extra", "subscription": "sub_extra", "customer": "cus_1"}
    sub = {"id": "sub_extra", "metadata": {"userId": "user-1", "tier": "pro"}}
    existing = {
        "stripeSubscriptionId": "sub_kept",
        "subscriptionStatus": "active",
        "tier": "pro",
        "stripeCustomerId": "cus_1",
    }
    with patch("backend.services.stripe_service.admin_service.record_refund"), patch(
        "backend.services.stripe_service.stripe.Invoice.retrieve",
        return_value=invoice,
    ), patch(
        "backend.services.stripe_service.stripe.Subscription.retrieve",
        return_value=sub,
    ), patch(
        "backend.services.stripe_service.get_user_subscription",
        return_value=existing,
    ), patch(
        "backend.services.stripe_service.downgrade_to_free"
    ) as mock_down:
        stripe_service.process_webhook("charge.refunded", {"object": charge})
    mock_down.assert_not_called()



def _created_sub(status="active", sub_id="sub_1"):
    return {
        "id": sub_id,
        "customer": "cus_1",
        "status": status,
        "metadata": {"userId": "user-1", "tier": "pro"},
        "items": {
            "data": [
                {
                    "price": {"id": "price_1"},
                    "current_period_start": 1,
                    "current_period_end": 2,
                }
            ]
        },
    }


def test_subscription_created_grants_pro_when_active():
    with patch("backend.services.stripe_service.get_user_subscription", return_value=None), patch(
        "backend.services.stripe_service.update_user_subscription"
    ) as mock_update:
        stripe_service.process_webhook("customer.subscription.created", {"object": _created_sub()})
    mock_update.assert_called_once()
    user_id, fields = mock_update.call_args.args
    assert user_id == "user-1"
    assert fields["tier"] == "pro"
    assert fields["subscriptionStatus"] == "active"
    assert fields["stripeSubscriptionId"] == "sub_1"


def test_subscription_created_ignores_incomplete():
    with patch("backend.services.stripe_service.update_user_subscription") as mock_update:
        stripe_service.process_webhook(
            "customer.subscription.created",
            {"object": _created_sub(status="incomplete")},
        )
    mock_update.assert_not_called()


def test_subscription_created_does_not_replace_linked_active_sub():
    existing = {
        "stripeSubscriptionId": "sub_kept",
        "subscriptionStatus": "active",
        "tier": "pro",
    }
    with patch("backend.services.stripe_service.get_user_subscription", return_value=existing), patch(
        "backend.services.stripe_service.update_user_subscription"
    ) as mock_update:
        stripe_service.process_webhook(
            "customer.subscription.created",
            {"object": _created_sub(sub_id="sub_dup")},
        )
    mock_update.assert_not_called()


def test_subscription_created_refreshes_the_same_linked_sub():
    existing = {
        "stripeSubscriptionId": "sub_1",
        "subscriptionStatus": "active",
        "tier": "pro",
        "stripeCustomerId": "cus_1",
    }
    with patch("backend.services.stripe_service.get_user_subscription", return_value=existing), patch(
        "backend.services.stripe_service.update_user_subscription"
    ) as mock_update:
        stripe_service.process_webhook("customer.subscription.created", {"object": _created_sub()})
    mock_update.assert_called_once()
    assert mock_update.call_args.args[1]["stripeSubscriptionId"] == "sub_1"
