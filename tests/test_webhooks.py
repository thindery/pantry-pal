"""Stripe webhook signature tests."""

from __future__ import annotations

from unittest.mock import patch

import pytest


def test_stripe_webhook_missing_signature(client):
    response = client.post("/api/webhooks/stripe", json={})
    assert response.status_code == 400
    assert response.json()["detail"]["received"] is False


@patch(
    "backend.routers.webhooks.stripe_service.verify_webhook",
    side_effect=ValueError("Invalid signature"),
)
def test_stripe_webhook_invalid_signature(mock_verify, client):
    response = client.post(
        "/api/webhooks/stripe",
        content=b"{}",
        headers={"stripe-signature": "bad_sig"},
    )
    assert response.status_code == 400
    mock_verify.assert_called_once()


@patch(
    "backend.routers.webhooks.stripe_service.process_webhook",
    return_value={"received": True},
)
@patch(
    "backend.routers.webhooks.stripe_service.verify_webhook",
    return_value={"type": "checkout.session.completed", "data": {"object": {}}},
)
def test_stripe_webhook_valid_signature(mock_verify, mock_process, client):
    response = client.post(
        "/api/webhooks/stripe",
        content=b'{"id":"evt_test"}',
        headers={"stripe-signature": "valid_sig"},
    )
    assert response.status_code == 200
    assert response.json()["received"] is True
    mock_verify.assert_called_once()
    mock_process.assert_called_once()