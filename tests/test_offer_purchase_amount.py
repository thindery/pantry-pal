"""PP-166 + PP-168: offer purchases report the amount Stripe actually charged.

The success page sends GA4 `purchase` with confirm's amountTotal / 100, so a
$1 first-month checkout must surface Stripe's discounted amount_total (100),
not the 4.99 list price.
"""

from __future__ import annotations

from unittest.mock import patch

import stripe

from backend.services import stripe_service


def test_offer_session_reports_discounted_amount():
    session = {
        "id": "cs_test_offer12345",
        "mode": "subscription",
        "status": "complete",
        "payment_status": "paid",
        "subscription": "sub_offer",
        "metadata": {"userId": "user-1", "tier": "pro", "offer": "pro_monthly_first_month_1usd"},
        "amount_subtotal": 499,
        "amount_total": 100,
        "currency": "usd",
    }
    sub = {"id": "sub_offer", "status": "active", "customer": "cus_1", "metadata": session["metadata"]}
    with patch.object(stripe.checkout.Session, "retrieve", return_value=session), patch.object(
        stripe.Subscription, "retrieve", return_value=sub
    ), patch("backend.services.stripe_service._apply_subscription_entitlement", return_value=True), patch(
        "backend.services.stripe_service.get_user_subscription",
        return_value={"tier": "pro", "subscriptionStatus": "active"},
    ):
        result = stripe_service.confirm_checkout_session("user-1", "cs_test_offer12345")
    assert result["confirmed"] is True
    assert result["amountTotal"] == 100
    assert result["currency"] == "usd"
