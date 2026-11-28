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
                    failure_code, failure_message, stripe_event_id, offer, is_comp, created_at
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, CURRENT_TIMESTAMP)
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
                    data.get("offer"),
                    bool(data.get("isComp", False)),
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


def _offer_metrics(cur: Any) -> dict[str, Any]:
    """PP-166 first-month offer stats. Comp (100% discount) invoices are always excluded."""
    cur.execute(
        """
        SELECT COUNT(DISTINCT stripe_subscription_id) AS redemptions,
               COALESCE(SUM(amount_cents), 0) AS revenue
        FROM admin_transactions
        WHERE offer IS NOT NULL AND status = 'succeeded' AND NOT is_comp
        """
    )
    row = cur.fetchone() or {}
    cur.execute(
        """
        SELECT COUNT(DISTINCT t.stripe_subscription_id) AS converted
        FROM admin_transactions t
        WHERE t.status = 'succeeded' AND NOT t.is_comp AND t.amount_cents >= 499
          AND t.stripe_subscription_id IN (
              SELECT stripe_subscription_id FROM admin_transactions
              WHERE offer IS NOT NULL AND NOT is_comp
          )
        """
    )
    conv = cur.fetchone() or {}
    return {
        "redemptions": int(row.get("redemptions") or 0),
        "revenueCents": int(row.get("revenue") or 0),
        "convertedToFullPrice": int(conv.get("converted") or 0),
    }


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
                "SELECT COALESCE(SUM(amount_cents), 0) AS total FROM admin_transactions WHERE status = 'succeeded' AND NOT is_comp"
            )
            lifetime_revenue = int(cur.fetchone()["total"])

            cur.execute(
                """
                SELECT COALESCE(SUM(amount_cents), 0) AS total FROM admin_transactions
                WHERE status = 'succeeded' AND NOT is_comp AND created_at >= %s
                """,
                (dates["currentStart"],),
            )
            current_revenue = int(cur.fetchone()["total"])

            cur.execute(
                """
                SELECT COALESCE(SUM(amount_cents), 0) AS total FROM admin_transactions
                WHERE status = 'succeeded' AND NOT is_comp AND created_at >= %s AND created_at < %s
                """,
                (dates["previousStart"], dates["previousEnd"]),
            )
            previous_revenue = int(cur.fetchone()["total"])

            mom_growth = (
                ((current_revenue - previous_revenue) / previous_revenue * 100)
                if previous_revenue > 0
                else (100.0 if current_revenue > 0 else 0.0)
            )

            offer_metrics = _offer_metrics(cur)

            # PP-244: active = any authenticated API call that day (user_active_days)
            # or a fresh sign-in (login_events). Sign-ins alone undercount because
            # sessions last 30 days.
            cur.execute(
                """
                SELECT
                    COUNT(DISTINCT user_id) FILTER (WHERE day >= CURRENT_DATE) AS dau,
                    COUNT(DISTINCT user_id) FILTER (WHERE day >= CURRENT_DATE - 6) AS wau,
                    COUNT(DISTINCT user_id) FILTER (WHERE day >= CURRENT_DATE - 29) AS mau
                FROM (
                    SELECT user_id, day FROM user_active_days WHERE day >= CURRENT_DATE - 29
                    UNION
                    SELECT user_id, created_at::date AS day FROM login_events
                    WHERE created_at >= CURRENT_DATE - 29
                ) active
                """
            )
            active_row = cur.fetchone() or {}
            dau = int(active_row.get("dau") or 0)
            wau = int(active_row.get("wau") or 0)
            mau = int(active_row.get("mau") or 0)

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
        "logins": {"dau": dau, "wau": wau, "mau": mau, "sparkline": []},
        "transactions": recent_txns,
        "failedPayments": {"count": failed_count, "recent": failed_recent},
        "offer": offer_metrics,
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

            # PP-244: rows backfilled by migration 025 carry the migration time, not a
            # real signup time, so they never count as signups in a period.
            cur.execute(
                "SELECT COUNT(*) AS count FROM users WHERE created_at >= %s AND NOT created_at_estimated",
                (start_date,),
            )
            signups_period = int(cur.fetchone()["count"])

            cur.execute("SELECT COUNT(*) AS count FROM users WHERE created_at_estimated")
            signups_pre_tracking = int(cur.fetchone()["count"])

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
            # Accounts created before signup times were recorded (date unknown).
            "preTracking": signups_pre_tracking,
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


