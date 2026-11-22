"""Look up the signed-in user's contact fields without logging them."""

from __future__ import annotations

from typing import Optional

from database.db import db_connection


def get_user_contact(user_id: str) -> dict[str, Optional[str]]:
    """Return name and email for a NextAuth user id, if present."""
    if not user_id:
        return {"name": None, "email": None}
    with db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT name, email FROM users WHERE id::text = %s",
                (user_id,),
            )
            row = cur.fetchone()
    if not row:
        return {"name": None, "email": None}
    return {"name": row.get("name") or None, "email": row.get("email") or None}


def get_user_id_by_customer(customer_id: str) -> Optional[str]:
    if not customer_id:
        return None
    with db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT user_id FROM user_subscriptions WHERE stripe_customer_id = %s LIMIT 1",
                (customer_id,),
            )
            row = cur.fetchone()
    return row["user_id"] if row else None


def merge_contact(
    user_id: str,
    email: Optional[str] = None,
    name: Optional[str] = None,
) -> dict[str, Optional[str]]:
    contact = get_user_contact(user_id)
    if email and not contact.get("email"):
        contact["email"] = email
    if name and not contact.get("name"):
        contact["name"] = name
    return contact
