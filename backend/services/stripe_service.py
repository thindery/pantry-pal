"""Stripe billing and webhook handling (PP-028)."""

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

PRICE_IDS = {
    "pro": {
        "month": os.getenv("STRIPE_PRO_MONTHLY_PRICE_ID", ""),
        "year": os.getenv("STRIPE_PRO_YEARLY_PRICE_ID", ""),
    },
    "family": {
        "month": os.getenv("STRIPE_FAMILY_MONTHLY_PRICE_ID", ""),
        "year": os.getenv("STRIPE_FAMILY_YEARLY_PRICE_ID", ""),
    },
}


def get_price_ids() -> dict[str, Any]:
    return {
        "pro": {"monthly": PRICE_IDS["pro"]["month"], "yearly": PRICE_IDS["pro"]["year"]},
        "family": {"monthly": PRICE_IDS["family"]["month"], "yearly": PRICE_IDS["family"]["year"]},
    }


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