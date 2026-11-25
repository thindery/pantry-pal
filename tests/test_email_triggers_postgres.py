"""PP-154: transactional emails fire on their real triggers (Postgres integration).

Drives the welcome endpoint and signed Stripe webhooks end to end against a real
database. Stripe API reads and the Resend send are replaced with in-process fakes,
so no network call is made and no real address is ever emailed.

Run with RUN_POSTGRES_TESTS=1 and DATABASE_URL (see `npm run test:postgres`).
"""

from __future__ import annotations

import hashlib
import hmac
import json
import os
import time
import uuid

import pytest

pytestmark = pytest.mark.skipif(
    os.environ.get("RUN_POSTGRES_TESTS") != "1",
    reason="Set RUN_POSTGRES_TESTS=1 and DATABASE_URL to run",
)

WEBHOOK_SECRET = "not-a-real-stripe-webhook-secret"
FROM_ADDRESS = "Pantry Hub Test <hello@example.test>"


@pytest.fixture(scope="module", autouse=True)
def _migrated():
    from database.migrate import migrate

    migrate()


@pytest.fixture
def sent(monkeypatch):
    """Capture Resend payloads instead of calling the Resend API."""
    import resend

    captured: list[dict] = []

    def fake_send(params):
        captured.append(params)
        return {"id": f"test-resend-{len(captured)}"}

    monkeypatch.setenv("RESEND_API_KEY", "not-a-real-resend-key")
    monkeypatch.setenv("RESEND_FROM_EMAIL", FROM_ADDRESS)
    monkeypatch.setattr(resend.Emails, "send", staticmethod(fake_send))
    return captured


@pytest.fixture
def user():
    from database.db import db_connection

    user_id = str(uuid.uuid4())
    email = f"pp154-{uuid.uuid4().hex[:10]}@example.test"
    with db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "INSERT INTO users (id, name, email) VALUES (%s, %s, %s)",
                (user_id, "Test Shopper", email),
            )
    return {"id": user_id, "email": email}


class FakeStripe:
    """Minimal stand-in for the Stripe reads the webhook handlers make."""

    def __init__(self, monkeypatch):
        import stripe

        self.subscriptions: dict[str, dict] = {}
        monkeypatch.setattr(stripe.Subscription, "retrieve", self._retrieve)
        monkeypatch.setattr(stripe.Subscription, "list", self._list)
        monkeypatch.setattr(stripe.Customer, "retrieve", self._customer)
        monkeypatch.setenv("STRIPE_WEBHOOK_SECRET", WEBHOOK_SECRET)

    def _retrieve(self, sub_id, *args, **kwargs):
        return self.subscriptions[sub_id]

    def _list(self, *args, **kwargs):
        class _Empty:
            def auto_paging_iter(self):
                return iter(())

        return _Empty()

    def _customer(self, customer_id, *args, **kwargs):
        raise AssertionError("recipient should come from the users table, not Stripe")


@pytest.fixture
def fake_stripe(monkeypatch):
    return FakeStripe(monkeypatch)


def _subscription(user_id: str, **overrides) -> dict:
    now = int(time.time())
    sub = {
        "id": f"sub_test_{uuid.uuid4().hex[:12]}",
        "customer": f"cus_test_{uuid.uuid4().hex[:12]}",
        "status": "active",
        "cancel_at_period_end": False,
        "metadata": {"userId": user_id, "tier": "pro"},
        "items": {
            "data": [
                {
                    "price": {"id": "price_test_pro"},
                    "current_period_start": now,
                    "current_period_end": now + 30 * 86400,
                }
            ]
        },
    }
    sub.update(overrides)
    return sub


def _post_event(client, event_type: str, obj: dict, event_id: str | None = None):
    event = {
        "id": event_id or f"evt_test_{uuid.uuid4().hex[:16]}",
        "object": "event",
        "type": event_type,
        "data": {"object": obj},
    }
    payload = json.dumps(event)
    ts = int(time.time())
    sig = hmac.new(WEBHOOK_SECRET.encode(), f"{ts}.{payload}".encode(), hashlib.sha256).hexdigest()
    response = client.post(
        "/api/webhooks/stripe",
        content=payload.encode(),
        headers={"stripe-signature": f"t={ts},v1={sig}", "content-type": "application/json"},
    )
    assert response.status_code == 200, response.text
    return event["id"]


