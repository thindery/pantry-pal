"""PP-136: invoice.upcoming renewal reminder after a promotion."""

from __future__ import annotations

from unittest.mock import patch

import pytest

from backend.services import email_service, stripe_service

RENEWAL_TS = 1766300000  # 2025-12-21 UTC


def _sub(status="active", latest="in_prev", cancel=False, user="user-1"):
    return {
        "id": "sub_1",
        "customer": "cus_1",
        "status": status,
        "cancel_at_period_end": cancel,
        "latest_invoice": latest,
        "metadata": {"userId": user, "tier": "pro", "offer": "pro_monthly_first_month_1usd"} if user else {},
        "items": {"data": [{"current_period_start": RENEWAL_TS - 2592000, "current_period_end": RENEWAL_TS, "price": {"id": "price_m", "recurring": {"interval": "month"}}}]},
    }


DISCOUNTED_PREV = {"id": "in_prev", "subtotal": 499, "total": 100, "total_discount_amounts": [{"amount": 399}]}
FULL_PREV = {"id": "in_prev", "subtotal": 499, "total": 499, "total_discount_amounts": []}
UPCOMING = {"object": "invoice", "subscription": "sub_1", "customer": "cus_1", "amount_due": 499, "subtotal": 499, "total": 499, "currency": "usd", "total_discount_amounts": []}


def _run(sub, prev, upcoming=UPCOMING):
    with patch.object(stripe_service.stripe.Subscription, "retrieve", return_value=sub), patch.object(
        stripe_service.stripe.Invoice, "retrieve", return_value=prev
    ), patch.object(stripe_service, "_recipient_email", return_value="buyer@example.com"), patch.object(
        stripe_service.email_service, "send_renewal_reminder", return_value={"skipped": False}
    ) as send:
        stripe_service.process_webhook("invoice.upcoming", {"object": upcoming})
    return send


def test_sends_before_first_full_price_renewal_after_offer():
    send = _run(_sub(), DISCOUNTED_PREV)
    send.assert_called_once()
    kwargs = send.call_args.kwargs
    assert kwargs["amount_cents"] == 499
    assert kwargs["subscription_id"] == "sub_1"
    assert kwargs["interval"] == "month"
    assert kwargs["renewal_date"].startswith("2025-12-21")
    assert kwargs["email"] == "buyer@example.com"


def test_plain_active_renewal_gets_nothing():
    _run(_sub(), FULL_PREV).assert_not_called()


@pytest.mark.parametrize(
    "sub",
    [_sub(cancel=True), _sub(status="past_due"), _sub(status="canceled"), _sub(user=None)],
)
def test_skips_cancelling_inactive_or_unknown_user(sub):
    _run(sub, DISCOUNTED_PREV).assert_not_called()


def test_skips_when_upcoming_invoice_is_free_or_still_discounted():
    _run(_sub(), DISCOUNTED_PREV, {**UPCOMING, "amount_due": 0, "total": 0}).assert_not_called()
    still = {**UPCOMING, "amount_due": 100, "total": 100, "total_discount_amounts": [{"amount": 399}]}
    _run(_sub(), DISCOUNTED_PREV, still).assert_not_called()


def test_trialing_sends_without_looking_up_latest_invoice():
    send = _run(_sub(status="trialing", latest=None), None)
    send.assert_called_once()


def test_reminder_copy_and_idempotency_key():
    with patch.object(email_service, "send_email", return_value={"skipped": False}) as send:
        email_service.send_renewal_reminder(
            user_id="user-1",
            email="buyer@example.com",
            subscription_id="sub_1",
            renewal_date="2025-12-21T07:33:20+00:00",
            amount_cents=499,
            currency="usd",
            tier="pro",
            interval="month",
        )
    kwargs = send.call_args.kwargs
    assert kwargs["subject"] == "Your Pro plan renews at $4.99/month on December 21, 2025"
    assert kwargs["template"] == "renewal_reminder"
    assert kwargs["idempotency_key"] == "renewal.reminder:sub_1:2025-12-21T07:33:20+00:00"
    assert "trial" not in (kwargs["text"] + kwargs["html"] + kwargs["subject"]).lower()
    assert "$4.99/month" in kwargs["text"]
    assert "/dashboard/account/" in kwargs["html"]


def test_same_renewal_twice_uses_same_key_so_second_send_is_skipped():
    with patch.object(email_service, "already_sent", side_effect=[False, True]), patch.object(
        email_service, "is_suppressed", return_value=False
    ), patch.object(email_service, "_api_key", return_value=""), patch.object(email_service, "_from_address", return_value=""):
        first = email_service.send_renewal_reminder(
            user_id="u", email="a@example.com", subscription_id="sub_1", renewal_date="2025-12-21T00:00:00+00:00", amount_cents=499
        )
        second = email_service.send_renewal_reminder(
            user_id="u", email="a@example.com", subscription_id="sub_1", renewal_date="2025-12-21T00:00:00+00:00", amount_cents=499
        )
    assert first["reason"] == "not_configured"
    assert second["reason"] == "already_sent"
