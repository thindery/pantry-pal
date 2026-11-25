"""PP-137: opt-in weekly low-stock digest.

Off unless ``LOW_STOCK_DIGEST_ENABLED=1``. Even then it only mails users who
turned it on themselves (``email_preferences.low_stock_digest``), lists only
items at or below that user's own thresholds (synced from the app), skips
users with nothing low, and every mail carries a one-click unsubscribe.
There is no expiry digest: pantry items have no expiration field.
"""

from __future__ import annotations

import logging
import os
import secrets
from datetime import datetime, timezone
from typing import Any, Optional

from psycopg2.extras import Json

from backend.services import email_service
from database.db import db_connection

logger = logging.getLogger(__name__)

ENV_FLAG = "LOW_STOCK_DIGEST_ENABLED"
TEMPLATE = "low_stock_digest"
MAX_ITEMS = 25


def is_enabled() -> bool:
    return (os.getenv(ENV_FLAG) or "").strip().lower() in {"1", "true", "yes", "on"}


def _clean_numbers(raw: Any, max_keys: int = 500) -> dict[str, float]:
    out: dict[str, float] = {}
    if not isinstance(raw, dict):
        return out
    for key, value in list(raw.items())[:max_keys]:
        if not isinstance(key, str) or len(key) > 200:
            continue
        if isinstance(value, bool) or not isinstance(value, (int, float)):
            continue
        if value != value or value < 0 or value > 100000:  # NaN or out of range
            continue
        out[key] = float(value)
    return out


def item_threshold(item: dict[str, Any], categories: dict[str, float], overrides: dict[str, float]) -> float:
    """Mirror of frontend getItemTarget: item override, then target_quantity, then category, then 1."""
    override = overrides.get(str(item.get("id")))
    if override is not None:
        return override
    target = item.get("target_quantity")
    if target is not None:
        return float(target)
    category = item.get("category")
    if category in categories:
        return categories[category]
    return 1.0


def low_items(items: list[dict[str, Any]], categories: dict[str, float], overrides: dict[str, float]) -> list[dict[str, Any]]:
    """Items at or below the user's threshold. Out-of-stock (0) counts as at or below."""
    picked = []
    for item in items:
        qty = float(item.get("quantity") or 0)
        threshold = item_threshold(item, categories, overrides)
        if qty <= threshold:
            picked.append({**item, "quantity": qty, "threshold": threshold})
    picked.sort(key=lambda i: (i["quantity"] > 0, str(i.get("name") or "").lower()))
    return picked


def get_preferences(user_id: str) -> dict[str, Any]:
    with db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT low_stock_digest FROM email_preferences WHERE user_id = %s", (user_id,))
            row = cur.fetchone()
    return {"available": is_enabled(), "lowStockDigest": bool(row and row["low_stock_digest"])}


def set_preferences(
    user_id: str,
    *,
    low_stock_digest: Optional[bool] = None,
    threshold_config: Any = None,
    item_threshold_overrides: Any = None,
) -> dict[str, Any]:
    categories = _clean_numbers(threshold_config) if threshold_config is not None else None
    overrides = _clean_numbers(item_threshold_overrides) if item_threshold_overrides is not None else None
    now = datetime.now(timezone.utc)
    with db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO email_preferences (user_id, unsubscribe_token)
                VALUES (%s, %s)
                ON CONFLICT (user_id) DO NOTHING
                """,
                (user_id, secrets.token_urlsafe(32)),
            )
            if low_stock_digest is not None:
                cur.execute(
                    """
                    UPDATE email_preferences
                    SET low_stock_digest = %s,
                        opted_in_at = CASE WHEN %s THEN %s ELSE opted_in_at END,
                        unsubscribed_at = CASE WHEN %s THEN NULL ELSE %s END,
                        updated_at = %s
                    WHERE user_id = %s
                    """,
                    (low_stock_digest, low_stock_digest, now, low_stock_digest, now, now, user_id),
                )
            if categories is not None:
                cur.execute(
                    "UPDATE email_preferences SET threshold_config = %s, updated_at = %s WHERE user_id = %s",
                    (Json(categories), now, user_id),
                )
            if overrides is not None:
                cur.execute(
                    "UPDATE email_preferences SET item_threshold_overrides = %s, updated_at = %s WHERE user_id = %s",
                    (Json(overrides), now, user_id),
                )
    return get_preferences(user_id)


def unsubscribe(token: str) -> bool:
    """One-click unsubscribe by token. True when a matching row was switched off."""
    if not token or len(token) > 200:
        return False
    now = datetime.now(timezone.utc)
    with db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                UPDATE email_preferences
                SET low_stock_digest = FALSE, unsubscribed_at = %s, updated_at = %s
                WHERE unsubscribe_token = %s
                RETURNING user_id
                """,
                (now, now, token),
            )
            return cur.fetchone() is not None


