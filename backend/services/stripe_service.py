"""Stripe billing and webhook handling (PP-028).

Product/price provisioning is idempotent via:
- Product metadata: app=pantry_hub, tier={pro|family}
- Price lookup_keys: pantry_hub_{tier}_{month|year}

Never creates duplicates on deploy/restart when catalog already exists.
"""

from __future__ import annotations

import os
from datetime import datetime, timezone
from typing import Any, Optional

import stripe

import re
import uuid

from psycopg2.extras import Json

from backend.services import admin_service, email_service, first_month_offer
from backend.services.subscription_service import (
    downgrade_to_free,
    get_user_subscription,
    update_user_subscription,
)
from backend.services.user_profile import get_user_contact, get_user_id_by_customer
from database.db import db_connection

stripe.api_key = os.getenv("STRIPE_SECRET_KEY", "")

# App-scoped identifiers — stable forever so restarts never double-create.
APP_METADATA = "pantry_hub"

CATALOG: dict[str, dict[str, Any]] = {
    "pro": {
        "name": "Pantry Hub Pro",
        "description": (
            "Unlimited items, receipt scanning, multi-device sync, and priority features"
        ),
        "prices": {
            "month": {
                "amount": 499,
                "lookup_key": "pantry_hub_pro_month",
                "nickname": "Pro Monthly",
                "env": "STRIPE_PRO_MONTHLY_PRICE_ID",
            },
            "year": {
                "amount": 3999,
                "lookup_key": "pantry_hub_pro_year",
                "nickname": "Pro Yearly",
                "env": "STRIPE_PRO_YEARLY_PRICE_ID",
            },
        },
    },
    "family": {
        "name": "Pantry Hub Family",
        "description": (
            "Everything in Pro plus household sharing for up to 5 members"
        ),
        "prices": {
            "month": {
                "amount": 799,
                "lookup_key": "pantry_hub_family_month",
                "nickname": "Family Monthly",
                "env": "STRIPE_FAMILY_MONTHLY_PRICE_ID",
            },
            "year": {
                "amount": 5999,
                "lookup_key": "pantry_hub_family_year",
                "nickname": "Family Yearly",
                "env": "STRIPE_FAMILY_YEARLY_PRICE_ID",
            },
        },
    },
}

PRICE_IDS: dict[str, dict[str, str]] = {
    "pro": {
        "month": os.getenv("STRIPE_PRO_MONTHLY_PRICE_ID", ""),
        "year": os.getenv("STRIPE_PRO_YEARLY_PRICE_ID", ""),
    },
    "family": {
        "month": os.getenv("STRIPE_FAMILY_MONTHLY_PRICE_ID", ""),
        "year": os.getenv("STRIPE_FAMILY_YEARLY_PRICE_ID", ""),
    },
}


def _is_real_price_id(price_id: str | None) -> bool:
    if not price_id:
        return False
    pid = price_id.strip()
    if not pid.startswith("price_"):
        return False
    # Placeholders / product IDs / example values
    bad = ("YOUR", "placeholder", "live_pro", "live_family", "test_pro", "test_family", "prod_")
    return not any(b.lower() in pid.lower() for b in bad)


def get_price_ids() -> dict[str, Any]:
    return {
        "pro": {"monthly": PRICE_IDS["pro"]["month"], "yearly": PRICE_IDS["pro"]["year"]},
        "family": {"monthly": PRICE_IDS["family"]["month"], "yearly": PRICE_IDS["family"]["year"]},
    }



def _obj_get(obj: Any, key: str, default: Any = None) -> Any:
    """Read attribute from StripeObject or dict."""
    if obj is None:
        return default
    if isinstance(obj, dict):
        return obj.get(key, default)
    return getattr(obj, key, default)


def _subscription_item(sub: Any) -> Any:
    items = _obj_get(sub, "items")
    data = _obj_get(items, "data") or []
    return data[0] if data else None


def _period_unix(sub: Any) -> tuple[Any, Any]:
    """Period start/end live on the subscription item in current Stripe API versions."""
    start = _obj_get(sub, "current_period_start")
    end = _obj_get(sub, "current_period_end")
    if not start or not end:
        item = _subscription_item(sub)
        start = start or _obj_get(item, "current_period_start")
        end = end or _obj_get(item, "current_period_end")
    return start, end


