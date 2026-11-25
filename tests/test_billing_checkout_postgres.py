"""PP-152: Free user -> Stripe Checkout -> webhook -> active Pro (Postgres integration).

Runs the real subscription and webhook routes against a real database. Stripe is
an in-memory fake (tests/billing_harness.py) and webhooks are signed locally, so
no Stripe account, live key, or real customer is involved. Run with
RUN_POSTGRES_TESTS=1 (`npm run test:postgres`).
"""

from __future__ import annotations

import os

import pytest

from billing_harness import PRO_MONTHLY_PRICE, SITE, FakeStripe, make_user, post_event

pytestmark = pytest.mark.skipif(
    os.environ.get("RUN_POSTGRES_TESTS") != "1",
    reason="Set RUN_POSTGRES_TESTS=1 and DATABASE_URL to run",
)

CHECKOUT_BODY = {
    "tier": "pro",
    "billingInterval": "month",
    "successUrl": f"{SITE}/checkout/success?session_id={{CHECKOUT_SESSION_ID}}",
    "cancelUrl": f"{SITE}/checkout/cancel",
}


@pytest.fixture(scope="module", autouse=True)
def _migrated():
    from database.migrate import migrate

    migrate()


@pytest.fixture(autouse=True)
def _no_email(monkeypatch):
    # Payment emails are asserted in PP-154; keep Resend unconfigured here.
    monkeypatch.delenv("RESEND_API_KEY", raising=False)


@pytest.fixture
def stripe_fake(monkeypatch):
    return FakeStripe(monkeypatch)


def _tier(client, user) -> dict:
    response = client.get("/api/subscription/tier", headers=user["headers"])
    assert response.status_code == 200, response.text
    return response.json()["data"]


def _status(client, user) -> dict:
    response = client.get("/api/subscription/status", headers=user["headers"])
    assert response.status_code == 200, response.text
    return response.json()["data"]


def _start_checkout(client, user) -> dict:
    response = client.post("/api/subscription/checkout", json=CHECKOUT_BODY, headers=user["headers"])
    assert response.status_code == 200, response.text
    return response.json()["data"]


def test_checkout_webhook_grants_pro_and_blocks_duplicate(client, stripe_fake):
    user = make_user()
    assert _tier(client, user)["tier"] == "free"

    started = _start_checkout(client, user)
    assert started["url"].startswith("https://checkout.stripe.example.test/")
    [create] = stripe_fake.checkout_creates
    assert create["line_items"] == [{"price": PRO_MONTHLY_PRICE, "quantity": 1}]
    assert create["metadata"] == {"userId": user["id"], "tier": "pro"}
    assert create["customer"] in stripe_fake.customers
    assert stripe_fake.customers[create["customer"]]["email"] == user["email"]

    # Abandoning and retrying reuses the still-open session (no second session).
    again = _start_checkout(client, user)
    assert again["sessionId"] == started["sessionId"]
    assert len(stripe_fake.checkout_creates) == 1

    session = stripe_fake.pay(started["sessionId"])
    assert _tier(client, user)["tier"] == "free"  # nothing granted before the webhook

    post_event(client, "checkout.session.completed", session)

    info = _tier(client, user)
    assert info["tier"] == "pro"
    assert info["subscription"]["status"] == "active"
    assert info["subscription"]["stripeSubscriptionId"] == session["subscription"]
    assert info["subscription"]["cancelAtPeriodEnd"] is False
    assert _status(client, user) == {
        "tier": "pro",
        "isPaid": True,
        "isActive": True,
        "subscriptionStatus": "active",
    }

    # PP-089: a second checkout goes to the billing portal, not a new subscription.
    second = _start_checkout(client, user)
    assert second["url"].startswith("https://billing.stripe.example.test/")
    assert len(stripe_fake.checkout_creates) == 1
    assert len([s for s in stripe_fake.subscriptions.values() if s["status"] == "active"]) == 1


def test_success_page_confirm_grants_pro_before_webhook(client, stripe_fake):
    user = make_user()
    started = _start_checkout(client, user)
    stripe_fake.pay(started["sessionId"])

    confirm = client.post(
        "/api/subscription/checkout/confirm",
        json={"sessionId": started["sessionId"]},
        headers=user["headers"],
    )
    assert confirm.status_code == 200, confirm.text
    data = confirm.json()["data"]
    assert data["confirmed"] is True and data["tier"] == "pro"
    assert _tier(client, user)["tier"] == "pro"

    # The late webhook is a no-op refresh of the same subscription.
    post_event(client, "checkout.session.completed", stripe_fake.sessions[started["sessionId"]])
    info = _tier(client, user)
    assert info["tier"] == "pro"
    assert info["subscription"]["stripeSubscriptionId"] == stripe_fake.sessions[started["sessionId"]]["subscription"]


def test_confirm_rejects_another_users_session(client, stripe_fake):
    owner = make_user()
    other = make_user()
    started = _start_checkout(client, owner)
    stripe_fake.pay(started["sessionId"])

    response = client.post(
        "/api/subscription/checkout/confirm",
        json={"sessionId": started["sessionId"]},
        headers=other["headers"],
    )
    assert response.status_code == 404, response.text
    assert _tier(client, other)["tier"] == "free"


def test_unpaid_session_webhook_grants_nothing(client, stripe_fake):
    user = make_user()
    started = _start_checkout(client, user)
    open_session = dict(stripe_fake.sessions[started["sessionId"]])

    # An open (unpaid) session has no subscription id, so the handler must not grant.
    post_event(client, "checkout.session.completed", open_session)
    assert _tier(client, user)["tier"] == "free"