def _fmt_qty(value: float) -> str:
    return str(int(value)) if float(value).is_integer() else f"{value:g}"


def render(items: list[dict[str, Any]], unsubscribe_url: str) -> tuple[str, str, str]:
    """Subject, html, text for one user's digest."""
    shown = items[:MAX_ITEMS]
    more = len(items) - len(shown)
    count = len(items)
    noun = "item" if count == 1 else "items"
    subject = f"Pantry Hub: {count} {noun} running low this week"
    lines_text = []
    rows_html = []
    for item in shown:
        unit = (item.get("unit") or "").strip()
        qty = _fmt_qty(item["quantity"])
        label = "Out" if item["quantity"] <= 0 else f"{qty}{(' ' + unit) if unit else ''} left"
        name = str(item.get("name") or "Item")
        lines_text.append(f"- {name}: {label}")
        rows_html.append(
            f'<li style="margin:0 0 6px 0;">{email_service._html_escape(name)}: '
            f'<span style="color:{email_service.COLOR_MUTED};">{email_service._html_escape(label)}</span></li>'
        )
    if more > 0:
        lines_text.append(f"- and {more} more in the app")
        rows_html.append(f'<li style="margin:0 0 6px 0;">and {more} more in the app</li>')
    intro = f"These {count} {noun} in your pantry are at or below the low-stock levels you set:"
    if count == 1:
        intro = "This item in your pantry is at or below the low-stock level you set:"
    footer = "You get this weekly because you turned on the low-stock email in Pantry Hub."
    body_html = f"""
      <p style="margin:0 0 12px 0;">{email_service._html_escape(intro)}</p>
      <ul style="margin:0 0 16px 18px;padding:0;">{''.join(rows_html)}</ul>
      <p style="margin:16px 0 0 0;font-size:13px;color:{email_service.COLOR_MUTED};">{email_service._html_escape(footer)}
        <a href="{email_service._html_escape(unsubscribe_url)}" style="color:{email_service.COLOR_MUTED};">Unsubscribe</a></p>
    """
    body_text = f"{intro}\n\n" + "\n".join(lines_text) + f"\n\n{footer}\nUnsubscribe: {unsubscribe_url}"
    html, text = email_service._wrap(
        title="Running low this week",
        preheader=f"{count} {noun} at or below your low-stock levels.",
        body_html=body_html,
        body_text=body_text,
        cta_label="Open my shopping list",
        cta_url=f"{email_service._app_url()}/dashboard/shopping-list/",
    )
    return subject, html, text


def _iso_week(now: datetime) -> str:
    year, week, _ = now.isocalendar()
    return f"{year}-W{week:02d}"


def _opted_in_users() -> list[dict[str, Any]]:
    with db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT p.user_id, p.threshold_config, p.item_threshold_overrides, p.unsubscribe_token, u.email
                FROM email_preferences p
                JOIN users u ON u.id::text = p.user_id
                WHERE p.low_stock_digest = TRUE AND u.email IS NOT NULL
                """
            )
            return list(cur.fetchall())


def _user_items(user_id: str) -> list[dict[str, Any]]:
    with db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT id, name, quantity, unit, category, target_quantity FROM pantry_items WHERE user_id = %s",
                (user_id,),
            )
            return list(cur.fetchall())


def run(now: Optional[datetime] = None, *, dry_run: bool = False) -> dict[str, int]:
    """Send this week's digest to opted-in users. No-op while the flag is off."""
    stats = {"enabled": int(is_enabled()), "users": 0, "sent": 0, "skipped_empty": 0, "skipped_other": 0}
    if not is_enabled():
        logger.info("Low-stock digest is off (%s unset)", ENV_FLAG)
        return stats
    now = now or datetime.now(timezone.utc)
    week = _iso_week(now)
    for row in _opted_in_users():
        stats["users"] += 1
        items = low_items(
            _user_items(row["user_id"]),
            _clean_numbers(row.get("threshold_config")),
            _clean_numbers(row.get("item_threshold_overrides")),
        )
        if not items:
            stats["skipped_empty"] += 1
            continue
        unsubscribe_url = f"{email_service._app_url()}/api/public/email/unsubscribe?token={row['unsubscribe_token']}"
        subject, html, text = render(items, unsubscribe_url)
        if dry_run:
            stats["sent"] += 1
            continue
        result = email_service.send_email(
            to=row["email"],
            subject=subject,
            html=html,
            text=text,
            template=TEMPLATE,
            idempotency_key=f"digest.low_stock:{row['user_id']}:{week}",
            user_id=row["user_id"],
            headers={
                "List-Unsubscribe": f"<{unsubscribe_url}>",
                "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
            },
        )
        stats["sent" if not result.get("skipped") else "skipped_other"] += 1
    return stats