def _iso_from_unix(ts: Any) -> Optional[str]:
    if not ts:
        return None
    return datetime.fromtimestamp(int(ts), tz=timezone.utc).isoformat()


def _price_id_from_sub(sub: Any) -> Optional[str]:
    item = _subscription_item(sub)
    price = _obj_get(item, "price")
    if isinstance(price, str):
        return price
    return _obj_get(price, "id")


def _subscription_id_from_invoice(invoice: dict[str, Any]) -> Optional[str]:
    sub = invoice.get("subscription")
    if isinstance(sub, dict):
        return sub.get("id")
    if sub:
        return sub
    parent = invoice.get("parent") or {}
    details = parent.get("subscription_details") or {}
    return details.get("subscription")


def _find_product_for_tier(tier: str) -> Optional[Any]:
    """Find existing product by metadata (preferred) or exact catalog name."""
    name = CATALOG[tier]["name"]
    products = stripe.Product.list(limit=100, active=True)
    for product in products.auto_paging_iter():
        meta = _obj_get(product, "metadata") or {}
        if isinstance(meta, dict):
            app = meta.get("app")
            product_tier = meta.get("tier")
        else:
            app = getattr(meta, "app", None)
            product_tier = getattr(meta, "tier", None)
        if app == APP_METADATA and product_tier == tier:
            return product
        if _obj_get(product, "name") == name:
            return product
    return None


def _price_by_lookup_key(lookup_key: str) -> Optional[Any]:
    result = stripe.Price.list(lookup_keys=[lookup_key], active=True, limit=1)
    if result.data:
        return result.data[0]
    result = stripe.Price.list(lookup_keys=[lookup_key], active=False, limit=1)
    return result.data[0] if result.data else None


def _price_for_interval(product_id: str, interval: str) -> Optional[Any]:
    prices = stripe.Price.list(product=product_id, active=True, limit=20)
    for price in prices.auto_paging_iter():
        recurring = _obj_get(price, "recurring") or {}
        rec_interval = (
            recurring.get("interval")
            if isinstance(recurring, dict)
            else getattr(recurring, "interval", None)
        )
        if rec_interval == interval:
            return price
    return None


def ensure_stripe_products() -> dict[str, dict[str, str]]:
    """Idempotently ensure Pro/Family products and prices exist; update PRICE_IDS.

    Safe to call on every process start / deploy. Uses lookup_keys + product
    metadata so restarts never create duplicate products or prices.
    """
    if not stripe.api_key or stripe.api_key in ("", "sk_test_dummy", "sk_test_YOUR_STRIPE_SECRET_KEY"):
        print("[STRIPE] SKIPPED ensure_stripe_products — no usable secret key")
        return get_price_ids()

    try:
        for tier, plan in CATALOG.items():
            product = _find_product_for_tier(tier)
            if product is None:
                product = stripe.Product.create(
                    name=plan["name"],
                    description=plan["description"],
                    metadata={"app": APP_METADATA, "tier": tier},
                )
                print(f"[STRIPE] Created product {plan['name']} ({product.id})")
            else:
                meta = _obj_get(product, "metadata") or {}
                app = meta.get("app") if isinstance(meta, dict) else getattr(meta, "app", None)
                product_tier = (
                    meta.get("tier") if isinstance(meta, dict) else getattr(meta, "tier", None)
                )
                if app != APP_METADATA or product_tier != tier:
                    stripe.Product.modify(
                        product.id,
                        metadata={"app": APP_METADATA, "tier": tier},
                    )
                print(f"[STRIPE] Reusing product {plan['name']} ({product.id})")

            for interval, price_spec in plan["prices"].items():
                lookup_key = price_spec["lookup_key"]
                resolved: Optional[str] = None

                env_val = os.getenv(price_spec["env"], "") or PRICE_IDS[tier].get(interval, "")
                if _is_real_price_id(env_val):
                    try:
                        existing = stripe.Price.retrieve(env_val)
                        if existing and not _obj_get(existing, "deleted"):
                            resolved = existing.id
                    except Exception:
                        resolved = None

                if not resolved:
                    by_key = _price_by_lookup_key(lookup_key)
                    if by_key:
                        resolved = by_key.id

                if not resolved:
                    by_interval = _price_for_interval(product.id, interval)
                    if by_interval:
                        if not _obj_get(by_interval, "lookup_key"):
                            try:
                                stripe.Price.modify(by_interval.id, lookup_key=lookup_key)
                            except Exception as exc:
                                print(
                                    f"[STRIPE] Could not set lookup_key on {by_interval.id}: {exc}"
                                )
                        resolved = by_interval.id

                if not resolved:
                    created = stripe.Price.create(
                        product=product.id,
                        unit_amount=price_spec["amount"],
                        currency="usd",
                        recurring={"interval": interval},
                        nickname=price_spec["nickname"],
                        lookup_key=lookup_key,
                        metadata={
                            "app": APP_METADATA,
                            "tier": tier,
                            "interval": interval,
                        },
                    )
                    resolved = created.id
                    print(
                        f"[STRIPE] Created price {price_spec['nickname']} "
                        f"({resolved}) lookup_key={lookup_key}"
                    )
                else:
                    print(
                        f"[STRIPE] Reusing price {price_spec['nickname']} "
                        f"({resolved}) lookup_key={lookup_key}"
                    )

                PRICE_IDS[tier][interval] = resolved

        print(
            "[STRIPE] Catalog ready: "
            f"pro month={PRICE_IDS['pro']['month']} year={PRICE_IDS['pro']['year']}; "
            f"family month={PRICE_IDS['family']['month']} year={PRICE_IDS['family']['year']}"
        )
        return get_price_ids()
    except Exception as exc:
        print(f"[STRIPE] ensure_stripe_products failed: {exc}")
        return get_price_ids()


