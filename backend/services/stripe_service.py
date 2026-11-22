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

from backend.services import admin_service
from backend.services.subscription_service import (
    downgrade_to_free,
    get_user_subscription,
    update_user_subscription,
)

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


def _open_checkout_session(customer_id: str, price_id: str) -> Optional[dict[str, str]]:
    listed = stripe.checkout.Session.list(customer=customer_id, status="open", limit=10)
    for raw in listed.auto_paging_iter():
        session = _to_dict(raw)
        if session.get("mode") != "subscription" or not session.get("url"):
            continue
        return {"sessionId": session["id"], "url": session["url"]}
    return None


def _portal_redirect(customer_id: str, return_url: str) -> dict[str, str]:
    session = stripe.billingPortal.Session.create(customer=customer_id, return_url=return_url)
    return {"sessionId": _obj_get(session, "id") or "", "url": session.url}


async def create_checkout_session(
    user_id: str,
    tier: str,
    billing_interval: str,
    success_url: str,
    cancel_url: str,
) -> dict[str, str]:
    price_id = PRICE_IDS.get(tier, {}).get(billing_interval, "")
    if not price_id:
        raise ValueError(f"Price not configured for {tier}/{billing_interval}")

    existing = get_user_subscription(user_id)
    if existing and existing.get("stripeCustomerId"):
        customer_id = existing["stripeCustomerId"]
    else:
        customer = stripe.Customer.create(metadata={"userId": user_id})
        customer_id = customer.id
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

    reused = _open_checkout_session(customer_id, price_id)
    if reused:
        return reused

    session = stripe.checkout.Session.create(
        customer=customer_id,
        line_items=[{"price": price_id, "quantity": 1}],
        mode="subscription",
        allow_promotion_codes=True,
        subscription_data={"metadata": {"userId": user_id, "tier": tier}},
        success_url=success_url,
        cancel_url=cancel_url,
        metadata={"userId": user_id, "tier": tier},
        idempotency_key=f"pantryhub-checkout-{user_id}-{tier}-{billing_interval}",
    )
    if not session.url:
        raise ValueError("Checkout session created without URL")
    return {"sessionId": session.id, "url": session.url}


async def create_portal_session(user_id: str, return_url: str) -> dict[str, str]:
    subscription = get_user_subscription(user_id)
    if not subscription or not subscription.get("stripeCustomerId"):
        raise ValueError("No Stripe customer found for this user")
    session = stripe.billingPortal.Session.create(
        customer=subscription["stripeCustomerId"],
        return_url=return_url,
    )
    return {"url": session.url}


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
    elif event_type == "customer.subscription.updated":
        _handle_subscription_updated(obj)
    elif event_type == "customer.subscription.deleted":
        _handle_subscription_deleted(obj)
    return {"received": True}



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
        },
    )
    return True


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
        }
    )
    # Renewals and first invoices both grant/refresh entitlement, even at $0
    # (promotion codes). Checkout.session.completed is no longer the only path.
    _apply_subscription_entitlement(user_id, tier, sub)


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
    update_user_subscription(
        user_id,
        {
            "tier": tier,
            "stripePriceId": _price_id_from_sub(subscription),
            "subscriptionStatus": subscription.get("status"),
            "subscriptionEndDate": _iso_from_unix(period_end),
        },
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
