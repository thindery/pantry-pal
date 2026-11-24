"""Pantry items and activities database operations."""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Any, Optional

from backend.services.barcode_service import barcode_variants
from database.db import db_connection


def _now() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def _row_to_item(row: dict[str, Any]) -> dict[str, Any]:
    target_qty = row.get("target_quantity")
    return {
        "id": row["id"],
        "userId": row["user_id"],
        "name": row["name"],
        "quantity": float(row["quantity"]),
        "unit": row["unit"],
        "category": row["category"],
        "lastUpdated": row["last_updated"],
        "barcode": row.get("barcode"),
        "imageUrl": row.get("image_url") or None,
        "targetQuantity": float(target_qty) if target_qty is not None else None,
        "groupId": row.get("group_id"),
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
                    """
                    SELECT i.*, p.image_url
                    FROM pantry_items i
                    LEFT JOIN product_cache p ON p.barcode = i.barcode
                    WHERE i.user_id = %s AND i.category = %s
                    ORDER BY i.name
                    """,
                    (user_id, category),
                )
            else:
                cur.execute(
                    """
                    SELECT i.*, p.image_url
                    FROM pantry_items i
                    LEFT JOIN product_cache p ON p.barcode = i.barcode
                    WHERE i.user_id = %s
                    ORDER BY i.name
                    """,
                    (user_id,),
                )
            return [_row_to_item(r) for r in cur.fetchall()]


def get_item_by_name(user_id: str, name: str) -> Optional[dict[str, Any]]:
    with db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT * FROM pantry_items WHERE user_id = %s AND LOWER(name) = LOWER(%s)",
                (user_id, name),
            )
            row = cur.fetchone()
            return _row_to_item(row) if row else None


def get_item_by_id(user_id: str, item_id: str) -> Optional[dict[str, Any]]:
    with db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT i.*, p.image_url
                FROM pantry_items i
                LEFT JOIN product_cache p ON p.barcode = i.barcode
                WHERE i.user_id = %s AND i.id = %s
                """,
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



def _clean_barcode(barcode: Optional[str]) -> Optional[str]:
    if not barcode:
        return None
    clean = "".join(c for c in str(barcode) if c.isdigit())
    return clean or None


def _advisory_lock_key(user_id: str, barcode: Optional[str], name: str, category: str) -> str:
    if barcode:
        variants = barcode_variants(barcode)
        # Prefer the 12-digit form when a leading-zero EAN-13 variant exists.
        canon = min(variants, key=lambda v: (len(v), v))
        return f"pantry:{user_id}:barcode:{canon}"
    return f"pantry:{user_id}:name:{name.casefold().strip()}:{category}"


def _find_existing_item(
    cur,
    user_id: str,
    *,
    barcode: Optional[str] = None,
    name: Optional[str] = None,
    category: Optional[str] = None,
    for_update: bool = False,
) -> Optional[dict[str, Any]]:
    lock = " FOR UPDATE OF i" if for_update else ""
    clean = _clean_barcode(barcode)
    if clean:
        cur.execute(
            f"""
            SELECT i.*, p.image_url
            FROM pantry_items i
            LEFT JOIN product_cache p ON p.barcode = i.barcode
            WHERE i.user_id = %s AND i.barcode = ANY(%s)
            ORDER BY i.created_at ASC, i.id ASC
            LIMIT 1
            {lock}
            """,
            (user_id, barcode_variants(clean)),
        )
        row = cur.fetchone()
        if row:
            return _row_to_item(row)
        # PP-156: Close the Milk gap: when an add has a barcode and no row matches
        # that barcode, attach to an existing UNBARCODED row with the same normalized name
        if name:
            cur.execute(
                f"""
                SELECT i.*, p.image_url
                FROM pantry_items i
                LEFT JOIN product_cache p ON p.barcode = i.barcode
                WHERE i.user_id = %s
                  AND (i.barcode IS NULL OR i.barcode = '')
                  AND LOWER(BTRIM(i.name)) = LOWER(BTRIM(%s))
                ORDER BY i.created_at ASC, i.id ASC
                LIMIT 1
                {lock}
                """,
                (user_id, name),
            )
            row = cur.fetchone()
            if row:
                return _row_to_item(row)
        return None
    if not name or not category:
        return None
    cur.execute(
        f"""
        SELECT i.*, p.image_url
        FROM pantry_items i
        LEFT JOIN product_cache p ON p.barcode = i.barcode
        WHERE i.user_id = %s
          AND (i.barcode IS NULL OR i.barcode = '')
          AND LOWER(BTRIM(i.name)) = LOWER(BTRIM(%s))
          AND i.category = %s
        ORDER BY i.created_at ASC, i.id ASC
        LIMIT 1
        {lock}
        """,
        (user_id, name, category),
    )
    row = cur.fetchone()
    return _row_to_item(row) if row else None


def find_existing_item(
    user_id: str,
    *,
    barcode: Optional[str] = None,
    name: Optional[str] = None,
    category: Optional[str] = None,
) -> Optional[dict[str, Any]]:
    """Return the user's existing item for a barcode (including UPC/EAN variants) or unbarcoded name+category."""
    with db_connection() as conn:
        with conn.cursor() as cur:
            return _find_existing_item(
                cur, user_id, barcode=barcode, name=name, category=category, for_update=False
            )