def _to_dict(obj: Any) -> Any:
    """Normalize Stripe objects so webhook handlers can use dict .get()."""
    if obj is None or isinstance(obj, (str, int, float, bool)):
        return obj
    if isinstance(obj, dict):
        return {key: _to_dict(value) for key, value in obj.items()}
    if isinstance(obj, list):
        return [_to_dict(value) for value in obj]
    to_dict_recursive = getattr(obj, "to_dict_recursive", None)
    if callable(to_dict_recursive):
        return to_dict_recursive()
    to_dict = getattr(obj, "to_dict", None)
    if callable(to_dict):
        return _to_dict(to_dict())
    return obj


def _is_active_or_trialing(status: Any) -> bool:
    return str(status or "").lower() in {"active", "trialing"}


def _first_active_subscription(customer_id: Optional[str], exclude_id: Optional[str] = None) -> Optional[dict[str, Any]]:
    if not customer_id:
        return None
    for status in ("active", "trialing"):
        listed = stripe.Subscription.list(customer=customer_id, status=status, limit=20)
        for raw in listed.auto_paging_iter():
            sub = _to_dict(raw)
            if exclude_id and sub.get("id") == exclude_id:
                continue
            if _is_active_or_trialing(sub.get("status")):
                return sub
    return None


def _open_checkout_session(
    customer_id: str, price_id: str, offer_marker: str = ""
) -> Optional[dict[str, str]]:
    listed = stripe.checkout.Session.list(customer=customer_id, status="open", limit=10)
    for raw in listed.auto_paging_iter():
        session = _to_dict(raw)
        if session.get("mode") != "subscription" or not session.get("url"):
            continue
        # PP-166: only reuse a session whose offer marker matches, so the first-month
        # price is never served to (or withheld from) the wrong checkout.
        if ((session.get("metadata") or {}).get("offer") or "") != offer_marker:
            continue
        return {"sessionId": session["id"], "url": session["url"]}
    return None


def _has_ever_subscribed(customer_id: str, stored: Optional[dict[str, Any]]) -> bool:
    """True if this account has any past or present subscription (offer is first-time only)."""
    if (stored or {}).get("stripeSubscriptionId"):
        return True
    try:
        listed = stripe.Subscription.list(customer=customer_id, status="all", limit=1)
        data = _obj_get(listed, "data") or []
        return len(data) > 0
    except Exception:
        # Fail safe: if Stripe cannot confirm eligibility, skip the discount.
        __import__("logging").getLogger(__name__).exception("Could not check offer eligibility")
        return True


