"""PP-166: $1 first-month offer on Pro monthly.

The offer is a Stripe coupon ($3.99 off, duration once) read from
``STRIPE_PRO_FIRST_MONTH_COUPON_ID``. Unset or blank means the offer is off and
checkout behaves exactly as before. The coupon id is never sent to the browser.
"""

from __future__ import annotations

import os
from typing import Any, Optional

OFFER_TIER = "pro"
OFFER_INTERVAL = "month"
LIST_PRICE_CENTS = 499
OFFER_PRICE_CENTS = 100
DISCOUNT_CENTS = LIST_PRICE_CENTS - OFFER_PRICE_CENTS
# Stored on Checkout Sessions / subscriptions so webhooks and metrics can find offer subs.
OFFER_MARKER = "pro_monthly_first_month_1usd"

ENV_COUPON_ID = "STRIPE_PRO_FIRST_MONTH_COUPON_ID"


def coupon_id() -> Optional[str]:
    """Return the configured coupon id, or None when the offer is off."""
    value = (os.getenv(ENV_COUPON_ID) or "").strip()
    return value or None


def is_enabled() -> bool:
    return coupon_id() is not None


def applies_to(tier: str, billing_interval: str) -> bool:
    return tier == OFFER_TIER and billing_interval == OFFER_INTERVAL


def coupon_for(tier: str, billing_interval: str) -> Optional[str]:
    """Coupon id to apply for this plan, or None (offer off or wrong plan)."""
    if not applies_to(tier, billing_interval):
        return None
    return coupon_id()


def public_offer() -> dict[str, Any]:
    """Display-only offer details for the public banner. No coupon id."""
    if not is_enabled():
        return {"enabled": False}
    return {
        "enabled": True,
        "tier": OFFER_TIER,
        "interval": OFFER_INTERVAL,
        "listPriceCents": LIST_PRICE_CENTS,
        "offerPriceCents": OFFER_PRICE_CENTS,
        "discountCents": DISCOUNT_CENTS,
        "months": 1,
    }


def invoice_is_comp(invoice: dict[str, Any]) -> bool:
    """True when an invoice was fully discounted (for example a 100% off comp subscription)."""
    subtotal = int(invoice.get("subtotal") or 0)
    if subtotal <= 0:
        return False
    discounted = 0
    for entry in invoice.get("total_discount_amounts") or []:
        if isinstance(entry, dict):
            discounted += int(entry.get("amount") or 0)
    if discounted >= subtotal:
        return True
    discount = invoice.get("discount")
    coupon = discount.get("coupon") if isinstance(discount, dict) else None
    return bool(isinstance(coupon, dict) and coupon.get("percent_off") == 100)