def _mask_email_str(email: Optional[str]) -> str:
    """Mask email for admin viewing (e.g. t***@domain.com)."""
    if not email:
        return "[EMPTY]"
    parts = email.split("@", 1)
    if len(parts) == 2:
        name, domain = parts
        first = name[0] if name else ""
        return f"{first}***@{domain}"
    return "***"


def get_email_metrics(period: Period = "7d") -> dict[str, Any]:
    """Retrieve marketing and transactional email visibility metrics (PP-125)."""
    import os
    from backend.services.email_service import DEFAULT_FROM

    now = datetime.now(timezone.utc)
    days = 7 if period == "7d" else 30 if period == "30d" else 90
    cutoff = (now - timedelta(days=days)).isoformat()

    resend_key = (os.getenv("RESEND_API_KEY") or "").strip()
    webhook_secret = (os.getenv("RESEND_WEBHOOK_SECRET") or "").strip()
    from_addr = (os.getenv("RESEND_FROM_EMAIL") or "").strip() or DEFAULT_FROM

    config = {
        "resend_configured": bool(resend_key),
        "from_address": from_addr,
        "webhook_secret_present": bool(webhook_secret),
    }

    with db_connection() as conn:
        with conn.cursor() as cur:
            # 1. sends_by_template (exclude status = 'backfill')
            cur.execute(
                """
                SELECT template, COUNT(*) AS count
                FROM email_sends
                WHERE status <> 'backfill' AND created_at >= %s
                GROUP BY template
                ORDER BY count DESC
                """,
                (cutoff,),
            )
            sends_by_template = [
                {"template": str(r["template"]), "count": int(r["count"])}
                for r in (cur.fetchall() or [])
            ]

            # 2. sends_by_day (exclude status = 'backfill')
            cur.execute(
                """
                SELECT DATE(created_at) AS day, COUNT(*) AS count
                FROM email_sends
                WHERE status <> 'backfill' AND created_at >= %s
                GROUP BY DATE(created_at)
                ORDER BY day ASC
                """,
                (cutoff,),
            )
            sends_by_day = [
                {"day": str(r["day"]), "count": int(r["count"])}
                for r in (cur.fetchall() or [])
            ]

            # 3. status counts (all statuses in period, or non-backfill)
            cur.execute(
                """
                SELECT status, COUNT(*) AS count
                FROM email_sends
                WHERE status <> 'backfill' AND created_at >= %s
                GROUP BY status
                """,
                (cutoff,),
            )
            status_counts = {str(r["status"]): int(r["count"]) for r in (cur.fetchall() or [])}

            # 4. Webhook presence check: check if any webhook-backed row exists
            # Either email_events table has rows OR email_sends has status in ('delivered', 'bounced', 'complained')
            # email_events exists since migration 028 (PP-124). No try/except here:
            # a failed statement would abort the Postgres transaction.
            cur.execute("SELECT 1 FROM email_events LIMIT 1")
            has_webhook_rows = bool(cur.fetchone())

            if not has_webhook_rows:
                cur.execute(
                    """
                    SELECT 1 FROM email_sends
                    WHERE status IN ('delivered', 'bounced', 'complained')
                    LIMIT 1
                    """
                )
                if cur.fetchone():
                    has_webhook_rows = True

            # 5. rates calculation
            if not has_webhook_rows:
                rates: Optional[dict[str, Any]] = None
                rates_reason: Optional[str] = "pending webhook"
            else:
                rates_reason = None
                # Base is sent-or-later rows: sent, delivered, bounced, complained
                cur.execute(
                    """
                    SELECT
                        COUNT(*) AS total_sent,
                        COALESCE(SUM(CASE WHEN status = 'delivered' THEN 1 ELSE 0 END), 0) AS delivered,
                        COALESCE(SUM(CASE WHEN status = 'bounced' THEN 1 ELSE 0 END), 0) AS bounced,
                        COALESCE(SUM(CASE WHEN status = 'complained' THEN 1 ELSE 0 END), 0) AS complained
                    FROM email_sends
                    WHERE status IN ('sent', 'delivered', 'bounced', 'complained')
                      AND created_at >= %s
                    """,
                    (cutoff,),
                )
                rate_row = cur.fetchone() or {}
                tot = int(rate_row.get("total_sent") or 0)
                if tot > 0:
                    rates = {
                        "delivered": round(int(rate_row.get("delivered") or 0) / tot, 4),
                        "bounced": round(int(rate_row.get("bounced") or 0) / tot, 4),
                        "complained": round(int(rate_row.get("complained") or 0) / tot, 4),
                        "total_sent": tot,
                    }
                else:
                    rates = {
                        "delivered": 0.0,
                        "bounced": 0.0,
                        "complained": 0.0,
                        "total_sent": 0,
                    }

            # 6. recent_failures (status = 'failed', limit 20: created_at, template, to_email masked, error_message)
            cur.execute(
                """
                SELECT created_at, template, to_email, error_message
                FROM email_sends
                WHERE status = 'failed'
                ORDER BY created_at DESC
                LIMIT 20
                """
            )
            recent_failures = []
            for r in (cur.fetchall() or []):
                created_at_val = r["created_at"]
                if isinstance(created_at_val, datetime):
                    created_at_str = created_at_val.isoformat()
                else:
                    created_at_str = str(created_at_val)
                recent_failures.append({
                    "created_at": created_at_str,
                    "template": str(r.get("template") or ""),
                    "to_email": _mask_email_str(r.get("to_email")),
                    "error_message": str(r.get("error_message") or ""),
                })

            # 7. suppressions (count + latest 20 masked emails with reason/created_at)
            cur.execute("SELECT COUNT(*) AS count FROM email_suppressions")
            suppressions_count = int((cur.fetchone() or {}).get("count") or 0)

            cur.execute(
                """
                SELECT email, reason, created_at
                FROM email_suppressions
                ORDER BY created_at DESC
                LIMIT 20
                """
            )
            suppressions_items = []
            for r in (cur.fetchall() or []):
                created_at_val = r["created_at"]
                if isinstance(created_at_val, datetime):
                    created_at_str = created_at_val.isoformat()
                else:
                    created_at_str = str(created_at_val)
                suppressions_items.append({
                    "email": _mask_email_str(r.get("email")),
                    "reason": str(r.get("reason") or ""),
                    "created_at": created_at_str,
                })

            suppressions = {
                "count": suppressions_count,
                "items": suppressions_items,
            }

            # 8. recent_sends (limit 50: created_at, masked to_email, template, subject, status, resend_id)
            cur.execute(
                """
                SELECT created_at, to_email, template, subject, status, resend_id
                FROM email_sends
                WHERE status <> 'backfill'
                ORDER BY created_at DESC
                LIMIT 50
                """
            )
            recent_sends = []
            for r in (cur.fetchall() or []):
                created_at_val = r["created_at"]
                if isinstance(created_at_val, datetime):
                    created_at_str = created_at_val.isoformat()
                else:
                    created_at_str = str(created_at_val)
                recent_sends.append({
                    "created_at": created_at_str,
                    "to_email": _mask_email_str(r.get("to_email")),
                    "template": str(r.get("template") or ""),
                    "subject": str(r.get("subject") or ""),
                    "status": str(r.get("status") or ""),
                    "resend_id": r.get("resend_id"),
                })

    return {
        "period": period,
        "config": config,
        "sends_by_template": sends_by_template,
        "sends_by_day": sends_by_day,
        "status_counts": status_counts,
        "rates": rates,
        "rates_reason": rates_reason,
        "recent_failures": recent_failures,
        "suppressions": suppressions,
        "recent_sends": recent_sends,
    }