def _portal_redirect(customer_id: str, return_url: str) -> dict[str, str]:
    session = stripe.billingPortal.Session.create(customer=customer_id, return_url=return_url)
    return {"sessionId": _obj_get(session, "id") or "", "url": session.url}


def _create_customer(user_id: str, email: Optional[str] = None, name: Optional[str] = None) -> str:
    params: dict[str, Any] = {"metadata": {"userId": user_id}}
    if email:
        params["email"] = email
    if name:
        params["name"] = name
    customer = stripe.Customer.create(**params)
    return customer.id


def _ensure_customer_email(customer_id: Optional[str], email: Optional[str] = None, name: Optional[str] = None) -> None:
    if not customer_id:
        return
    if not email and not name:
        return
    customer = _to_dict(stripe.Customer.retrieve(customer_id))
    updates: dict[str, str] = {}
    if email and not customer.get("email"):
        updates["email"] = email
    if name and not customer.get("name"):
        updates["name"] = name
    if updates:
        stripe.Customer.modify(customer_id, **updates)


async def create_checkout_session(
    user_id: str,
    tier: str,
    billing_interval: str,
    success_url: str,
    cancel_url: str,
    email: Optional[str] = None,
    name: Optional[str] = None,
) -> dict[str, str]:
    price_id = PRICE_IDS.get(tier, {}).get(billing_interval, "")
    if not price_id:
        raise ValueError(f"Price not configured for {tier}/{billing_interval}")

    existing = get_user_subscription(user_id)
    if existing and existing.get("stripeCustomerId"):
        customer_id = existing["stripeCustomerId"]
        _ensure_customer_email(customer_id, email=email, name=name)
    else:
        customer_id = _create_customer(user_id, email=email, name=name)
        update_user_subscription(user_id, {"stripeCustomerId": customer_id})

    # Never start a second subscription if one is already active or trialing.
    stored_status = (existing or {}).get("subscriptionStatus")
    stored_sub_id = (existing or {}).get("stripeSubscriptionId")
    if stored_sub_id and _is_active_or_trialing(stored_status):
        return _portal_redirect(customer_id, cancel_url or success_url)
    live_sub = _first_active_subscription(customer_id)
    if live_sub:
        period_start, period_end = _period_unix(live_sub)
        update_user_subscription(
            user_id,
            {
                "tier": (live_sub.get("metadata") or {}).get("tier") or tier,
                "stripeSubscriptionId": live_sub.get("id"),
                "stripePriceId": _price_id_from_sub(live_sub),
                "subscriptionStatus": live_sub.get("status"),
                "subscriptionStartDate": _iso_from_unix(period_start),
                "subscriptionEndDate": _iso_from_unix(period_end),
            },
        )
        return _portal_redirect(customer_id, cancel_url or success_url)

    # PP-166: $1 first-month offer. Pro monthly only, first-time subscribers only, and
    # only while STRIPE_PRO_FIRST_MONTH_COUPON_ID is set. Otherwise nothing changes.
    offer_coupon = first_month_offer.coupon_for(tier, billing_interval)
    if offer_coupon and _has_ever_subscribed(customer_id, existing):
        offer_coupon = None

    reused = _open_checkout_session(customer_id, price_id, first_month_offer.OFFER_MARKER if offer_coupon else "")
    if reused:
        return reused

    metadata = {"userId": user_id, "tier": tier}
    create_params: dict[str, Any] = {}
    idempotency_key = f"pantryhub-checkout-{user_id}-{tier}-{billing_interval}"
    if offer_coupon:
        metadata["offer"] = first_month_offer.OFFER_MARKER
        # Stripe does not allow `discounts` together with `allow_promotion_codes`.
        create_params["discounts"] = [{"coupon": offer_coupon}]
        # A different request body under the same key would make Stripe reject it.
        idempotency_key = f"{idempotency_key}-offer-{offer_coupon}"
    else:
        create_params["allow_promotion_codes"] = True

    session = stripe.checkout.Session.create(
        customer=customer_id,
        line_items=[{"price": price_id, "quantity": 1}],
        mode="subscription",
        subscription_data={"metadata": dict(metadata)},
        success_url=success_url,
        cancel_url=cancel_url,
        metadata=metadata,
        idempotency_key=idempotency_key,
        **create_params,
    )
    if not session.url:
        raise ValueError("Checkout session created without URL")
    return {"sessionId": session.id, "url": session.url}


