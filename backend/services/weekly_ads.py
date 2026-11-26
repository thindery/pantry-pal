"""PP-164: weekly-ad hub (v1 link-out).
PP-179: favorite stores per ZIP code.

Looks up stores for a ZIP in ``weekly_ad_stores`` (data-driven; add areas with
SQL rows). No scraping, no deal matching, no partner APIs. The ZIP is used for
the lookup only and is never stored.
"""

from __future__ import annotations

import re
from typing import Any, Optional

from database.db import db_connection

ZIP_RE = re.compile(r"^\d{5}$")
_FIELDS = "id, kind, chain, name, address, city, state, zip, weekly_ad_url, store_url, note"


def normalize_zip(raw: Optional[str]) -> Optional[str]:
    value = (raw or "").strip()
    if "-" in value:
        value = value.split("-", 1)[0]
    return value if ZIP_RE.match(value) else None


def _map(row: dict[str, Any], is_favorite: bool = False) -> dict[str, Any]:
    return {
        "id": row["id"],
        "chain": row["chain"],
        "name": row["name"],
        "address": row.get("address"),
        "city": row.get("city"),
        "state": row.get("state"),
        "zip": row.get("zip"),
        "weeklyAdUrl": row["weekly_ad_url"],
        "storeUrl": row.get("store_url"),
        "note": row.get("note"),
        "isFavorite": is_favorite,
        "is_favorite": is_favorite,
    }


def stores_for_zip(zip_code: str, user_id: Optional[str] = None) -> dict[str, Any]:
    """Local stores whose service prefixes match the ZIP; national finders when none do."""
    prefixes = [zip_code[:n] for n in range(3, 6)]
    with db_connection() as conn:
        with conn.cursor() as cur:
            favorite_ids: set[str] = set()
            if user_id:
                cur.execute(
                    """
                    SELECT store_id FROM weekly_ad_store_favorites
                    WHERE user_id = %s AND zip = %s
                    """,
                    (user_id, zip_code),
                )
                favorite_ids = {r["store_id"] for r in cur.fetchall()}

            cur.execute(
                f"""
                SELECT {_FIELDS} FROM weekly_ad_stores
                WHERE active AND kind = 'local' AND zip_prefixes && %s::text[]
                ORDER BY sort_order, name
                """,
                (prefixes,),
            )
            local = [_map(r, r["id"] in favorite_ids) for r in cur.fetchall()]
            fallback: list[dict[str, Any]] = []
            if not local:
                cur.execute(
                    f"""
                    SELECT {_FIELDS} FROM weekly_ad_stores
                    WHERE active AND kind = 'fallback'
                    ORDER BY sort_order, name
                    """
                )
                fallback = [_map(r, r["id"] in favorite_ids) for r in cur.fetchall()]
    return {"zip": zip_code, "covered": bool(local), "stores": local, "fallback": fallback}


def store_applies_to_zip(store_id: str, zip_code: str) -> bool:
    """Returns True if the store is active and serves this ZIP (or is a national fallback)."""
    prefixes = [zip_code[:n] for n in range(3, 6)]
    with db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT 1 FROM weekly_ad_stores
                WHERE id = %s AND active = TRUE
                  AND (kind = 'fallback' OR (kind = 'local' AND zip_prefixes && %s::text[]))
                """,
                (store_id, prefixes),
            )
            return cur.fetchone() is not None


def add_favorite(user_id: str, zip_code: str, store_id: str) -> None:
    with db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO weekly_ad_store_favorites (user_id, zip, store_id)
                VALUES (%s, %s, %s)
                ON CONFLICT (user_id, zip, store_id) DO NOTHING
                """,
                (user_id, zip_code, store_id),
            )
        conn.commit()


def remove_favorite(user_id: str, zip_code: str, store_id: str) -> None:
    with db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                DELETE FROM weekly_ad_store_favorites
                WHERE user_id = %s AND zip = %s AND store_id = %s
                """,
                (user_id, zip_code, store_id),
            )
        conn.commit()
