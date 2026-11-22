"""PP-093: cancel-at-period-end keeps Pro access."""

from __future__ import annotations

from types import SimpleNamespace
from unittest.mock import patch

SAMPLE_SUB = {
    "stripeSubscriptionId": "sub_kept",
    "subscriptionStatus": "active",
    "tier": "pro",
    "subscriptionEndDate": "2026-12-21T20:29:25+00:00",
    "cancelAtPeriodEnd": False,
}

TIER_INFO = {"tier": "pro", "subscription": {"status": "active", "cancelAtPeriodEnd": True}}


@patch("backend.routers.subscription.merge_contact", return_value={"email": "tylor@example.com", "name": "Tylor"})
@patch("backend.routers.subscription.email_service.send_cancellation_scheduled", return_value={"skipped": True})
@patch("backend.routers.subscription.pantry_service.get_all_items", return_value=[])
@patch(
    "backend.routers.subscription.subscription_service.get_user_tier_info",
    return_value=TIER_INFO,
)
@patch("backend.routers.subscription.subscription_service.update_user_subscription")
@patch(
    "backend.routers.subscription.subscription_service.get_user_subscription",
    return_value=SAMPLE_SUB,
)
@patch(
    "stripe.Subscription.modify",
    return_value=SimpleNamespace(
        status="active",
        cancel_at_period_end=True,
        items=SimpleNamespace(data=[SimpleNamespace(current_period_end=1797884965)]),
        current_period_end=None,
        current_period_start=None,
    ),
)
def test_cancel_keeps_active_status(mock_modify, mock_get, mock_update, mock_tier, mock_items, mock_email, mock_contact, client, auth_headers):
    response = client.post("/api/subscription/cancel", headers=auth_headers)
    assert response.status_code == 200
    mock_modify.assert_called_once()
    updates = mock_update.call_args.args[1]
    assert updates["cancelAtPeriodEnd"] is True
    assert updates["subscriptionStatus"] == "active"
    assert "canceled" not in str(updates["subscriptionStatus"])