_CHECKOUT_SESSION_ID_RE = re.compile(r"^cs_[A-Za-z0-9_]{8,250}$")


def confirm_checkout_session(user_id: str, session_id: str) -> dict[str, Any]:
    """PP-168: let the success page confirm a paid Checkout Session with Stripe.

    A late `checkout.session.completed` webhook used to leave Settings on Free
    for a moment after payment. This reads the session from Stripe, checks it
    belongs to the signed-in user (server-set metadata.userId), and when it is
    paid and the subscription is active/trialing applies the same entitlement
    path the webhooks use. Idempotent: calling it again, or the webhook
    arriving later, is a no-op refresh of the same linked subscription.
    """
    if not session_id or not _CHECKOUT_SESSION_ID_RE.match(session_id):
        raise ValueError("Invalid checkout session id")
    invalid_request = getattr(stripe, "InvalidRequestError", None) or getattr(
        getattr(stripe, "error", None), "InvalidRequestError", None
    )
    try:
        session = _to_dict(stripe.checkout.Session.retrieve(session_id))
    except Exception as exc:
        if invalid_request is not None and isinstance(exc, invalid_request):
            raise PermissionError("Checkout session not found") from exc
        raise
    metadata = session.get("metadata") or {}
    if not user_id or metadata.get("userId") != user_id:
        raise PermissionError("Checkout session does not belong to this user")

    status = session.get("status")
    payment_status = session.get("payment_status")
    subscription_id = session.get("subscription")
    if isinstance(subscription_id, dict):
        subscription_id = subscription_id.get("id")

    applied = False
    if (
        session.get("mode") == "subscription"
        and status == "complete"
        and payment_status in {"paid", "no_payment_required"}
        and subscription_id
    ):
        sub = _to_dict(stripe.Subscription.retrieve(subscription_id))
        if _is_active_or_trialing(sub.get("status")):
            applied = _apply_subscription_entitlement(user_id, metadata.get("tier"), sub)

    stored = get_user_subscription(user_id) or {}
    tier = stored.get("tier") or "free"
    confirmed = tier != "free" and _is_active_or_trialing(stored.get("subscriptionStatus"))
    return {
        "confirmed": confirmed,
        "applied": applied,
        "tier": tier,
        "sessionStatus": status,
        "paymentStatus": payment_status,
        "amountTotal": session.get("amount_total"),
        "currency": (session.get("currency") or "").lower() or None,
    }


async def create_portal_session(
    user_id: str,
    return_url: str,
    email: Optional[str] = None,
    name: Optional[str] = None,
) -> dict[str, str]:
    subscription = get_user_subscription(user_id)
    if not subscription or not subscription.get("stripeCustomerId"):
        raise ValueError("No Stripe customer found for this user")
    _ensure_customer_email(subscription["stripeCustomerId"], email=email, name=name)
    session = stripe.billingPortal.Session.create(
        customer=subscription["stripeCustomerId"],
        return_url=return_url,
    )
    return {"url": session.url}


def _event_user_id(event: dict[str, Any]) -> Optional[str]:
    data = event.get("data") or {}
    obj = data.get("object") or {}
    if not isinstance(obj, dict):
        obj = _to_dict(obj) or {}
    meta = obj.get("metadata") or {}
    return meta.get("userId") or get_user_id_by_customer(obj.get("customer") or "")


