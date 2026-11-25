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


def record_refund(data: dict[str, Any]) -> None:
    """Mark an existing succeeded invoice transaction as refunded, or insert one."""
    invoice_id = data.get("stripeInvoiceId")
    amount = data.get("amountCents", 0)
    with db_connection() as conn:
        with conn.cursor() as cur:
            if invoice_id:
                cur.execute(
                    """
                    UPDATE admin_transactions
                    SET status = 'refunded', amount_cents = %s, stripe_event_id = COALESCE(%s, stripe_event_id)
                    WHERE stripe_invoice_id = %s AND status = 'succeeded'
                    RETURNING id
                    """,
                    (amount, data.get("stripeEventId"), invoice_id),
                )
                if cur.fetchone():
                    return
    record_transaction({**data, "status": "refunded", "amountCents": amount})


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


def get_funnel_metrics(period: Period = "7d") -> dict[str, Any]:
    """Calculate subscription funnel metrics for the given period and all-time.

    Timestamp choice documentation:
    - Churned: Subscriptions with status in ('canceled', 'ended').
      We use `updated_at` as the timestamp for filtering churn within the period because:
      1) `updated_at` is a native PostgreSQL TIMESTAMP NOT NULL column automatically updated
         whenever a subscription status transitions (such as in downgrade_to_free() or stripe webhook handlers).
      2) In contrast, `subscription_end_date` is a free-form TEXT column that may be NULL or ISO formatted.
      3) Subscriptions marked `cancel_at_period_end = TRUE` that are currently 'active' or 'trialing'
         are strictly NOT counted as churn; they are tracked separately in `cancel_scheduled`.
    """
    dates = _period_dates(period)
    start_date = dates["currentStart"]

    with db_connection() as conn:
        with conn.cursor() as cur:
            # 1. Signups (from users by created_at)
            cur.execute("SELECT COUNT(*) AS count FROM users")
            signups_all_time = int(cur.fetchone()["count"])

            cur.execute(
                "SELECT COUNT(*) AS count FROM users WHERE created_at >= %s",
                (start_date,),
            )
            signups_period = int(cur.fetchone()["count"])

            # 2. Trials (user_subscriptions with subscription_status = 'trialing')
            cur.execute(
                "SELECT COUNT(*) AS count FROM user_subscriptions WHERE subscription_status = 'trialing'"
            )
            trials_all_time = int(cur.fetchone()["count"])

            cur.execute(
                """
                SELECT COUNT(*) AS count FROM user_subscriptions
                WHERE subscription_status = 'trialing' AND created_at >= %s
                """,
                (start_date,),
            )
            trials_period = int(cur.fetchone()["count"])

            # 3. Paid conversions:
            # Count of DISTINCT users whose FIRST succeeded admin_transactions row with amount_cents > 0
            # falls in the period. Excludes refunds, failed, and $0 invoices.
            # Distinct on user_id ensures a user's second paid invoice does not double-count.
            cur.execute(
                """
                WITH first_paid AS (
                    SELECT DISTINCT ON (user_id)
                        user_id,
                        created_at,
                        LOWER(COALESCE(tier, '')) AS tier
                    FROM admin_transactions
                    WHERE status = 'succeeded' AND amount_cents > 0
                    ORDER BY user_id, created_at ASC, id ASC
                )
                SELECT
                    COUNT(*) AS total_all_time,
                    COALESCE(SUM(CASE WHEN tier = 'pro' THEN 1 ELSE 0 END), 0) AS pro_all_time,
                    COALESCE(SUM(CASE WHEN tier = 'family' THEN 1 ELSE 0 END), 0) AS family_all_time,
                    COALESCE(SUM(CASE WHEN created_at >= %s THEN 1 ELSE 0 END), 0) AS total_period,
                    COALESCE(SUM(CASE WHEN created_at >= %s AND tier = 'pro' THEN 1 ELSE 0 END), 0) AS pro_period,
                    COALESCE(SUM(CASE WHEN created_at >= %s AND tier = 'family' THEN 1 ELSE 0 END), 0) AS family_period
                FROM first_paid
                """,
                (start_date, start_date, start_date),
            )
            conv_row = cur.fetchone()
            total_paid_all_time = int(conv_row["total_all_time"])
            pro_paid_all_time = int(conv_row["pro_all_time"])
            family_paid_all_time = int(conv_row["family_all_time"])
            total_paid_period = int(conv_row["total_period"])
            pro_paid_period = int(conv_row["pro_period"])
            family_paid_period = int(conv_row["family_period"])

            # 4. Churned (subscriptions that actually ended: canceled/ended)
            cur.execute(
                """
                SELECT COUNT(*) AS count FROM user_subscriptions
                WHERE subscription_status IN ('canceled', 'ended')
                """
            )
            churned_all_time = int(cur.fetchone()["count"])

            cur.execute(
                """
                SELECT COUNT(*) AS count FROM user_subscriptions
                WHERE subscription_status IN ('canceled', 'ended') AND updated_at >= %s
                """,
                (start_date,),
            )
            churned_period = int(cur.fetchone()["count"])

            # 5. Cancel scheduled (currently active/trialing with cancel_at_period_end = TRUE)
            cur.execute(
                """
                SELECT COUNT(*) AS count FROM user_subscriptions
                WHERE cancel_at_period_end = TRUE AND subscription_status IN ('active', 'trialing')
                """
            )
            cancel_scheduled_all_time = int(cur.fetchone()["count"])

            cur.execute(
                """
                SELECT COUNT(*) AS count FROM user_subscriptions
                WHERE cancel_at_period_end = TRUE
                  AND subscription_status IN ('active', 'trialing')
                  AND updated_at >= %s
                """,
                (start_date,),
            )
            cancel_scheduled_period = int(cur.fetchone()["count"])

    return {
        "period": period,
        "signups": {
            "period": signups_period,
            "allTime": signups_all_time,
        },
        "trials": {
            "period": trials_period,
            "allTime": trials_all_time,
        },
        "paidConversions": {
            "period": total_paid_period,
            "allTime": total_paid_all_time,
            "pro": {
                "period": pro_paid_period,
                "allTime": pro_paid_all_time,
            },
            "family": {
                "period": family_paid_period,
                "allTime": family_paid_all_time,
            },
        },
        "churned": {
            "period": churned_period,
            "allTime": churned_all_time,
        },
        "cancelScheduled": {
            "period": cancel_scheduled_period,
            "allTime": cancel_scheduled_all_time,
        },
        "signupsPeriod": signups_period,
        "signupsAllTime": signups_all_time,
        "trialsPeriod": trials_period,
        "trialsAllTime": trials_all_time,
        "proConversions": pro_paid_period,
        "proConversionsAllTime": pro_paid_all_time,
        "familyConversions": family_paid_period,
        "familyConversionsAllTime": family_paid_all_time,
        "paidConversionsPeriod": total_paid_period,
        "paidConversionsAllTime": total_paid_all_time,
        "churnedPeriod": churned_period,
        "churnedAllTime": churned_all_time,
        "cancelScheduledPeriod": cancel_scheduled_period,
        "cancelScheduledAllTime": cancel_scheduled_all_time,
    }
