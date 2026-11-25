"""PP-177: refunds on API 2025-03-31.basil+ payloads (no `charge.invoice`), Postgres.

This account's webhooks are on 2026-06-24.dahlia, where a Charge has no
`invoice` field; the invoice is found through InvoicePayment by payment intent.
Stripe is an in-memory fake (tests/billing_harness.py); events are signed
locally. Run with RUN_POSTGRES_TESTS=1 (`npm run test:postgres`).
"""

from __future__ import annotations

import os
import uuid

import pytest

from billing_harness import FakeStripe, make_pro_user, post_event

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
    monkeypatch.delenv("RESEND_API_KEY", raising=False)


@pytest.fixture
def stripe_fake(monkeypatch):
    import stripe

    fake = FakeStripe(monkeypatch)
    fake.invoices = {}
    fake.invoice_payments = {}  # payment_intent -> invoice id

    def _invoice_payments(payment=None, **kwargs):
        invoice_id = fake.invoice_payments.get((payment or {}).get("payment_intent"))
        return {"object": "list", "data": [{"object": "invoice_payment", "invoice": invoice_id}] if invoice_id else []}

    monkeypatch.setattr(stripe.InvoicePayment, "list", _invoice_payments)
    monkeypatch.setattr(stripe.Invoice, "retrieve", lambda iid, **k: dict(fake.invoices[iid]))
    return fake


def _paid_invoice(client, fake, user, subscription_id: str) -> tuple[dict, str]:
    """Post a dahlia-shaped invoice.paid and return (invoice, payment_intent)."""
    invoice = {
        "id": f"in_fake{uuid.uuid4().hex[:12]}",
        "object": "invoice",
        "customer": user["customer_id"],
        "amount_paid": 499,
        "currency": "usd",
        "parent": {"subscription_details": {"subscription": subscription_id}},
    }
    payment_intent = f"pi_fake{uuid.uuid4().hex[:12]}"
    fake.invoices[invoice["id"]] = invoice
    fake.invoice_payments[payment_intent] = invoice["id"]
    post_event(client, "invoice.paid", invoice)
    return invoice, payment_intent


def _refund(client, user, payment_intent: str, refunded: int = 499):
    charge = {
        "id": f"ch_fake{uuid.uuid4().hex[:12]}",
        "object": "charge",
        "amount": 499,
        "amount_refunded": refunded,
        "refunded": refunded >= 499,
        "currency": "usd",
        "customer": user["customer_id"],
        "payment_intent": payment_intent,
        "status": "succeeded",
    }  # no "invoice" key, like real dahlia payloads
    post_event(client, "charge.refunded", charge)


def _transactions(user_id: str) -> list[dict]:
    from database.db import db_connection

    with db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT stripe_invoice_id, stripe_subscription_id, status, amount_cents FROM admin_transactions WHERE user_id = %s",
                (user_id,),
            )
            return list(cur.fetchall())


def _tier(client, user) -> str:
    response = client.get("/api/subscription/tier", headers=user["headers"])
    assert response.status_code == 200, response.text
    return response.json()["data"]["tier"]


def test_full_refund_marks_the_paid_invoice_refunded_and_downgrades(client, stripe_fake):
    user = make_pro_user(client, stripe_fake)
    invoice, payment_intent = _paid_invoice(client, stripe_fake, user, user["subscription_id"])
    assert [r["status"] for r in _transactions(user["id"])] == ["succeeded"]

    _refund(client, user, payment_intent)

    rows = _transactions(user["id"])
    assert len(rows) == 1, rows  # the paid row is updated, not shadowed by a second row
    assert rows[0]["stripe_invoice_id"] == invoice["id"]
    assert rows[0]["status"] == "refunded"
    # PP-094 rule: full refund of the only entitlement-granting subscription.
    assert _tier(client, user) == "free"


def test_refund_of_a_duplicate_keeps_pro(client, stripe_fake):
    user = make_pro_user(client, stripe_fake)
    _paid_invoice(client, stripe_fake, user, user["subscription_id"])
    duplicate = dict(stripe_fake.subscriptions[user["subscription_id"]], id=f"sub_fakedup{uuid.uuid4().hex[:8]}")
    stripe_fake.subscriptions[duplicate["id"]] = duplicate
    dup_invoice, dup_pi = _paid_invoice(client, stripe_fake, user, duplicate["id"])

    _refund(client, user, dup_pi)

    by_invoice = {r["stripe_invoice_id"]: r["status"] for r in _transactions(user["id"])}
    assert by_invoice[dup_invoice["id"]] == "refunded"
    assert sorted(by_invoice.values()) == ["refunded", "succeeded"]
    assert _tier(client, user) == "pro"


def test_partial_refund_records_but_keeps_pro(client, stripe_fake):
    user = make_pro_user(client, stripe_fake)
    _, payment_intent = _paid_invoice(client, stripe_fake, user, user["subscription_id"])

    _refund(client, user, payment_intent, refunded=200)

    rows = _transactions(user["id"])
    assert [r["status"] for r in rows] == ["refunded"]
    assert rows[0]["amount_cents"] == 200
    assert _tier(client, user) == "pro"
