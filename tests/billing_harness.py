"""Shared fakes for Postgres billing integration tests (PP-152, PP-153).

Stripe API calls are replaced with an in-memory fake, and webhooks are signed
locally with a throwaway secret and posted to the real /api/webhooks/stripe
route (real stripe.Webhook.construct_event). No network, no Stripe account,
no real customer.
"""

from __future__ import annotations

import hashlib
import hmac
import json
import time
import uuid
from types import SimpleNamespace

WEBHOOK_SECRET = "not-a-real-stripe-webhook-secret"
PRO_MONTHLY_PRICE = "price_1PP152ProMonthlyFake"
SITE = "https://pantryhub.example.test"


def _obj(data: dict) -> SimpleNamespace:
    """Stripe objects expose attributes; the router reads `.url` / `.status`."""
    ns = SimpleNamespace(**data)
    ns.get = data.get  # handlers also call .get() on some objects
    ns.to_dict = lambda: dict(data)
    return ns


class _Listed:
    def __init__(self, rows: list[dict]):
        self.data = rows

    def auto_paging_iter(self):
        return iter(self.data)


class FakeStripe:
    """In-memory Stripe: customers, checkout sessions, subscriptions, portal."""

    def __init__(self, monkeypatch):
        import stripe

        from backend.services import stripe_service

        self.customers: dict[str, dict] = {}
        self.sessions: dict[str, dict] = {}
        self.subscriptions: dict[str, dict] = {}
        self.portal_sessions: list[dict] = []
        self.checkout_creates: list[dict] = []
        self.modifies: list[tuple[str, dict]] = []

        monkeypatch.setenv("STRIPE_WEBHOOK_SECRET", WEBHOOK_SECRET)
        monkeypatch.setenv("FRONTEND_URL", SITE)
        monkeypatch.delenv("STRIPE_PRO_FIRST_MONTH_COUPON_ID", raising=False)
        monkeypatch.setitem(stripe_service.PRICE_IDS["pro"], "month", PRO_MONTHLY_PRICE)

        monkeypatch.setattr(stripe.Customer, "create", self._customer_create)
        monkeypatch.setattr(stripe.Customer, "retrieve", lambda cid, **k: _obj(self.customers[cid]))
        monkeypatch.setattr(stripe.Customer, "modify", self._customer_modify)
        monkeypatch.setattr(stripe.checkout.Session, "create", self._session_create)
        monkeypatch.setattr(stripe.checkout.Session, "list", self._session_list)
        monkeypatch.setattr(stripe.checkout.Session, "retrieve", lambda sid, **k: _obj(self.sessions[sid]))
        monkeypatch.setattr(stripe.Subscription, "retrieve", lambda sid, **k: dict(self.subscriptions[sid]))
        monkeypatch.setattr(stripe.Subscription, "list", self._subscription_list)
        monkeypatch.setattr(stripe.Subscription, "modify", self._subscription_modify)
        monkeypatch.setattr(stripe.billing_portal.Session, "create", self._portal_create)

    # customers
    def _customer_create(self, **params):
        cid = f"cus_fake{uuid.uuid4().hex[:12]}"
        self.customers[cid] = {"id": cid, **params}
        return _obj(self.customers[cid])

    def _customer_modify(self, cid, **updates):
        self.customers[cid].update(updates)
        return _obj(self.customers[cid])

    # checkout
    def _session_create(self, **params):
        self.checkout_creates.append(params)
        sid = f"cs_fake{uuid.uuid4().hex[:16]}"
        self.sessions[sid] = {
            "id": sid,
            "object": "checkout.session",
            "mode": params["mode"],
            "status": "open",
            "payment_status": "unpaid",
            "customer": params["customer"],
            "metadata": dict(params.get("metadata") or {}),
            "subscription_data": params.get("subscription_data") or {},
            "url": f"https://checkout.stripe.example.test/c/{sid}",
            "amount_total": 499,
            "currency": "usd",
        }
        return _obj(self.sessions[sid])

    def _session_list(self, customer=None, status=None, **kwargs):
        rows = [
            s for s in self.sessions.values()
            if (customer is None or s["customer"] == customer) and (status is None or s["status"] == status)
        ]
        return _Listed(rows)

    def pay(self, session_id: str) -> dict:
        """Simulate the customer finishing Stripe Checkout with a test card."""
        session = self.sessions[session_id]
        now = int(time.time())
        sub_id = f"sub_fake{uuid.uuid4().hex[:12]}"
        self.subscriptions[sub_id] = {
            "id": sub_id,
            "object": "subscription",
            "customer": session["customer"],
            "status": "active",
            "cancel_at_period_end": False,
            "metadata": dict((session["subscription_data"] or {}).get("metadata") or {}),
            "items": {
                "data": [
                    {
                        "price": {"id": PRO_MONTHLY_PRICE},
                        "current_period_start": now,
                        "current_period_end": now + 30 * 86400,
                    }
                ]
            },
        }
        session.update(status="complete", payment_status="paid", subscription=sub_id, url=None)
        return session

    # subscriptions
    def _subscription_list(self, customer=None, status=None, **kwargs):
        rows = [
            dict(s) for s in self.subscriptions.values()
            if s["customer"] == customer and (status in (None, "all") or s["status"] == status)
        ]
        return _Listed(rows)

    def _subscription_modify(self, sid, **updates):
        self.modifies.append((sid, updates))
        self.subscriptions[sid].update(updates)
        return _obj(dict(self.subscriptions[sid]))

    # portal
    def _portal_create(self, customer, return_url, **kwargs):
        session = {"id": f"bps_fake{uuid.uuid4().hex[:12]}", "customer": customer, "return_url": return_url,
                   "url": f"https://billing.stripe.example.test/p/{customer}"}
        self.portal_sessions.append(session)
        return _obj(session)


