"""Service for managing pantry item groups."""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Any, Optional

from database.db import db_connection


class GroupNotFoundError(Exception):
    pass


class ItemNotFoundError(Exception):
    pass


def _format_group(row: dict[str, Any], item_ids: list[str]) -> dict[str, Any]:
    tq = row.get("target_quantity")
    return {
        "id": row["id"],
        "name": row["name"],
        "targetQuantity": float(tq) if tq is not None else None,
        "itemIds": item_ids,
        "createdAt": str(row.get("created_at", "")),
    }


def get_user_groups(user_id: str) -> list[dict[str, Any]]:
    """List all item groups for the authenticated user."""
    with db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT id, name, target_quantity, created_at, updated_at "
                "FROM item_groups WHERE user_id = %s ORDER BY created_at DESC",
                (user_id,),
            )
            groups = cur.fetchall()
            cur.execute(
                "SELECT id, group_id FROM pantry_items WHERE user_id = %s AND group_id IS NOT NULL",
                (user_id,),
            )
            items = cur.fetchall()

    group_item_map: dict[str, list[str]] = {}
    for item in items:
        gid = item["group_id"] if isinstance(item, dict) else item[1]
        iid = item["id"] if isinstance(item, dict) else item[0]
        group_item_map.setdefault(gid, []).append(iid)

    results = []
    for g in groups:
        gid = g["id"] if isinstance(g, dict) else g[0]
        item_ids = group_item_map.get(gid, [])
        results.append(_format_group(g, item_ids))
    return results


def get_group_by_id(user_id: str, group_id: str) -> Optional[dict[str, Any]]:
    """Get a single item group by ID for user."""
    with db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT id, name, target_quantity, created_at, updated_at "
                "FROM item_groups WHERE user_id = %s AND id = %s",
                (user_id, group_id),
            )
            g = cur.fetchone()
            if not g:
                return None
            cur.execute(
                "SELECT id FROM pantry_items WHERE user_id = %s AND group_id = %s ORDER BY name ASC",
                (user_id, group_id),
            )
            items = cur.fetchall()
            item_ids = [item["id"] if isinstance(item, dict) else item[0] for item in items]
            return _format_group(g, item_ids)


def create_group(
    user_id: str,
    name: str,
    item_ids: list[str],
    target_quantity: Optional[float] = None,
) -> dict[str, Any]:
    """Create a new item group and link items."""
    with db_connection() as conn:
        with conn.cursor() as cur:
            format_strings = ",".join(["%s"] * len(item_ids))
            cur.execute(
                f"SELECT id FROM pantry_items WHERE user_id = %s AND id IN ({format_strings})",
                [user_id, *item_ids],
            )
            rows = cur.fetchall()
            found_ids = {r["id"] if isinstance(r, dict) else r[0] for r in rows}
            if len(found_ids) != len(set(item_ids)):
                raise ItemNotFoundError("One or more items not found")

            group_id = str(uuid.uuid4())
            now_ts = datetime.now(timezone.utc)
            cur.execute(
                "INSERT INTO item_groups (id, user_id, name, target_quantity, created_at, updated_at) "
                "VALUES (%s, %s, %s, %s, %s, %s)",
                (group_id, user_id, name, target_quantity, now_ts, now_ts),
            )
            cur.execute(
                f"UPDATE pantry_items SET group_id = %s WHERE user_id = %s AND id IN ({format_strings})",
                [group_id, user_id, *item_ids],
            )
        conn.commit()

    return {
        "id": group_id,
        "name": name,
        "targetQuantity": float(target_quantity) if target_quantity is not None else None,
        "itemIds": list(item_ids),
        "createdAt": now_ts.isoformat(),
    }


