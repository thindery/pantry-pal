"""Pantry items and activities database operations."""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Any, Optional

from database.db import db_connection


def _now() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def _row_to_item(row: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": row["id"],
        "userId": row["user_id"],
        "name": row["name"],
        "quantity": float(row["quantity"]),
        "unit": row["unit"],
        "category": row["category"],
        "lastUpdated": row["last_updated"],
        "barcode": row.get("barcode"),
    }


def _row_to_activity(row: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": row["id"],
        "userId": row["user_id"],
        "itemId": row["item_id"],
        "itemName": row["item_name"],
        "type": row["type"],
        "amount": float(row["amount"]),
        "timestamp": row["timestamp"],
        "source": row["source"],
        "metadata": row.get("metadata"),
    }


def get_all_items(user_id: str, category: Optional[str] = None) -> list[dict[str, Any]]:
    with db_connection() as conn:
        with conn.cursor() as cur:
            if category:
                cur.execute(
                    "SELECT * FROM pantry_items WHERE user_id = %s AND category = %s ORDER BY name",
                    (user_id, category),
                )
            else:
                cur.execute(
                    "SELECT * FROM pantry_items WHERE user_id = %s ORDER BY name",
                    (user_id,),
                )
            return [_row_to_item(r) for r in cur.fetchall()]


def get_item_by_id(user_id: str, item_id: str) -> Optional[dict[str, Any]]:
    with db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT * FROM pantry_items WHERE user_id = %s AND id = %s",
                (user_id, item_id),
            )
            row = cur.fetchone()
            return _row_to_item(row) if row else None


def get_categories(user_id: str) -> list[str]:
    with db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT DISTINCT category FROM pantry_items WHERE user_id = %s ORDER BY category",
                (user_id,),
            )
            return [r["category"] for r in cur.fetchall()]


def create_item(user_id: str, data: dict[str, Any]) -> dict[str, Any]:
    item_id = str(uuid.uuid4())
    now = _now()
    with db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO pantry_items (id, user_id, name, barcode, quantity, unit, category, last_updated)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                """,
                (
                    item_id,
                    user_id,
                    data["name"],
                    data.get("barcode"),
                    data["quantity"],
                    data["unit"],
                    data["category"],
                    now,
                ),
            )
    return {
        "id": item_id,
        "userId": user_id,
        "name": data["name"],
        "barcode": data.get("barcode"),
        "quantity": data["quantity"],
        "unit": data["unit"],
        "category": data["category"],
        "lastUpdated": now,
    }


def update_item(user_id: str, item_id: str, data: dict[str, Any]) -> Optional[dict[str, Any]]:
    existing = get_item_by_id(user_id, item_id)
    if not existing:
        return None
    now = _now()
    fields = []
    params: list[Any] = []
    for key, col in [
        ("name", "name"),
        ("barcode", "barcode"),
        ("quantity", "quantity"),
        ("unit", "unit"),
        ("category", "category"),
    ]:
        if key in data:
            fields.append(f"{col} = %s")
            params.append(data[key])
    fields.append("last_updated = %s")
    params.append(now)
    params.extend([user_id, item_id])
    with db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                f"UPDATE pantry_items SET {', '.join(fields)} WHERE user_id = %s AND id = %s",
                params,
            )
    return get_item_by_id(user_id, item_id)


def delete_item(user_id: str, item_id: str) -> bool:
    with db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "DELETE FROM pantry_items WHERE user_id = %s AND id = %s",
                (user_id, item_id),
            )
            return cur.rowcount > 0


def get_activities(
    user_id: str,
    limit: int = 20,
    offset: int = 0,
    item_id: Optional[str] = None,
) -> list[dict[str, Any]]:
    with db_connection() as conn:
        with conn.cursor() as cur:
            if item_id:
                cur.execute(
                    """
                    SELECT * FROM activities WHERE user_id = %s AND item_id = %s
                    ORDER BY timestamp DESC LIMIT %s OFFSET %s
                    """,
                    (user_id, item_id, limit, offset),
                )
            else:
                cur.execute(
                    """
                    SELECT * FROM activities WHERE user_id = %s
                    ORDER BY timestamp DESC LIMIT %s OFFSET %s
                    """,
                    (user_id, limit, offset),
                )
            return [_row_to_activity(r) for r in cur.fetchall()]


def get_activity_count(user_id: str, item_id: Optional[str] = None) -> int:
    with db_connection() as conn:
        with conn.cursor() as cur:
            if item_id:
                cur.execute(
                    "SELECT COUNT(*) AS count FROM activities WHERE user_id = %s AND item_id = %s",
                    (user_id, item_id),
                )
            else:
                cur.execute(
                    "SELECT COUNT(*) AS count FROM activities WHERE user_id = %s",
                    (user_id,),
                )
            return int(cur.fetchone()["count"])


def log_activity(
    user_id: str,
    item_id: str,
    activity_type: str,
    amount: float,
    source: str = "MANUAL",
) -> Optional[dict[str, Any]]:
    item = get_item_by_id(user_id, item_id)
    if not item:
        return None

    activity_id = str(uuid.uuid4())
    now = _now()
    quantity_adj = 0.0
    actual_amount = amount

    if activity_type == "ADD":
        quantity_adj = amount
    elif activity_type == "REMOVE":
        quantity_adj = -amount
        actual_amount = min(amount, item["quantity"])
    elif activity_type == "ADJUST":
        quantity_adj = amount
        actual_amount = abs(amount)

    with db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO activities (id, user_id, item_id, item_name, type, amount, timestamp, source)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                """,
                (
                    activity_id,
                    user_id,
                    item_id,
                    item["name"],
                    activity_type,
                    actual_amount,
                    now,
                    source,
                ),
            )
            new_qty = max(0.0, item["quantity"] + quantity_adj)
            cur.execute(
                "UPDATE pantry_items SET quantity = %s, last_updated = %s WHERE user_id = %s AND id = %s",
                (new_qty, now, user_id, item_id),
            )

    return {
        "id": activity_id,
        "userId": user_id,
        "itemId": item_id,
        "itemName": item["name"],
        "type": activity_type,
        "amount": actual_amount,
        "timestamp": now,
        "source": source,
    }