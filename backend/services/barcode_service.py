"""Barcode lookup with Open Food Facts and local cache."""

from __future__ import annotations

import json
import os
from datetime import datetime, timedelta, timezone
from typing import Any, Optional

import httpx

from database.db import db_connection

OPEN_FOOD_FACTS_API = "https://world.openfoodfacts.org/api/v0/product"
PRODUCT_CACHE_MAX_AGE_DAYS = int(os.getenv("PRODUCT_CACHE_MAX_AGE_DAYS", "7"))


def _now() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def _map_category(categories: str, pnns: str) -> str:
    categories = categories.lower()
    pnns = pnns.lower()
    if any(k in categories or k in pnns for k in ("produce", "fruit", "vegetable", "fruits", "vegetables")):
        return "produce"
    if "dairy" in pnns or "milk" in pnns:
        return "dairy"
    if "frozen" in categories or "frozen" in pnns:
        return "frozen"
    if any(k in categories or k in pnns for k in ("meat", "seafood", "fish")):
        return "meat"
    if any(k in categories or k in pnns for k in ("canned", "pasta", "soup")):
        return "pantry"
    if any(k in categories or k in pnns for k in ("beverage", "drink")):
        return "beverages"
    if any(k in categories or k in pnns for k in ("snack", "sweet")):
        return "snacks"
    if any(k in categories for k in ("bakery", "bread")):
        return "pantry"
    return "other"


def _row_to_product(row: dict[str, Any]) -> dict[str, Any]:
    nutrition = None
    if row.get("nutrition"):
        try:
            nutrition = json.loads(row["nutrition"])
        except (json.JSONDecodeError, TypeError):
            nutrition = None
    return {
        "barcode": row["barcode"],
        "name": row["name"],
        "brand": row.get("brand"),
        "category": row["category"],
        "imageUrl": row.get("image_url"),
        "ingredients": row.get("ingredients"),
        "nutrition": nutrition,
        "source": row["source"],
        "infoLastSynced": row["info_last_synced"],
    }


def get_product_by_barcode(barcode: str, max_age_days: Optional[int] = None) -> Optional[dict[str, Any]]:
    with db_connection() as conn:
        with conn.cursor() as cur:
            if max_age_days is not None:
                cutoff = (datetime.now(timezone.utc) - timedelta(days=max_age_days)).isoformat()
                cur.execute(
                    "SELECT * FROM product_cache WHERE barcode = %s AND info_last_synced >= %s",
                    (barcode, cutoff),
                )
            else:
                cur.execute("SELECT * FROM product_cache WHERE barcode = %s", (barcode,))
            row = cur.fetchone()
            return _row_to_product(row) if row else None


def ensure_product_cached(
    barcode: str,
    *,
    name: str,
    category: str,
    brand: Optional[str] = None,
    image_url: Optional[str] = None,
    source: str = "manual_entry",
) -> None:
    """Upsert minimal product metadata when an item is saved with a barcode."""
    if get_product_by_barcode(barcode):
        return
    save_product(
        {
            "barcode": barcode,
            "name": name,
            "brand": brand,
            "category": category,
            "imageUrl": image_url,
            "source": source,
        }
    )


def save_product(data: dict[str, Any]) -> None:
    now = _now()
    nutrition = json.dumps(data["nutrition"]) if data.get("nutrition") else None
    with db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO product_cache (
                    barcode, name, brand, category, image_url, ingredients,
                    nutrition, source, info_last_synced, updated_at,
                    needs_sync, sync_retry_count, last_error
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, 0, 0, NULL)
                ON CONFLICT (barcode) DO UPDATE SET
                    name = EXCLUDED.name,
                    brand = EXCLUDED.brand,
                    category = EXCLUDED.category,
                    image_url = EXCLUDED.image_url,
                    ingredients = EXCLUDED.ingredients,
                    nutrition = EXCLUDED.nutrition,
                    source = EXCLUDED.source,
                    info_last_synced = EXCLUDED.info_last_synced,
                    updated_at = EXCLUDED.updated_at,
                    needs_sync = 0,
                    sync_retry_count = 0,
                    last_error = NULL
                """,
                (
                    data["barcode"],
                    data["name"],
                    data.get("brand"),
                    data["category"],
                    data.get("imageUrl"),
                    data.get("ingredients"),
                    nutrition,
                    data.get("source", "openfoodfacts"),
                    now,
                    now,
                ),
            )


def mark_product_needs_sync(barcode: str, error: Optional[str] = None) -> None:
    """Flag a cached product for background retry after a failed lookup."""
    with db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                UPDATE product_cache
                SET needs_sync = 1,
                    sync_retry_count = COALESCE(sync_retry_count, 0) + 1,
                    last_error = %s,
                    updated_at = %s
                WHERE barcode = %s
                """,
                (error, _now(), barcode),
            )


async def lookup_open_food_facts(barcode: str) -> dict[str, Any]:
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(
                f"{OPEN_FOOD_FACTS_API}/{barcode}.json",
                headers={"Accept": "application/json"},
            )
        if response.status_code == 429:
            return {
                "success": False,
                "cached": False,
                "rateLimited": True,
                "error": "Rate limit exceeded. Please try again later.",
            }
        if not response.is_success:
            return {"success": False, "cached": False, "error": f"HTTP error {response.status_code}"}
        data = response.json()
        if data.get("status") != 1 or not data.get("product"):
            return {"success": False, "cached": False, "error": "Product not found in Open Food Facts"}
        product = data["product"]
        category = _map_category(
            product.get("categories", "") or "",
            product.get("pnns_groups_1", "") or "",
        )
        nutriments = product.get("nutriments") or {}
        nutrition: dict[str, float] = {}
        for src, dst in [
            ("energy-kcal", "calories"),
            ("proteins", "protein"),
            ("carbohydrates", "carbs"),
            ("fat", "fat"),
            ("salt", "sodium"),
            ("sugars", "sugars"),
        ]:
            if nutriments.get(src) is not None:
                nutrition[dst] = float(nutriments[src])
        return {
            "success": True,
            "cached": False,
            "product": {
                "barcode": barcode,
                "name": product.get("product_name") or product.get("generic_name") or "Unknown Product",
                "brand": (product.get("brands") or "").split(",")[0].strip() or None,
                "category": category,
                "imageUrl": product.get("image_url"),
                "ingredients": product.get("ingredients_text"),
                "nutrition": nutrition or None,
                "source": "openfoodfacts",
                "infoLastSynced": _now(),
            },
        }
    except httpx.TimeoutException:
        return {"success": False, "cached": False, "error": "Request timed out"}
    except Exception as exc:
        return {"success": False, "cached": False, "error": f"Failed to fetch: {exc}"}