def update_group(
    user_id: str,
    group_id: str,
    name: Optional[str] = None,
    target_quantity: Optional[float] = None,
    update_target: bool = False,
) -> dict[str, Any]:
    """Update name and/or target quantity of an item group."""
    with db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT * FROM item_groups WHERE user_id = %s AND id = %s",
                (user_id, group_id),
            )
            existing = cur.fetchone()
            if not existing:
                raise GroupNotFoundError(f"Group {group_id} not found")

            updates = []
            params: list[Any] = []
            if name is not None:
                updates.append("name = %s")
                params.append(name)
            if update_target:
                updates.append("target_quantity = %s")
                params.append(target_quantity)

            if updates:
                updates.append("updated_at = %s")
                params.append(datetime.now(timezone.utc))
                params.extend([user_id, group_id])
                cur.execute(
                    f"UPDATE item_groups SET {', '.join(updates)} WHERE user_id = %s AND id = %s",
                    params,
                )
        conn.commit()

    updated = get_group_by_id(user_id, group_id)
    if not updated:
        raise GroupNotFoundError(f"Group {group_id} not found")
    return updated


def delete_group(user_id: str, group_id: str) -> dict[str, Any]:
    """Unlink members and delete the group row."""
    with db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT * FROM item_groups WHERE user_id = %s AND id = %s",
                (user_id, group_id),
            )
            group = cur.fetchone()
            if not group:
                raise GroupNotFoundError(f"Group {group_id} not found")

            cur.execute(
                "SELECT id FROM pantry_items WHERE user_id = %s AND group_id = %s",
                (user_id, group_id),
            )
            rows = cur.fetchall()
            unlinked_ids = [r["id"] if isinstance(r, dict) else r[0] for r in rows]

            cur.execute(
                "UPDATE pantry_items SET group_id = NULL WHERE group_id = %s AND user_id = %s",
                (group_id, user_id),
            )
            cur.execute(
                "DELETE FROM item_groups WHERE user_id = %s AND id = %s",
                (user_id, group_id),
            )
        conn.commit()

    return {
        "deleted": True,
        "id": group_id,
        "unlinkedItemIds": unlinked_ids,
    }


def add_item_to_group(user_id: str, group_id: str, item_id: str) -> dict[str, Any]:
    """Add an item to a group, moving it from any other group."""
    with db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT * FROM item_groups WHERE user_id = %s AND id = %s",
                (user_id, group_id),
            )
            if not cur.fetchone():
                raise GroupNotFoundError(f"Group {group_id} not found")

            cur.execute(
                "SELECT id FROM pantry_items WHERE user_id = %s AND id = %s",
                (user_id, item_id),
            )
            if not cur.fetchone():
                raise ItemNotFoundError(f"Item {item_id} not found")

            cur.execute(
                "UPDATE pantry_items SET group_id = %s WHERE user_id = %s AND id = %s",
                (group_id, user_id, item_id),
            )
        conn.commit()

    updated = get_group_by_id(user_id, group_id)
    if not updated:
        raise GroupNotFoundError(f"Group {group_id} not found")
    return updated


def remove_item_from_group(user_id: str, group_id: str, item_id: str) -> dict[str, Any]:
    """Unlink one item. If the group has 0 members, delete the group."""
    with db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT * FROM item_groups WHERE user_id = %s AND id = %s",
                (user_id, group_id),
            )
            if not cur.fetchone():
                raise GroupNotFoundError(f"Group {group_id} not found")

            cur.execute(
                "SELECT id FROM pantry_items WHERE user_id = %s AND id = %s AND group_id = %s",
                (user_id, item_id, group_id),
            )
            if not cur.fetchone():
                raise ItemNotFoundError(f"Item {item_id} not found in group")

            cur.execute(
                "UPDATE pantry_items SET group_id = NULL WHERE user_id = %s AND id = %s",
                (user_id, item_id),
            )

            cur.execute(
                "SELECT COUNT(*) AS count FROM pantry_items WHERE user_id = %s AND group_id = %s",
                (user_id, group_id),
            )
            row = cur.fetchone()
            count = int(row["count"]) if isinstance(row, dict) else int(row[0])

            group_deleted = False
            if count == 0:
                cur.execute(
                    "DELETE FROM item_groups WHERE user_id = %s AND id = %s",
                    (user_id, group_id),
                )
                group_deleted = True
        conn.commit()

    return {
        "unlinked": True,
        "id": group_id,
        "itemId": item_id,
        "groupDeleted": group_deleted,
    }
