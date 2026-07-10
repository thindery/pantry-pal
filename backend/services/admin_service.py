"""Admin dashboard metrics and transaction tracking."""

from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone
from typing import Any, Literal, Optional

from database.db import db_connection

Period = Literal["7d", "30d", "90d"]


def _period_dates(period: Period) -> dict[str, str]:
    now = datetime.now(timezone.utc)
    days = 7 if period == "7d" else 30 if period == "30d" else 90
    current_end = now.isoformat()
    current_start = (now - timedelta(days=days)).isoformat()
    previous_end = current_start
    previous_start = (now - timedelta(days=2 * days)).isoformat()
    return {
        "currentStart": current_start,
        "currentEnd": current_end,
        "previousStart": previous_start,
        "previousEnd": previous_end,
    }


def record_transaction(data: dict[str, Any]) -> None:
    txn_id = str(uuid.uuid4())
    with db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO admin_transactions (
                    id, user_id, stripe_customer_id, stripe_subscription_id, stripe_invoice_id,
                    amount_cents, currency, status, tier, billing_interval,
                    failure_code, failure_message, stripe_event_id, created_at
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, CURRENT_TIMESTAMP)
                """,
                (
                    txn_id,
                    data["userId"],
                    data.get("stripeCustomerId"),
                    data.get("stripeSubscriptionId"),
                    data.get("stripeInvoiceId"),
                    data.get("amountCents", 0),
                    data.get("currency", "usd"),
                    data.get("status", "pending"),
                    data.get("tier"),
                    data.get("billingInterval"),
                    data.get("failureCode"),
                    data.get("failureMessage"),
                    data.get("stripeEventId"),
                ),
            )


def get_dashboard_metrics(period: Period = "7d") -> dict[str, Any]:
    dates = _period_dates(period)
    with db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT COUNT(DISTINCT user_id) AS count FROM pantry_items")
            total_users = int(cur.fetchone()["count"])

            cur.execute(
                """
                SELECT COUNT(DISTINCT user_id) AS count FROM pantry_items
                WHERE created_at >= %s
                """,
                (dates["currentStart"],),
            )
            current_users = int(cur.fetchone()["count"])

            cur.execute(
                """
                SELECT COUNT(DISTINCT user_id) AS count FROM pantry_items
                WHERE created_at >= %s AND created_at < %s
                """,
                (dates["previousStart"], dates["previousEnd"]),
            )
            previous_users = int(cur.fetchone()["count"])

            growth = (
                ((current_users - previous_users) / previous_users * 100)
                if previous_users > 0
                else (100.0 if current_users > 0 else 0.0)
            )

            cur.execute("SELECT COUNT(*) AS count FROM pantry_items")
            total_products = int(cur.fetchone()["count"])

            cur.execute(
                "SELECT category, COUNT(*) AS count FROM pantry_items GROUP BY category"
            )
            by_category = {r["category"]: int(r["count"]) for r in cur.fetchall()}

            cur.execute(
                "SELECT COALESCE(SUM(amount_cents), 0) AS total FROM admin_transactions WHERE status = 'succeeded'"
            )
            lifetime_revenue = int(cur.fetchone()["total"])

            cur.execute(
                """
                SELECT COALESCE(SUM(amount_cents), 0) AS total FROM admin_transactions
                WHERE status = 'succeeded' AND created_at >= %s
                """,
                (dates["currentStart"],),
            )
            current_revenue = int(cur.fetchone()["total"])

            cur.execute(
                """
                SELECT COALESCE(SUM(amount_cents), 0) AS total FROM admin_transactions
                WHERE status = 'succeeded' AND created_at >= %s AND created_at < %s
                """,
                (dates["previousStart"], dates["previousEnd"]),
            )
            previous_revenue = int(cur.fetchone()["total"])

            mom_growth = (
                ((current_revenue - previous_revenue) / previous_revenue * 100)
                if previous_revenue > 0
                else (100.0 if current_revenue > 0 else 0.0)
            )

            cur.execute(
                """
                SELECT COUNT(DISTINCT user_id) AS count FROM login_events
                WHERE created_at >= CURRENT_DATE
                """
            )
            dau = int(cur.fetchone()["count"])

            cur.execute(
                """
                SELECT id, user_id, amount_cents, status, tier, created_at
                FROM admin_transactions ORDER BY created_at DESC LIMIT 5
                """
            )
            recent_txns = [
                {
                    "id": r["id"],
                    "userId": r["user_id"],
                    "amountCents": r["amount_cents"],
                    "status": r["status"],
                    "tier": r.get("tier"),
                    "createdAt": str(r["created_at"]),
                }
                for r in cur.fetchall()
            ]

            cur.execute(
                """
                SELECT COUNT(*) AS count FROM admin_transactions WHERE status = 'failed'
                AND created_at >= %s
                """,
                (dates["currentStart"],),
            )
            failed_count = int(cur.fetchone()["count"])

            cur.execute(
                """
                SELECT id, user_id, amount_cents, failure_code, failure_message, created_at
                FROM admin_transactions WHERE status = 'failed'
                ORDER BY created_at DESC LIMIT 5
                """
            )
            failed_recent = [
                {
                    "id": r["id"],
                    "userId": r["user_id"],
                    "amountCents": r["amount_cents"],
                    "failureCode": r.get("failure_code"),
                    "failureMessage": r.get("failure_message"),
                    "createdAt": str(r["created_at"]),
                }
                for r in cur.fetchall()
            ]

    return {
        "users": {"total": total_users, "growth": round(growth, 1), "sparkline": []},
        "products": {"total": total_products, "byCategory": by_category},
        "revenue": {
            "lifetime": lifetime_revenue,
            "momGrowth": round(mom_growth, 1),
            "trend": [],
        },
        "logins": {"dau": dau, "sparkline": []},
        "transactions": recent_txns,
        "failedPayments": {"count": failed_count, "recent": failed_recent},
    }


def get_transactions(limit: int = 10, cursor: Optional[str] = None) -> dict[str, Any]:
    with db_connection() as conn:
        with conn.cursor() as cur:
            if cursor:
                cur.execute(
                    """
                    SELECT * FROM admin_transactions
                    WHERE created_at < %s ORDER BY created_at DESC LIMIT %s
                    """,
                    (cursor, limit + 1),
                )
            else:
                cur.execute(
                    "SELECT * FROM admin_transactions ORDER BY created_at DESC LIMIT %s",
                    (limit + 1,),
                )
            rows = cur.fetchall()
    has_more = len(rows) > limit
    rows = rows[:limit]
    transactions = [
        {
            "id": r["id"],
            "userId": r["user_id"],
            "amountCents": r["amount_cents"],
            "currency": r.get("currency", "usd"),
            "status": r["status"],
            "tier": r.get("tier"),
            "createdAt": str(r["created_at"]),
        }
        for r in rows
    ]
    next_cursor = str(rows[-1]["created_at"]) if has_more and rows else None
    return {"transactions": transactions, "nextCursor": next_cursor}


def get_failed_payment_alerts() -> list[dict[str, Any]]:
    with db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT id, user_id, amount_cents, failure_code, failure_message, created_at
                FROM admin_transactions WHERE status = 'failed'
                ORDER BY created_at DESC LIMIT 20
                """
            )
            return [
                {
                    "id": r["id"],
                    "userId": r["user_id"],
                    "amountCents": r["amount_cents"],
                    "failureCode": r.get("failure_code"),
                    "failureMessage": r.get("failure_message"),
                    "createdAt": str(r["created_at"]),
                }
                for r in cur.fetchall()
            ]