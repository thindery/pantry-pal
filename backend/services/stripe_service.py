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

    session = stripe.checkout.Session.create(
        customer=customer_id,
        line_items=[{"price": price_id, "quantity": 1}],
        mode="subscription",
        subscription_data={"metadata": {"userId": user_id, "tier": tier}},
        success_url=success_url,
        cancel_url=cancel_url,
        metadata={"userId": user_id, "tier": tier},
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


def process_webhook(event_type: str, data: dict[str, Any]) -> dict[str, Any]:
    obj = data.get("object", {})
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


def _handle_checkout_completed(session: dict[str, Any]) -> None:
    user_id = (session.get("metadata") or {}).get("userId")
    tier = (session.get("metadata") or {}).get("tier")
    subscription_id = session.get("subscription")
    if not user_id or not tier or not subscription_id:
        return
    sub = stripe.Subscription.retrieve(subscription_id)
    price_id = sub["items"]["data"][0]["price"]["id"] if sub["items"]["data"] else None
    update_user_subscription(
        user_id,
        {
            "tier": tier,
            "stripeSubscriptionId": sub.id,
            "stripePriceId": price_id,
            "subscriptionStatus": sub.status,
            "subscriptionStartDate": datetime.fromtimestamp(
                sub.current_period_start, tz=timezone.utc
            ).isoformat(),
            "subscriptionEndDate": datetime.fromtimestamp(
                sub.current_period_end, tz=timezone.utc
            ).isoformat(),
        },
    )


def _handle_invoice_paid(invoice: dict[str, Any]) -> None:
    subscription_id = invoice.get("subscription")
    if not subscription_id:
        return
    sub = stripe.Subscription.retrieve(subscription_id)
    user_id = (sub.metadata or {}).get("userId")
    if not user_id:
        return
    tier = (sub.metadata or {}).get("tier")
    admin_service.record_transaction(
        {
            "userId": user_id,
            "stripeCustomerId": invoice.get("customer"),
            "stripeSubscriptionId": subscription_id,
            "stripeInvoiceId": invoice.get("id"),
            "amountCents": invoice.get("amount_paid", 0),
            "currency": invoice.get("currency", "usd"),
            "status": "succeeded",
            "tier": tier,
            "stripeEventId": invoice.get("id"),
        }
    )


def _handle_invoice_failed(invoice: dict[str, Any]) -> None:
    subscription_id = invoice.get("subscription")
    if not subscription_id:
        return
    sub = stripe.Subscription.retrieve(subscription_id)
    user_id = (sub.metadata or {}).get("userId")
    if not user_id:
        return
    tier = (sub.metadata or {}).get("tier")
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
    tier = (subscription.get("metadata") or {}).get("tier")
    price_id = None
    items = subscription.get("items", {}).get("data", [])
    if items:
        price_id = items[0].get("price", {}).get("id")
    update_user_subscription(
        user_id,
        {
            "tier": tier,
            "stripePriceId": price_id,
            "subscriptionStatus": subscription.get("status"),
            "subscriptionEndDate": datetime.fromtimestamp(
                subscription["current_period_end"], tz=timezone.utc
            ).isoformat()
            if subscription.get("current_period_end")
            else None,
        },
    )


def _handle_subscription_deleted(subscription: dict[str, Any]) -> None:
    user_id = (subscription.get("metadata") or {}).get("userId")
    if user_id:
        downgrade_to_free(user_id)