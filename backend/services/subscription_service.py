"""Subscription tier and usage limit operations."""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Any, Optional

from database.db import db_connection

TIER_LIMITS = {
    "free": {
        "maxItems": 50,
        "receiptScansPerMonth": 5,
        "aiCallsPerMonth": 0,
        "voiceAssistant": False,
        "multiDevice": False,
        "sharedInventory": False,
        "maxFamilyMembers": 1,
    },
    "pro": {
        "maxItems": -1,
        "receiptScansPerMonth": -1,
        "aiCallsPerMonth": -1,
        "voiceAssistant": True,
        "multiDevice": True,
        "sharedInventory": False,
        "maxFamilyMembers": 1,
    },
    "family": {
        "maxItems": -1,
        "receiptScansPerMonth": -1,
        "aiCallsPerMonth": -1,
        "voiceAssistant": True,
        "multiDevice": True,
        "sharedInventory": True,
        "maxFamilyMembers": 5,
    },
}


def _now() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def _current_month() -> str:
    now = datetime.now(timezone.utc)
    return f"{now.year}-{now.month:02d}"


def _map_subscription(row: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": row["id"],
        "userId": row["user_id"],
        "tier": row["tier"],
        "stripeCustomerId": row.get("stripe_customer_id"),
        "stripeSubscriptionId": row.get("stripe_subscription_id"),
        "stripePriceId": row.get("stripe_price_id"),
        "subscriptionStatus": row.get("subscription_status"),
        "subscriptionStartDate": row.get("subscription_start_date"),
        "subscriptionEndDate": row.get("subscription_end_date"),
        "createdAt": str(row.get("created_at", "")),
        "updatedAt": str(row.get("updated_at", "")),
    }


def get_or_create_user_subscription(user_id: str) -> dict[str, Any]:
    with db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT * FROM user_subscriptions WHERE user_id = %s", (user_id,))
            row = cur.fetchone()
            if row:
                return _map_subscription(row)
            sub_id = str(uuid.uuid4())
            now = _now()
            cur.execute(
                """
                INSERT INTO user_subscriptions (id, user_id, tier, created_at, updated_at)
                VALUES (%s, %s, 'free', %s, %s)
                """,
                (sub_id, user_id, now, now),
            )
    return {
        "id": sub_id,
        "userId": user_id,
        "tier": "free",
        "stripeCustomerId": None,
        "stripeSubscriptionId": None,
        "stripePriceId": None,
        "subscriptionStatus": None,
        "subscriptionStartDate": None,
        "subscriptionEndDate": None,
        "createdAt": now,
        "updatedAt": now,
    }


def get_user_subscription(user_id: str) -> Optional[dict[str, Any]]:
    with db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT * FROM user_subscriptions WHERE user_id = %s", (user_id,))
            row = cur.fetchone()
            return _map_subscription(row) if row else None


def update_user_subscription(user_id: str, updates: dict[str, Any]) -> Optional[dict[str, Any]]:
    existing = get_user_subscription(user_id)
    if not existing:
        get_or_create_user_subscription(user_id)
    col_map = {
        "tier": "tier",
        "stripeCustomerId": "stripe_customer_id",
        "stripeSubscriptionId": "stripe_subscription_id",
        "stripePriceId": "stripe_price_id",
        "subscriptionStatus": "subscription_status",
        "subscriptionStartDate": "subscription_start_date",
        "subscriptionEndDate": "subscription_end_date",
    }
    fields = []
    params: list[Any] = []
    for key, col in col_map.items():
        if key in updates:
            fields.append(f"{col} = %s")
            params.append(updates[key])
    if not fields:
        return get_user_subscription(user_id)
    now = _now()
    fields.append("updated_at = %s")
    params.append(now)
    params.append(user_id)
    with db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                f"UPDATE user_subscriptions SET {', '.join(fields)} WHERE user_id = %s",
                params,
            )
    return get_user_subscription(user_id)


def downgrade_to_free(user_id: str) -> Optional[dict[str, Any]]:
    now = _now()
    return update_user_subscription(
        user_id,
        {
            "tier": "free",
            "stripeSubscriptionId": None,
            "stripePriceId": None,
            "subscriptionStatus": "canceled",
            "subscriptionEndDate": now,
        },
    )


def get_or_create_usage_limits(user_id: str) -> dict[str, Any]:
    month = _current_month()
    with db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT * FROM usage_limits WHERE user_id = %s AND month = %s",
                (user_id, month),
            )
            row = cur.fetchone()
            if row:
                return {
                    "receiptScans": row["receipt_scans"],
                    "aiCalls": row["ai_calls"],
                    "voiceSessions": row["voice_sessions"],
                }
            usage_id = str(uuid.uuid4())
            now = _now()
            cur.execute(
                """
                INSERT INTO usage_limits (id, user_id, month, receipt_scans, ai_calls, voice_sessions, created_at, updated_at)
                VALUES (%s, %s, %s, 0, 0, 0, %s, %s)
                """,
                (usage_id, user_id, month, now, now),
            )
    return {"receiptScans": 0, "aiCalls": 0, "voiceSessions": 0}


def increment_usage(user_id: str, usage_type: str) -> None:
    month = _current_month()
    col_map = {
        "receiptScans": "receipt_scans",
        "aiCalls": "ai_calls",
        "voiceSessions": "voice_sessions",
    }
    col = col_map.get(usage_type)
    if not col:
        return
    get_or_create_usage_limits(user_id)
    now = _now()
    with db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                f"""
                UPDATE usage_limits SET {col} = {col} + 1, updated_at = %s
                WHERE user_id = %s AND month = %s
                """,
                (now, user_id, month),
            )


def get_user_tier_info(user_id: str, current_item_count: int) -> dict[str, Any]:
    subscription = get_or_create_user_subscription(user_id)
    usage = get_or_create_usage_limits(user_id)
    limits = TIER_LIMITS[subscription["tier"]]
    return {
        "tier": subscription["tier"],
        "limits": limits,
        "usage": {
            "currentItems": current_item_count,
            "receiptScansThisMonth": usage["receiptScans"],
            "aiCallsThisMonth": usage["aiCalls"],
            "voiceSessionsThisMonth": usage["voiceSessions"],
        },
        "subscription": (
            {
                "status": subscription["subscriptionStatus"],
                "stripeCustomerId": subscription["stripeCustomerId"],
                "stripeSubscriptionId": subscription["stripeSubscriptionId"],
                "subscriptionEndDate": subscription["subscriptionEndDate"],
            }
            if subscription["stripeCustomerId"]
            else None
        ),
    }


def can_add_items(user_id: str, current_count: int) -> dict[str, Any]:
    sub = get_or_create_user_subscription(user_id)
    limit = TIER_LIMITS[sub["tier"]]["maxItems"]
    if limit == -1:
        return {"allowed": True, "remaining": -1}
    remaining = limit - current_count
    return {"allowed": remaining > 0, "remaining": max(0, remaining)}


def can_scan_receipt(user_id: str) -> dict[str, Any]:
    sub = get_or_create_user_subscription(user_id)
    limit = TIER_LIMITS[sub["tier"]]["receiptScansPerMonth"]
    if limit == -1:
        return {"allowed": True, "remaining": -1}
    usage = get_or_create_usage_limits(user_id)
    remaining = limit - usage["receiptScans"]
    return {"allowed": remaining > 0, "remaining": max(0, remaining)}


def can_use_voice_assistant(user_id: str) -> bool:
    sub = get_or_create_user_subscription(user_id)
    return TIER_LIMITS[sub["tier"]]["voiceAssistant"]