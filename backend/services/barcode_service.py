"""Barcode lookup with Open Food Facts and local cache."""

from __future__ import annotations

import json
import os
from datetime import datetime, timedelta, timezone
from typing import Any, Optional

import logging

import httpx

from database.db import db_connection

logger = logging.getLogger(__name__)

OPEN_FOOD_FACTS_API = "https://world.openfoodfacts.org/api/v0/product"
UPCITEMDB_API = "https://api.upcitemdb.com/prod/trial/lookup"
PRODUCT_CACHE_MAX_AGE_DAYS = int(os.getenv("PRODUCT_CACHE_MAX_AGE_DAYS", "60"))
OPEN_FOOD_FACTS_TIMEOUT_SECONDS = 4.0
UPCITEMDB_TIMEOUT_SECONDS = 6.0
LOOKUP_USER_AGENT = "PantryHub/1.0 (https://www.mypantryhub.com)"


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
    if any(k in categories or k in pnns for k in ("condiment", "sauce", "vinegar", "seasoning", "canned", "pasta", "soup", "bakery", "bread")):
        return "pantry"
    if any(k in categories or k in pnns for k in ("beverage", "drink")):
        return "beverages"
    if any(k in categories or k in pnns for k in ("snack", "sweet")):
        return "snacks"
    return "other"


def barcode_variants(barcode: str) -> list[str]:
    """UPC-A (12) and EAN-13 (leading 0 + 12) are the same retail code."""
    clean = "".join(c for c in barcode if c.isdigit())
    variants = [clean]
    if len(clean) == 12:
        variants.append("0" + clean)
    elif len(clean) == 13 and clean.startswith("0"):
        variants.append(clean[1:])
    seen: set[str] = set()
    out: list[str] = []
    for value in variants:
        if value and value not in seen:
            seen.add(value)
            out.append(value)
    return out


def get_cached_product(barcode: str, max_age_days: Optional[int] = None) -> Optional[dict[str, Any]]:
    for variant in barcode_variants(barcode):
        hit = get_product_by_barcode(variant, max_age_days)
        if hit:
            return hit
    return None


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


def _lookup_headers() -> dict[str, str]:
    return {
        "Accept": "application/json",
        "User-Agent": LOOKUP_USER_AGENT,
    }


async def lookup_open_food_facts(barcode: str) -> dict[str, Any]:
    try:
        async with httpx.AsyncClient(timeout=OPEN_FOOD_FACTS_TIMEOUT_SECONDS) as client:
            response = await client.get(
                f"{OPEN_FOOD_FACTS_API}/{barcode}.json",
                headers=_lookup_headers(),
            )
        if response.status_code == 429:
            logger.warning("Open Food Facts rate-limited barcode %s", barcode)
            return {
                "success": False,
                "cached": False,
                "rateLimited": True,
                "timeout": False,
                "error": "Rate limit exceeded. Please try again later.",
            }
        if not response.is_success:
            logger.warning(
                "Open Food Facts HTTP %s for barcode %s",
                response.status_code,
                barcode,
            )
            return {
                "success": False,
                "cached": False,
                "timeout": False,
                "error": f"HTTP error {response.status_code}",
            }
        data = response.json()
        if data.get("status") != 1 or not data.get("product"):
            return {
                "success": False,
                "cached": False,
                "notFound": True,
                "error": "Product not found in Open Food Facts",
            }
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
        logger.warning("Open Food Facts timed out for barcode %s", barcode)
        return {
            "success": False,
            "cached": False,
            "timeout": True,
            "error": "Request timed out",
        }
    except Exception as exc:
        logger.warning("Open Food Facts failed for barcode %s: %s", barcode, exc)
        return {"success": False, "cached": False, "error": f"Failed to fetch: {exc}"}


async def lookup_upcitemdb(barcode: str) -> dict[str, Any]:
    try:
        async with httpx.AsyncClient(timeout=UPCITEMDB_TIMEOUT_SECONDS) as client:
            response = await client.get(
                UPCITEMDB_API,
                params={"upc": barcode},
                headers=_lookup_headers(),
            )
        if response.status_code == 429:
            logger.warning("UPCitemdb rate-limited barcode %s", barcode)
            return {
                "success": False,
                "cached": False,
                "rateLimited": True,
                "error": "Rate limit exceeded. Please try again later.",
            }
        if not response.is_success:
            logger.warning("UPCitemdb HTTP %s for barcode %s", response.status_code, barcode)
            return {"success": False, "cached": False, "error": f"HTTP error {response.status_code}"}
        data = response.json()
        items = data.get("items") or []
        if not items:
            return {"success": False, "cached": False, "notFound": True, "error": "Product not found"}
        item = items[0]
        images = item.get("images") or []
        image_url = images[0] if isinstance(images, list) and images else None
        category_text = " ".join(
            str(part) for part in (item.get("category"), item.get("description"), item.get("title")) if part
        )
        return {
            "success": True,
            "cached": False,
            "product": {
                "barcode": barcode,
                "name": item.get("title") or item.get("brand") or "Unknown Product",
                "brand": (item.get("brand") or "").strip() or None,
                "category": _map_category(category_text, ""),
                "imageUrl": image_url,
                "ingredients": item.get("description"),
                "nutrition": None,
                "source": "upcitemdb",
                "infoLastSynced": _now(),
            },
        }
    except httpx.TimeoutException:
        logger.warning("UPCitemdb timed out for barcode %s", barcode)
        return {"success": False, "cached": False, "timeout": True, "error": "Request timed out"}
    except Exception as exc:
        logger.warning("UPCitemdb failed for barcode %s: %s", barcode, exc)
        return {"success": False, "cached": False, "error": f"Failed to fetch: {exc}"}


def _should_skip_remaining_source_attempts(result: dict[str, Any]) -> bool:
    return bool(
        result.get("timeout")
        or result.get("rateLimited")
        or str(result.get("error") or "").startswith("HTTP error")
    )


async def lookup_external_product(barcode: str) -> dict[str, Any]:
    """Try Open Food Facts, then UPCitemdb. Also try UPC-A / EAN-13 variants.

    Timeouts and HTTP failures are not treated as a cacheable miss.
    """
    last: dict[str, Any] = {"success": False, "cached": False, "error": "Product not found"}
    requested = "".join(c for c in barcode if c.isdigit())
    for variant in barcode_variants(requested):
        result = await lookup_open_food_facts(variant)
        last = result
        if result.get("success") and result.get("product"):
            result["product"]["barcode"] = requested
            return result
        if _should_skip_remaining_source_attempts(result):
            break
    for variant in barcode_variants(requested):
        result = await lookup_upcitemdb(variant)
        last = result
        if result.get("success") and result.get("product"):
            result["product"]["barcode"] = requested
            return result
        if _should_skip_remaining_source_attempts(result):
            break
    return last
