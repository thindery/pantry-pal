"""Barcode lookup routes."""

from __future__ import annotations

import asyncio

from fastapi import APIRouter, Depends, HTTPException

from backend.auth_session import require_authenticated_user_id
from backend.models.schemas import BarcodeSaveRequest
from backend.models.responses import error_response
from backend.services import barcode_service, pantry_service, subscription_service

router = APIRouter(prefix="/api/barcode", tags=["Barcode"])


def _clean_barcode(barcode: str) -> str:
    return "".join(c for c in barcode if c.isdigit())


@router.get("/{barcode}")
async def lookup_barcode(barcode: str, user_id: str = Depends(require_authenticated_user_id)):
    del user_id
    clean = _clean_barcode(barcode)
    if len(clean) < 8:
        raise HTTPException(status_code=400, detail={"success": False, "cached": False, "error": "Invalid barcode format"})

    cached = barcode_service.get_cached_product(clean, barcode_service.PRODUCT_CACHE_MAX_AGE_DAYS)
    if cached:
        return {"success": True, "cached": True, "product": cached}

    stale = barcode_service.get_cached_product(clean)
    if stale:
        asyncio.create_task(_refresh_barcode(clean))
        return {"success": True, "cached": True, "stale": True, "product": stale}

    result = await barcode_service.lookup_external_product(clean)
    product = result.get("product") if result.get("success") else None
    if not product or not barcode_service.is_usable_product_name(product.get("name")):
        raise HTTPException(
            status_code=404,
            detail={
                **{k: v for k, v in result.items() if k != "product"},
                "success": False,
                "cached": False,
                "needsName": True,
                "error": result.get("error") or "Product not found",
            },
        )
    barcode_service.save_product(product)
    barcode_service.apply_name_to_junk_barcode_items(clean, product["name"])
    return {"success": True, "cached": False, "product": product}


async def _refresh_barcode(barcode: str) -> None:
    result = await barcode_service.lookup_external_product(barcode)
    product = result.get("product") if result.get("success") else None
    if product and barcode_service.is_usable_product_name(product.get("name")):
        barcode_service.save_product(product)
        barcode_service.apply_name_to_junk_barcode_items(barcode, product["name"])
    else:
        barcode_service.mark_product_needs_sync(barcode, result.get("error"))


@router.post("/{barcode}", status_code=201)
async def save_barcode_product(
    barcode: str,
    body: BarcodeSaveRequest,
    user_id: str = Depends(require_authenticated_user_id),
):
    clean = _clean_barcode(barcode)
    if len(clean) < 8:
        raise HTTPException(status_code=400, detail={"success": False, "cached": False, "error": "Invalid barcode format"})

    existing_item = pantry_service.find_existing_item(
        user_id, barcode=clean, name=body.name, category=body.category
    )
    if not existing_item:
        existing = pantry_service.get_all_items(user_id)
        tier_check = subscription_service.can_add_items(user_id, len(existing))
        if not tier_check["allowed"]:
            raise HTTPException(
                status_code=403,
                detail=error_response(
                    "TIER_LIMIT_EXCEEDED",
                    "Item limit reached for your plan. Upgrade to add more items.",
                    {"remaining": tier_check["remaining"]},
                ),
            )

    if not barcode_service.is_usable_product_name(body.name):
        raise HTTPException(
            status_code=400,
            detail={
                "success": False,
                "cached": False,
                "needsName": True,
                "error": "Please enter a product name (at least 3 characters).",
            },
        )

    barcode_service.save_product(
        {
            "barcode": clean,
            "name": body.name,
            "brand": body.brand,
            "category": body.category,
            "imageUrl": body.imageUrl,
            "ingredients": body.ingredients,
            "nutrition": body.nutrition,
            "source": "openfoodfacts" if body.imageUrl or body.brand else "manual_entry",
        }
    )
    item, _created = pantry_service.add_or_increment_item(
        user_id,
        {
            "name": body.name,
            "quantity": body.quantity,
            "unit": body.unit,
            "category": body.category,
            "barcode": clean,
        },
    )
    activity = pantry_service.log_activity(
        user_id,
        item["id"],
        "ADD",
        body.quantity,
        "BARCODE_SCAN",
        adjust_quantity=False,
    )
    return {
        "success": True,
        "cached": True,
        "activity": activity,
        "product": {
            "barcode": clean,
            "name": body.name,
            "brand": body.brand,
            "category": body.category,
            "imageUrl": body.imageUrl,
            "source": "manual_entry",
            "infoLastSynced": barcode_service._now(),
        },
        "item": item,
    }