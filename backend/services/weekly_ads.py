"""PP-164: weekly-ad hub (v1 link-out).

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


def _map(row: dict[str, Any]) -> dict[str, Any]:
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
    }


def stores_for_zip(zip_code: str) -> dict[str, Any]:
    """Local stores whose service prefixes match the ZIP; national finders when none do."""
    prefixes = [zip_code[:n] for n in range(3, 6)]
    with db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                f"""
                SELECT {_FIELDS} FROM weekly_ad_stores
                WHERE active AND kind = 'local' AND zip_prefixes && %s::text[]
                ORDER BY sort_order, name
                """,
                (prefixes,),
            )
            local = [_map(r) for r in cur.fetchall()]
            fallback: list[dict[str, Any]] = []
            if not local:
                cur.execute(
                    f"""
                    SELECT {_FIELDS} FROM weekly_ad_stores
                    WHERE active AND kind = 'fallback'
                    ORDER BY sort_order, name
                    """
                )
                fallback = [_map(r) for r in cur.fetchall()]
    return {"zip": zip_code, "covered": bool(local), "stores": local, "fallback": fallback}
