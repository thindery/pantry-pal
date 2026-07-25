"""Shopping session operations."""

from __future__ import annotations

import json
import uuid
from datetime import datetime, timezone
from typing import Any, Optional

from database.db import db_connection
from backend.services import pantry_service, subscription_service


def _now() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def _map_session(row: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": row["id"],
        "userId": row["user_id"],
        "storeName": row.get("store_name"),
        "startedAt": row["started_at"],
        "completedAt": row.get("completed_at"),
        "status": row["status"],
        "totalAmount": float(row.get("total_amount") or 0),
        "itemCount": int(row.get("item_count") or 0),
        "receiptUrl": row.get("receipt_url"),
        "notes": row.get("notes"),
        "createdAt": str(row.get("created_at", "")),
        "updatedAt": str(row.get("updated_at", "")),
    }


def _map_item(row: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": row["id"],
        "sessionId": row["session_id"],
        "barcode": row.get("barcode"),
        "name": row["name"],
        "quantity": float(row["quantity"]),
        "unit": row.get("unit"),
        "price": float(row["price"]) if row.get("price") is not None else None,
        "category": row.get("category"),
        "addedAt": row["added_at"],
        "updatedAt": row.get("updated_at"),
    }


def create_session(user_id: str, data: dict[str, Any]) -> dict[str, Any]:
    session_id = str(uuid.uuid4())
    now = _now()
    with db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO shopping_sessions (
                    id, user_id, store_name, started_at, status, total_amount, item_count, notes, created_at, updated_at
                ) VALUES (%s, %s, %s, %s, 'active', 0, 0, %s, %s, %s)
                """,
                (session_id, user_id, data.get("storeName"), now, data.get("notes"), now, now),
            )
    return {
        "id": session_id,
        "userId": user_id,
        "storeName": data.get("storeName"),
        "startedAt": now,
        "status": "active",
        "totalAmount": 0,
        "itemCount": 0,
        "notes": data.get("notes"),
        "createdAt": now,
        "updatedAt": now,
    }


def get_session_by_id(user_id: str, session_id: str) -> Optional[dict[str, Any]]:
    with db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT * FROM shopping_sessions WHERE user_id = %s AND id = %s",
                (user_id, session_id),
            )
            session_row = cur.fetchone()
            if not session_row:
                return None
            cur.execute(
                "SELECT * FROM session_items WHERE session_id = %s ORDER BY added_at DESC",
                (session_id,),
            )
            items = [_map_item(r) for r in cur.fetchall()]
    result = _map_session(session_row)
    result["items"] = items
    return result


def get_user_sessions(
    user_id: str,
    limit: int = 20,
    offset: int = 0,
    status: Optional[str] = None,
) -> list[dict[str, Any]]:
    with db_connection() as conn:
        with conn.cursor() as cur:
            if status:
                cur.execute(
                    """
                    SELECT * FROM shopping_sessions WHERE user_id = %s AND status = %s
                    ORDER BY started_at DESC LIMIT %s OFFSET %s
                    """,
                    (user_id, status, limit, offset),
                )
            else:
                cur.execute(
                    """
                    SELECT * FROM shopping_sessions WHERE user_id = %s
                    ORDER BY started_at DESC LIMIT %s OFFSET %s
                    """,
                    (user_id, limit, offset),
                )
            return [_map_session(r) for r in cur.fetchall()]


def get_session_count(user_id: str, status: Optional[str] = None) -> int:
    with db_connection() as conn:
        with conn.cursor() as cur:
            if status:
                cur.execute(
                    "SELECT COUNT(*) AS count FROM shopping_sessions WHERE user_id = %s AND status = %s",
                    (user_id, status),
                )
            else:
                cur.execute(
                    "SELECT COUNT(*) AS count FROM shopping_sessions WHERE user_id = %s",
                    (user_id,),
                )
            return int(cur.fetchone()["count"])


def add_session_item(user_id: str, session_id: str, data: dict[str, Any]) -> dict[str, Any]:
    with db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT id FROM shopping_sessions WHERE id = %s AND user_id = %s AND status = 'active'",
                (session_id, user_id),
            )
            if not cur.fetchone():
                raise ValueError("Session not found or not active")
            item_id = str(uuid.uuid4())
            now = _now()
            qty = data.get("quantity", 1)
            price = data.get("price") or 0
            cur.execute(
                """
                INSERT INTO session_items (
                    id, session_id, barcode, name, quantity, unit, price, category, added_at, updated_at
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                """,
                (
                    item_id,
                    session_id,
                    data.get("barcode"),
                    data["name"],
                    qty,
                    data.get("unit"),
                    data.get("price"),
                    data.get("category"),
                    now,
                    now,
                ),
            )
            cur.execute(
                """
                UPDATE shopping_sessions
                SET total_amount = total_amount + %s, item_count = item_count + 1, updated_at = %s
                WHERE id = %s
                """,
                (price * qty, now, session_id),
            )
    return {
        "id": item_id,
        "sessionId": session_id,
        "barcode": data.get("barcode"),
        "name": data["name"],
        "quantity": qty,
        "unit": data.get("unit"),
        "price": data.get("price"),
        "category": data.get("category"),
        "addedAt": now,
        "updatedAt": now,
    }


def remove_session_item(user_id: str, session_id: str, item_id: str) -> bool:
    with db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT quantity, price FROM session_items WHERE id = %s AND session_id = %s",
                (item_id, session_id),
            )
            item = cur.fetchone()
            if not item:
                return False
            cur.execute(
                "DELETE FROM session_items WHERE id = %s AND session_id = %s",
                (item_id, session_id),
            )
            if cur.rowcount == 0:
                return False
            now = _now()
            total = (item.get("price") or 0) * item["quantity"]
            cur.execute(
                """
                UPDATE shopping_sessions
                SET total_amount = GREATEST(0, total_amount - %s),
                    item_count = GREATEST(0, item_count - 1),
                    updated_at = %s
                WHERE id = %s AND user_id = %s
                """,
                (total, now, session_id, user_id),
            )
    return True


def complete_session(user_id: str, session_id: str, data: dict[str, Any]) -> Optional[dict[str, Any]]:
    now = _now()
    with db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT * FROM shopping_sessions WHERE id = %s AND user_id = %s AND status = 'active'",
                (session_id, user_id),
            )
            session = cur.fetchone()
            if not session:
                return None
            cur.execute(
                "SELECT COALESCE(SUM(price * quantity), 0) AS total FROM session_items WHERE session_id = %s",
                (session_id,),
            )
            final_total = float(cur.fetchone()["total"] or session["total_amount"])
            cur.execute(
                """
                UPDATE shopping_sessions
                SET status = 'completed', completed_at = %s, total_amount = %s,
                    receipt_url = COALESCE(%s, receipt_url), notes = COALESCE(%s, notes), updated_at = %s
                WHERE id = %s AND user_id = %s
                """,
                (now, final_total, data.get("receiptUrl"), data.get("notes"), now, session_id, user_id),
            )
            activity_id = str(uuid.uuid4())
            metadata = json.dumps(
                {
                    "sessionId": session_id,
                    "itemCount": session["item_count"],
                    "storeName": session.get("store_name"),
                }
            )
            cur.execute(
                """
                INSERT INTO activities (id, user_id, item_id, item_name, type, amount, timestamp, source, metadata)
                VALUES (%s, %s, %s, %s, 'SHOPPING_SESSION', %s, %s, 'SHOPPING_SESSION', %s)
                """,
                (
                    activity_id,
                    user_id,
                    session_id,
                    f"Shopping Session ({session.get('store_name') or 'Unknown Store'})",
                    final_total,
                    now,
                    metadata,
                ),
            )
    return get_session_by_id(user_id, session_id)


def cancel_session(user_id: str, session_id: str) -> bool:
    now = _now()
    with db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                UPDATE shopping_sessions SET status = 'cancelled', updated_at = %s
                WHERE id = %s AND user_id = %s AND status = 'active'
                """,
                (now, session_id, user_id),
            )
            return cur.rowcount > 0


