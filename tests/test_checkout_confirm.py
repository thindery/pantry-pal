"""PP-168: success page confirms a paid Checkout Session with Stripe."""

from __future__ import annotations

from unittest.mock import patch

import pytest
import stripe

from backend.services import stripe_service


def _session(**overrides):
    base = {
        "id": "cs_test_abc12345",
        "mode": "subscription",
        "status": "complete",
        "payment_status": "paid",
        "subscription": "sub_new",
        "metadata": {"userId": "user-1", "tier": "pro"},
        "amount_total": 100,
        "currency": "usd",
    }
    base.update(overrides)
    return base


def _sub(status="active"):
    return {
        "id": "sub_new",
        "status": status,
        "customer": "cus_1",
        "metadata": {"userId": "user-1", "tier": "pro"},
        "items": {"data": [{"price": {"id": "price_pro_m"}, "current_period_start": 1, "current_period_end": 2}]},
    }


def _run(session, sub=None, stored=None):
    stored_after = stored if stored is not None else {"tier": "pro", "subscriptionStatus": "active"}
    with patch.object(stripe.checkout.Session, "retrieve", return_value=session) as m_sess, patch.object(
        stripe.Subscription, "retrieve", return_value=sub or _sub()
    ) as m_sub, patch(
        "backend.services.stripe_service._apply_subscription_entitlement", return_value=True
    ) as m_apply, patch(
        "backend.services.stripe_service.get_user_subscription", return_value=stored_after
    ):
        result = stripe_service.confirm_checkout_session("user-1", session["id"])
    return result, m_sess, m_sub, m_apply


def test_paid_session_applies_entitlement_and_reports_amount():
    result, _, _, m_apply = _run(_session())
    m_apply.assert_called_once()
    assert m_apply.call_args[0][0] == "user-1"
    assert m_apply.call_args[0][1] == "pro"
    assert result["confirmed"] is True
    assert result["amountTotal"] == 100
    assert result["currency"] == "usd"


def test_unpaid_session_does_not_grant():
    result, _, m_sub, m_apply = _run(
        _session(status="open", payment_status="unpaid"), stored={"tier": "free", "subscriptionStatus": None}
    )
    m_sub.assert_not_called()
    m_apply.assert_not_called()
    assert result["confirmed"] is False


def test_incomplete_subscription_does_not_grant():
    result, _, _, m_apply = _run(_session(), sub=_sub("incomplete"), stored={"tier": "free"})
    m_apply.assert_not_called()
    assert result["confirmed"] is False


def test_other_users_session_is_rejected():
    with patch.object(
        stripe.checkout.Session, "retrieve", return_value=_session(metadata={"userId": "someone-else", "tier": "pro"})
    ), patch("backend.services.stripe_service._apply_subscription_entitlement") as m_apply:
        with pytest.raises(PermissionError):
            stripe_service.confirm_checkout_session("user-1", "cs_test_abc12345")
    m_apply.assert_not_called()


def test_bad_session_id_never_calls_stripe():
    with patch.object(stripe.checkout.Session, "retrieve") as m_sess:
        for bad in ("", "sub_123", "cs_{CHECKOUT_SESSION_ID}", "cs_../../x"):
            with pytest.raises(ValueError):
                stripe_service.confirm_checkout_session("user-1", bad)
    m_sess.assert_not_called()


def test_unknown_session_is_not_found():
    err = stripe.InvalidRequestError("No such checkout.session", "id")
    with patch.object(stripe.checkout.Session, "retrieve", side_effect=err):
        with pytest.raises(PermissionError):
            stripe_service.confirm_checkout_session("user-1", "cs_test_missing123")


def test_already_linked_other_active_sub_still_confirms_without_replacing():
    # _apply refuses to replace a different active linked sub (PP-089 guard);
    # the user is still Pro, so the page can confirm.
    with patch.object(stripe.checkout.Session, "retrieve", return_value=_session()), patch.object(
        stripe.Subscription, "retrieve", return_value=_sub()
    ), patch(
        "backend.services.stripe_service.get_user_subscription",
        return_value={"tier": "pro", "subscriptionStatus": "active", "stripeSubscriptionId": "sub_kept"},
    ), patch("backend.services.stripe_service.update_user_subscription") as m_update:
        result = stripe_service.confirm_checkout_session("user-1", "cs_test_abc12345")
    m_update.assert_not_called()
    assert result["applied"] is False
    assert result["confirmed"] is True


def test_route_maps_errors(monkeypatch):
    from fastapi.testclient import TestClient
    from backend.app.main import app

    client = TestClient(app)
    headers = {"x-user-id": "user-1", "x-user-email": "u@example.com"}
    r = client.post("/api/subscription/checkout/confirm", json={"sessionId": "nope"}, headers=headers)
    assert r.status_code in (400, 422)
    with patch(
        "backend.services.stripe_service.confirm_checkout_session", side_effect=PermissionError("x")
    ):
        r = client.post("/api/subscription/checkout/confirm", json={"sessionId": "cs_test_abc12345"}, headers=headers)
    assert r.status_code == 404
    with patch(
        "backend.services.stripe_service.confirm_checkout_session",
        return_value={"confirmed": True, "applied": True, "tier": "pro", "sessionStatus": "complete",
                      "paymentStatus": "paid", "amountTotal": 499, "currency": "usd"},
    ):
        r = client.post("/api/subscription/checkout/confirm", json={"sessionId": "cs_test_abc12345"}, headers=headers)
    assert r.status_code == 200
    assert r.json()["data"]["amountTotal"] == 499