def _rows(key: str) -> list[dict]:
    from database.db import db_connection

    with db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT template, idempotency_key, resend_id, to_email, status FROM email_sends WHERE idempotency_key = %s",
                (key,),
            )
            return list(cur.fetchall())


def _assert_one_send(sent: list[dict], rows: list[dict], user: dict, template: str):
    assert len(sent) == 1, sent
    assert sent[0]["to"] == [user["email"]]
    assert sent[0]["from"] == FROM_ADDRESS
    assert len(rows) == 1, rows
    assert rows[0]["template"] == template
    assert rows[0]["to_email"] == user["email"]
    assert rows[0]["resend_id"] == "test-resend-1"


def test_welcome_sent_once_per_user(client, sent, user):
    headers = {"Authorization": "Bearer test-token", "x-user-id": user["id"]}

    first = client.post("/api/emails/welcome", headers=headers)
    assert first.status_code == 200, first.text
    assert first.json()["data"]["sent"] is True

    retry = client.post("/api/emails/welcome", headers=headers)
    assert retry.status_code == 200, retry.text
    assert retry.json()["data"] == {"sent": False, "reason": "already_sent"}

    _assert_one_send(sent, _rows(f"welcome:{user['id']}"), user, "welcome")


def test_invoice_paid_sends_payment_confirmation_once(client, sent, user, fake_stripe):
    sub = _subscription(user["id"])
    fake_stripe.subscriptions[sub["id"]] = sub
    invoice = {
        "id": f"in_test_{uuid.uuid4().hex[:12]}",
        "customer": sub["customer"],
        "subscription": sub["id"],
        "amount_paid": 499,
        "currency": "usd",
    }

    event_id = _post_event(client, "invoice.paid", invoice)
    # Stripe redelivers the same event, then a second event for the same invoice.
    _post_event(client, "invoice.paid", invoice, event_id=event_id)
    _post_event(client, "invoice.paid", invoice)

    _assert_one_send(sent, _rows(f"invoice.paid:{invoice['id']}"), user, "payment_confirmation")


def test_invoice_failed_sends_payment_failed_once(client, sent, user, fake_stripe):
    sub = _subscription(user["id"])
    fake_stripe.subscriptions[sub["id"]] = sub
    invoice = {
        "id": f"in_test_{uuid.uuid4().hex[:12]}",
        "customer": sub["customer"],
        "subscription": sub["id"],
        "amount_due": 499,
        "currency": "usd",
    }

    _post_event(client, "invoice.payment_failed", invoice)
    _post_event(client, "invoice.payment_failed", invoice)

    _assert_one_send(sent, _rows(f"invoice.failed:{invoice['id']}"), user, "payment_failed")


def test_cancel_scheduled_and_subscription_ended_send_once(client, sent, user, fake_stripe):
    sub = _subscription(user["id"])
    fake_stripe.subscriptions[sub["id"]] = sub
    _post_event(client, "customer.subscription.created", sub)
    assert sent == []

    scheduled = dict(sub, cancel_at_period_end=True)
    _post_event(client, "customer.subscription.updated", scheduled)
    _post_event(client, "customer.subscription.updated", scheduled)
    _assert_one_send(sent, _rows(f"cancel.scheduled:{sub['id']}"), user, "cancellation_scheduled")

    sent.clear()
    ended = dict(scheduled, status="canceled")
    _post_event(client, "customer.subscription.deleted", ended)
    _post_event(client, "customer.subscription.deleted", ended)
    rows = _rows(f"cancel.ended:{sub['id']}")
    assert len(sent) == 1, sent
    assert sent[0]["to"] == [user["email"]]
    assert len(rows) == 1 and rows[0]["template"] == "subscription_ended"


def test_unconfigured_resend_skips_without_error(monkeypatch, user):
    import resend

    from backend.services import email_service

    def must_not_send(params):
        raise AssertionError("Resend must not be called without an API key")

    monkeypatch.delenv("RESEND_API_KEY", raising=False)
    monkeypatch.setenv("RESEND_FROM_EMAIL", FROM_ADDRESS)
    monkeypatch.setattr(resend.Emails, "send", staticmethod(must_not_send))

    result = email_service.send_welcome(user["id"], user["email"], "Test Shopper")

    assert result == {"skipped": True, "reason": "not_configured"}
    assert _rows(f"welcome:{user['id']}") == []