def update_session_receipt(user_id: str, session_id: str, receipt_url: str) -> Optional[dict[str, Any]]:
    now = _now()
    with db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                UPDATE shopping_sessions SET receipt_url = %s, updated_at = %s
                WHERE id = %s AND user_id = %s AND status = 'completed'
                """,
                (receipt_url, now, session_id, user_id),
            )
            if cur.rowcount == 0:
                return None
    return get_session_by_id(user_id, session_id)


def add_session_to_inventory(user_id: str, session_id: str) -> dict[str, Any]:
    """Import inventory items from a completed session.

    Enforces free-tier item caps (SEC-201 / PP-065) so shopping sessions
    cannot bypass the same limit as POST /api/items.
    """
    session = get_session_by_id(user_id, session_id)
    if not session:
        raise ValueError("Session not found")
    if session["status"] != "completed":
        raise ValueError("Session must be completed before adding to inventory")

    to_add = [item for item in session.get("items", []) if item.get("barcode")]
    existing_count = len(pantry_service.get_all_items(user_id))
    tier_check = subscription_service.can_add_items(user_id, existing_count)
    remaining = tier_check["remaining"]
    if remaining != -1 and len(to_add) > remaining:
        raise PermissionError(
            f"Item limit reached for your plan. "
            f"Session would add {len(to_add)} items but only {remaining} remaining."
        )

    items_added: list[dict[str, Any]] = []
    activities: list[dict[str, Any]] = []

    for item in to_add:
        pantry_item = pantry_service.create_item(
            user_id,
            {
                "name": item["name"],
                "quantity": item["quantity"],
                "unit": item.get("unit") or "pieces",
                "category": item.get("category") or "other",
                "barcode": item["barcode"],
            },
        )
        activity = pantry_service.log_activity(
            user_id, pantry_item["id"], "ADD", item["quantity"], "SHOPPING_SESSION"
        )
        if activity:
            activities.append(activity)
        items_added.append(pantry_item)

    return {"items": items_added, "activities": activities}