"""PP-153: cancel at period end, reactivate, billing portal, and end of subscription.

Starts from a Pro user made through the real checkout + signed webhook path
(tests/billing_harness.py) and drives the real subscription routes against a
real database. Stripe is an in-memory fake; no account, live key, or real
customer is involved. Run with RUN_POSTGRES_TESTS=1 (`npm run test:postgres`).
"""

from __future__ import annotations

import os

import pytest

from billing_harness import SITE, FakeStripe, make_pro_user, make_user, post_event

pytestmark = pytest.mark.skipif(
    os.environ.get("RUN_POSTGRES_TESTS") != "1",
    reason="Set RUN_POSTGRES_TESTS=1 and DATABASE_URL to run",
)


@pytest.fixture(scope="module", autouse=True)
def _migrated():
    from database.migrate import migrate

    migrate()


@pytest.fixture(autouse=True)
def _no_email(monkeypatch):
    # Cancellation emails are asserted in PP-154; keep Resend unconfigured here.
    monkeypatch.delenv("RESEND_API_KEY", raising=False)


@pytest.fixture
def stripe_fake(monkeypatch):
    return FakeStripe(monkeypatch)


def _subscription(client, user) -> dict:
    response = client.get("/api/subscription", headers=user["headers"])
    assert response.status_code == 200, response.text
    return response.json()["data"]


def test_cancel_keeps_pro_until_period_end_then_reactivate(client, stripe_fake):
    user = make_pro_user(client, stripe_fake)
    assert _subscription(client, user)["tier"] == "pro"

    cancel = client.post("/api/subscription/cancel", headers=user["headers"])
    assert cancel.status_code == 200, cancel.text
    data = cancel.json()["data"]
    assert data["tier"] == "pro"
    assert data["subscription"]["cancelAtPeriodEnd"] is True
    assert data["subscription"]["status"] == "active"
    assert data["subscription"]["subscriptionEndDate"]
    assert stripe_fake.modifies == [(user["subscription_id"], {"cancel_at_period_end": True})]

    # Stripe then reports the scheduled cancel; still Pro until it actually ends.
    post_event(client, "customer.subscription.updated", dict(stripe_fake.subscriptions[user["subscription_id"]]))
    info = _subscription(client, user)
    assert info["tier"] == "pro"
    assert info["subscription"]["cancelAtPeriodEnd"] is True

    resume = client.post("/api/subscription/reactivate", headers=user["headers"])
    assert resume.status_code == 200, resume.text
    data = resume.json()["data"]
    assert data["tier"] == "pro"
    assert data["subscription"]["cancelAtPeriodEnd"] is False
    assert stripe_fake.modifies[-1] == (user["subscription_id"], {"cancel_at_period_end": False})
    assert stripe_fake.subscriptions[user["subscription_id"]]["cancel_at_period_end"] is False


def test_billing_portal_opens_for_the_users_customer(client, stripe_fake):
    user = make_pro_user(client, stripe_fake)
    return_url = f"{SITE}/dashboard/account/"

    response = client.post("/api/subscription/portal", json={"returnUrl": return_url}, headers=user["headers"])

    assert response.status_code == 200, response.text
    assert response.json()["data"]["url"].startswith("https://billing.stripe.example.test/")
    [portal] = stripe_fake.portal_sessions
    assert portal["customer"] == user["customer_id"]
    assert portal["return_url"] == return_url


def test_portal_rejects_off_site_return_url(client, stripe_fake):
    user = make_pro_user(client, stripe_fake)
    response = client.post(
        "/api/subscription/portal",
        json={"returnUrl": "https://evil.example.test/steal"},
        headers=user["headers"],
    )
    assert response.status_code == 400, response.text
    assert stripe_fake.portal_sessions == []


def test_cancel_without_subscription_is_rejected(client, stripe_fake):
    user = make_user()
    response = client.post("/api/subscription/cancel", headers=user["headers"])
    assert response.status_code == 400, response.text
    assert stripe_fake.modifies == []


def test_subscription_deleted_downgrades_to_free(client, stripe_fake):
    user = make_pro_user(client, stripe_fake)
    ended = dict(stripe_fake.subscriptions[user["subscription_id"]], status="canceled")
    stripe_fake.subscriptions[user["subscription_id"]] = ended

    post_event(client, "customer.subscription.deleted", ended)

    assert _subscription(client, user)["tier"] == "free"


def test_subscription_deleted_keeps_pro_when_another_sub_is_active(client, stripe_fake):
    user = make_pro_user(client, stripe_fake)
    # A second active subscription on the same customer (e.g. made in the portal).
    replacement = dict(stripe_fake.subscriptions[user["subscription_id"]], id="sub_fakereplacement01")
    stripe_fake.subscriptions[replacement["id"]] = replacement
    ended = dict(stripe_fake.subscriptions[user["subscription_id"]], status="canceled")
    stripe_fake.subscriptions[user["subscription_id"]] = ended

    post_event(client, "customer.subscription.deleted", ended)

    info = _subscription(client, user)
    assert info["tier"] == "pro"
    assert info["subscription"]["stripeSubscriptionId"] == replacement["id"]