def should_handle_webhook_event(event: Any) -> bool:
    """Return False if this Stripe event id was already processed successfully."""
    payload = _to_dict(event) or {}
    event_id = payload.get("id")
    if not event_id:
        return True
    event_type = payload.get("type") or ""
    user_id = _event_user_id(payload)
    stored = {key: payload[key] for key in ("id", "type") if key in payload}
    with db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO stripe_webhook_events (id, stripe_event_id, event_type, user_id, processed, payload)
                VALUES (%s, %s, %s, %s, FALSE, %s)
                ON CONFLICT (stripe_event_id) DO NOTHING
                RETURNING id
                """,
                (str(uuid.uuid4()), event_id, event_type, user_id, Json(stored)),
            )
            inserted = cur.fetchone()
            if inserted:
                return True
            cur.execute(
                "SELECT processed FROM stripe_webhook_events WHERE stripe_event_id = %s",
                (event_id,),
            )
            row = cur.fetchone()
    return not bool(row and row["processed"])


def mark_webhook_event_processed(event: Any) -> None:
    payload = _to_dict(event) or {}
    event_id = payload.get("id")
    if not event_id:
        return
    with db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "UPDATE stripe_webhook_events SET processed = TRUE WHERE stripe_event_id = %s",
                (event_id,),
            )


def verify_webhook(payload: bytes, signature: str) -> dict[str, Any]:
    secret = os.getenv("STRIPE_WEBHOOK_SECRET", "")
    if not secret:
        raise ValueError("Webhook secret not configured")
    return stripe.Webhook.construct_event(payload, signature, secret)


def process_webhook(event_type: str, data: Any) -> dict[str, Any]:
    payload = _to_dict(data) or {}
    obj = payload.get("object") or {}
    if not isinstance(obj, dict):
        obj = _to_dict(obj) or {}
    if event_type == "checkout.session.completed":
        _handle_checkout_completed(obj)
    elif event_type == "invoice.paid":
        _handle_invoice_paid(obj)
    elif event_type == "invoice.payment_failed":
        _handle_invoice_failed(obj)
    elif event_type == "customer.subscription.created":
        _handle_subscription_created(obj)
    elif event_type == "customer.subscription.updated":
        _handle_subscription_updated(obj)
    elif event_type == "customer.subscription.deleted":
        _handle_subscription_deleted(obj)
    elif event_type in {"charge.refunded", "charge.refund.updated"}:
        _handle_charge_refunded(obj)
    return {"received": True}



def _recipient_email(user_id: str, customer_id: Optional[str] = None) -> Optional[str]:
    try:
        email = get_user_contact(user_id).get("email")
        if email:
            return email
    except Exception:
        logger = __import__("logging").getLogger(__name__)
        logger.exception("Could not load user contact for email delivery")
    if customer_id:
        try:
            customer = _to_dict(stripe.Customer.retrieve(customer_id))
            return customer.get("email")
        except Exception:
            logger = __import__("logging").getLogger(__name__)
            logger.exception("Could not load Stripe customer for email delivery")
    return None


def _apply_subscription_entitlement(user_id: str, tier: Optional[str], sub: dict[str, Any]) -> bool:
    """Grant or refresh Pro/Family from a Stripe subscription.

    Does not replace a different subscription the account is already linked to
    when that stored subscription is still active or trialing.
    """
    if not user_id or not sub.get("id"):
        return False
    existing = get_user_subscription(user_id)
    stored_id = (existing or {}).get("stripeSubscriptionId")
    if (
        stored_id
        and stored_id != sub.get("id")
        and _is_active_or_trialing((existing or {}).get("subscriptionStatus"))
    ):
        return False
    period_start, period_end = _period_unix(sub)
    update_user_subscription(
        user_id,
        {
            "tier": tier or (sub.get("metadata") or {}).get("tier") or "pro",
            "stripeCustomerId": sub.get("customer") or (existing or {}).get("stripeCustomerId"),
            "stripeSubscriptionId": sub.get("id"),
            "stripePriceId": _price_id_from_sub(sub),
            "subscriptionStatus": sub.get("status"),
            "subscriptionStartDate": _iso_from_unix(period_start),
            "subscriptionEndDate": _iso_from_unix(period_end),
            "cancelAtPeriodEnd": bool(sub.get("cancel_at_period_end")),
        },
    )
    return True


def _handle_subscription_created(subscription: dict[str, Any]) -> None:
    """Grant entitlement when Stripe first reports a paid/trialing subscription.

    Uses the same path as checkout.session.completed, so whichever event
    arrives first grants Pro and the other is a no-op refresh of the same
    linked subscription. Never replaces a different already-linked
    active/trialing subscription (PP-089 duplicate-sub guard). Incomplete
    created events are ignored until payment succeeds.
    """
    metadata = subscription.get("metadata") or {}
    user_id = metadata.get("userId")
    if not user_id or not _is_active_or_trialing(subscription.get("status")):
        return
    _apply_subscription_entitlement(user_id, metadata.get("tier"), subscription)


def _handle_checkout_completed(session: dict[str, Any]) -> None:
    user_id = (session.get("metadata") or {}).get("userId")
    tier = (session.get("metadata") or {}).get("tier")
    subscription_id = session.get("subscription")
    if not user_id or not tier or not subscription_id:
        return
    sub = _to_dict(stripe.Subscription.retrieve(subscription_id))
    _apply_subscription_entitlement(user_id, tier, sub)


def _handle_invoice_paid(invoice: dict[str, Any]) -> None:
    subscription_id = _subscription_id_from_invoice(invoice)
    if not subscription_id:
        return
    sub = _to_dict(stripe.Subscription.retrieve(subscription_id))
    user_id = (sub.get("metadata") or {}).get("userId")
    if not user_id:
        return
    tier = (sub.get("metadata") or {}).get("tier")
    admin_service.record_transaction(
        {
            "userId": user_id,
            "stripeCustomerId": invoice.get("customer") or sub.get("customer"),
            "stripeSubscriptionId": subscription_id,
            "stripeInvoiceId": invoice.get("id"),
            "amountCents": invoice.get("amount_paid", 0),
            "currency": invoice.get("currency", "usd"),
            "status": "succeeded",
            "tier": tier,
            "stripeEventId": invoice.get("id"),
            # PP-166: tag offer subscriptions, and mark fully discounted (comp) invoices
            # so admin revenue and offer metrics can exclude them.
            "offer": (sub.get("metadata") or {}).get("offer"),
            "isComp": first_month_offer.invoice_is_comp(invoice),
        }
    )
    applied = _apply_subscription_entitlement(user_id, tier, sub)
    existing = get_user_subscription(user_id)
    if applied or (existing or {}).get("stripeSubscriptionId") == subscription_id:
        email_service.send_payment_confirmation(
            user_id=user_id,
            email=_recipient_email(user_id, invoice.get("customer") or sub.get("customer")),
            invoice_id=invoice.get("id") or "",
            tier=tier,
            amount_cents=int(invoice.get("amount_paid") or 0),
            currency=invoice.get("currency") or "usd",
            period_end=(existing or {}).get("subscriptionEndDate"),
            is_free_invoice=int(invoice.get("amount_paid") or 0) == 0,
        )


def _handle_invoice_failed(invoice: dict[str, Any]) -> None:
    subscription_id = _subscription_id_from_invoice(invoice)
    if not subscription_id:
        return
    sub = stripe.Subscription.retrieve(subscription_id)
    user_id = _obj_get(_obj_get(sub, "metadata"), "userId")
    if not user_id:
        return
    tier = _obj_get(_obj_get(sub, "metadata"), "tier")
    admin_service.record_transaction(
        {
            "userId": user_id,
            "stripeCustomerId": invoice.get("customer"),
            "stripeSubscriptionId": subscription_id,
            "stripeInvoiceId": invoice.get("id"),
            "amountCents": invoice.get("amount_due", 0),
            "currency": invoice.get("currency", "usd"),
            "status": "failed",
            "tier": tier,
            "failureCode": "payment_failed",
            "failureMessage": "Payment failed",
            "stripeEventId": invoice.get("id"),
        }
    )
    update_user_subscription(user_id, {"subscriptionStatus": "past_due"})
    customer_id = invoice.get("customer")
    if not isinstance(sub, dict):
        sub = _to_dict(sub)
        customer_id = customer_id or sub.get("customer")
    email_service.send_payment_failed(
        user_id=user_id,
        email=_recipient_email(user_id, customer_id),
        invoice_id=invoice.get("id") or "",
        amount_cents=int(invoice.get("amount_due") or 0),
        currency=invoice.get("currency") or "usd",
    )


def _handle_subscription_updated(subscription: dict[str, Any]) -> None:
    user_id = (subscription.get("metadata") or {}).get("userId")
    if not user_id:
        return
    existing = get_user_subscription(user_id)
    stored_id = (existing or {}).get("stripeSubscriptionId")
    event_id = subscription.get("id")
    # Ignore updates for extra subscriptions so canceling a duplicate cannot
    # mark the user's kept subscription canceled.
    if stored_id and event_id and stored_id != event_id:
        return
    tier = (subscription.get("metadata") or {}).get("tier")
    _period_start, period_end = _period_unix(subscription)
    updates: dict[str, Any] = {
        "tier": tier,
        "stripePriceId": _price_id_from_sub(subscription),
        "subscriptionEndDate": _iso_from_unix(period_end),
        "cancelAtPeriodEnd": bool(subscription.get("cancel_at_period_end")),
    }
    status = subscription.get("status")
    # Keep Pro until the subscription actually ends. Stripe still reports
    # active/trialing while cancel_at_period_end is set.
    if _is_active_or_trialing(status) or status == "past_due":
        updates["subscriptionStatus"] = status
    previously = bool((existing or {}).get("cancelAtPeriodEnd"))
    update_user_subscription(user_id, updates)
    if updates.get("cancelAtPeriodEnd") and not previously:
        email_service.send_cancellation_scheduled(
            user_id=user_id,
            email=_recipient_email(user_id, subscription.get("customer")),
            subscription_id=event_id or "",
            period_end=updates.get("subscriptionEndDate"),
        )


def _handle_subscription_deleted(subscription: dict[str, Any]) -> None:
    user_id = (subscription.get("metadata") or {}).get("userId")
    if not user_id:
        return
    deleted_id = subscription.get("id")
    existing = get_user_subscription(user_id)
    stored_id = (existing or {}).get("stripeSubscriptionId")
    if stored_id and deleted_id and stored_id != deleted_id:
        return
    customer_id = subscription.get("customer") or (existing or {}).get("stripeCustomerId")
    replacement = _first_active_subscription(customer_id, exclude_id=deleted_id)
    if replacement:
        period_start, period_end = _period_unix(replacement)
        update_user_subscription(
            user_id,
            {
                "tier": (replacement.get("metadata") or {}).get("tier") or (existing or {}).get("tier") or "pro",
                "stripeSubscriptionId": replacement.get("id"),
                "stripePriceId": _price_id_from_sub(replacement),
                "subscriptionStatus": replacement.get("status"),
                "subscriptionStartDate": _iso_from_unix(period_start),
                "subscriptionEndDate": _iso_from_unix(period_end),
            },
        )
        return
    downgrade_to_free(user_id)
    email_service.send_subscription_ended(
        user_id=user_id,
        email=_recipient_email(user_id, customer_id),
        subscription_id=deleted_id or "",
    )


def _handle_charge_refunded(charge: dict[str, Any]) -> None:
    amount = int(charge.get("amount") or 0)
    refunded_amount = int(charge.get("amount_refunded") or 0)
    if not charge.get("refunded") and refunded_amount <= 0:
        return
    invoice_id = charge.get("invoice")
    customer_id = charge.get("customer")
    subscription_id = None
    if invoice_id:
        invoice = _to_dict(stripe.Invoice.retrieve(invoice_id))
        subscription_id = _subscription_id_from_invoice(invoice)
        customer_id = customer_id or invoice.get("customer")
    user_id = None
    sub = None
    if subscription_id:
        sub = _to_dict(stripe.Subscription.retrieve(subscription_id))
        user_id = (sub.get("metadata") or {}).get("userId")
    if not user_id:
        user_id = get_user_id_by_customer(customer_id or "")
    if user_id:
        admin_service.record_refund(
            {
                "userId": user_id,
                "stripeCustomerId": customer_id,
                "stripeSubscriptionId": subscription_id,
                "stripeInvoiceId": invoice_id,
                "amountCents": refunded_amount or amount,
                "currency": charge.get("currency", "usd"),
                "status": "refunded",
                "tier": (sub or {}).get("metadata", {}).get("tier") if sub else None,
                "stripeEventId": charge.get("id"),
            }
        )
    if not user_id or not subscription_id:
        return
    existing = get_user_subscription(user_id)
    stored_id = (existing or {}).get("stripeSubscriptionId")
    # A refund for a non-linked duplicate must not strip Pro (PP-089).
    if stored_id and stored_id != subscription_id:
        return
    is_full = bool(charge.get("refunded")) or (amount > 0 and refunded_amount >= amount)
    if not is_full:
        return
    if _first_active_subscription(customer_id, exclude_id=subscription_id):
        return
    downgrade_to_free(user_id)