def post_event(client, event_type: str, obj: dict, event_id: str | None = None):
    """Sign an event like Stripe does and post it to the real webhook route."""
    event = {
        "id": event_id or f"evt_fake{uuid.uuid4().hex[:16]}",
        "object": "event",
        "type": event_type,
        "data": {"object": obj},
    }
    payload = json.dumps(event, default=str)
    ts = int(time.time())
    sig = hmac.new(WEBHOOK_SECRET.encode(), f"{ts}.{payload}".encode(), hashlib.sha256).hexdigest()
    response = client.post(
        "/api/webhooks/stripe",
        content=payload.encode(),
        headers={"stripe-signature": f"t={ts},v1={sig}", "content-type": "application/json"},
    )
    assert response.status_code == 200, response.text
    return event["id"]


def make_user() -> dict:
    """Insert a Free test user (NextAuth users row) and return id, email, headers."""
    from database.db import db_connection

    user_id = str(uuid.uuid4())
    email = f"billing-{uuid.uuid4().hex[:10]}@example.test"
    with db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("INSERT INTO users (id, name, email) VALUES (%s, %s, %s)", (user_id, "Test Shopper", email))
    return {
        "id": user_id,
        "email": email,
        "headers": {"Authorization": "Bearer test-token", "x-user-id": user_id},
    }


def make_pro_user(client, fake: FakeStripe) -> dict:
    """Free user -> checkout -> paid -> signed checkout.session.completed -> Pro."""
    user = make_user()
    response = client.post(
        "/api/subscription/checkout",
        json={
            "tier": "pro",
            "billingInterval": "month",
            "successUrl": f"{SITE}/checkout/success?session_id={{CHECKOUT_SESSION_ID}}",
            "cancelUrl": f"{SITE}/checkout/cancel",
        },
        headers=user["headers"],
    )
    assert response.status_code == 200, response.text
    session = fake.pay(response.json()["data"]["sessionId"])
    post_event(client, "checkout.session.completed", session)
    user["subscription_id"] = session["subscription"]
    user["customer_id"] = session["customer"]
    return user