def add_or_increment_item(user_id: str, data: dict[str, Any]) -> tuple[dict[str, Any], bool]:
    """Insert a pantry item, or add to quantity if the user already has it.

    Matches barcode variants (UPC-A vs EAN-13 with a leading 0) when a barcode
    is present; otherwise matches normalized name + category among unbarcoded
    items. Uses a transaction-scoped advisory lock so concurrent scans cannot
    create two rows.
    """
    barcode = _clean_barcode(data.get("barcode"))
    name = data["name"]
    category = data["category"]
    quantity = data["quantity"]
    unit = data["unit"]
    target_quantity = data.get("targetQuantity") if "targetQuantity" in data else data.get("target_quantity")
    now = _now()
    lock_key = _advisory_lock_key(user_id, barcode, name, category)

    with db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT pg_advisory_xact_lock(('x' || substr(md5(%s), 1, 16))::bit(64)::bigint)",
                (lock_key,),
            )
            existing = _find_existing_item(
                cur,
                user_id,
                barcode=barcode,
                name=name,
                category=category,
                for_update=True,
            )
            if existing:
                if barcode and not existing.get("barcode"):
                    cur.execute(
                        """
                        UPDATE pantry_items
                        SET quantity = quantity + %s, barcode = %s, last_updated = %s
                        WHERE user_id = %s AND id = %s
                        RETURNING *
                        """,
                        (quantity, barcode, now, user_id, existing["id"]),
                    )
                else:
                    cur.execute(
                        """
                        UPDATE pantry_items
                        SET quantity = quantity + %s, last_updated = %s
                        WHERE user_id = %s AND id = %s
                        RETURNING *
                        """,
                        (quantity, now, user_id, existing["id"]),
                    )
                row = cur.fetchone()
                item = _row_to_item({**row, "image_url": existing.get("imageUrl")})
                return item, False

            item_id = str(uuid.uuid4())
            cur.execute(
                """
                INSERT INTO pantry_items (id, user_id, name, barcode, quantity, unit, category, last_updated, target_quantity)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                """,
                (item_id, user_id, name, barcode, quantity, unit, category, now, target_quantity),
            )
    return {
        "id": item_id,
        "userId": user_id,
        "name": name,
        "barcode": barcode,
        "quantity": quantity,
        "unit": unit,
        "category": category,
        "lastUpdated": now,
        "targetQuantity": target_quantity,
    }, True


def create_item(user_id: str, data: dict[str, Any]) -> dict[str, Any]:
    item_id = str(uuid.uuid4())
    now = _now()
    target_quantity = data.get("targetQuantity") if "targetQuantity" in data else data.get("target_quantity")
    with db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO pantry_items (id, user_id, name, barcode, quantity, unit, category, last_updated, target_quantity)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
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
                    target_quantity,
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
        "targetQuantity": target_quantity,
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
        ("targetQuantity", "target_quantity"),
        ("target_quantity", "target_quantity"),
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
    adjust_quantity: bool = True,
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
            if adjust_quantity:
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