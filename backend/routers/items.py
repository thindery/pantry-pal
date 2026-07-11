"""Pantry items CRUD routes."""

from __future__ import annotations

import re

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import ValidationError

from backend.auth_session import require_authenticated_user_id
from backend.models.responses import error_response, success_response
from backend.models.schemas import CreateItemRequest, UpdateItemRequest
from backend.services import barcode_service, pantry_service, subscription_service

router = APIRouter(prefix="/api/items", tags=["Items"])
UUID_REGEX = re.compile(
    r"^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$",
    re.I,
)


@router.get("")
async def list_items(request: Request, category: str | None = None, user_id: str = Depends(require_authenticated_user_id)):
    try:
        items = pantry_service.get_all_items(user_id, category)
        return success_response(items, {"userId": user_id})
    except Exception:
        raise HTTPException(status_code=500, detail=error_response("INTERNAL_ERROR", "Failed to retrieve items"))


@router.get("/categories")
async def list_categories(user_id: str = Depends(require_authenticated_user_id)):
    try:
        return success_response(pantry_service.get_categories(user_id))
    except Exception:
        raise HTTPException(status_code=500, detail=error_response("INTERNAL_ERROR", "Failed to retrieve categories"))


@router.get("/{item_id}")
async def get_item(item_id: str, user_id: str = Depends(require_authenticated_user_id)):
    if not UUID_REGEX.match(item_id):
        raise HTTPException(status_code=400, detail=error_response("VALIDATION_ERROR", "Invalid item ID format"))
    item = pantry_service.get_item_by_id(user_id, item_id)
    if not item:
        raise HTTPException(status_code=404, detail=error_response("NOT_FOUND", f"Item with ID {item_id} not found"))
    return success_response(item)


@router.post("", status_code=201)
async def create_item(body: CreateItemRequest, user_id: str = Depends(require_authenticated_user_id)):
    try:
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
        payload = body.model_dump()
        item = pantry_service.create_item(user_id, payload)
        if payload.get("barcode"):
            barcode_service.ensure_product_cached(
                payload["barcode"],
                name=payload["name"],
                category=payload["category"],
            )
        return success_response(item, {"userId": user_id})
    except HTTPException:
        raise
    except ValidationError as exc:
        raise HTTPException(status_code=400, detail=error_response("VALIDATION_ERROR", "Invalid request body", {"errors": exc.errors()}))
    except Exception:
        raise HTTPException(status_code=500, detail=error_response("INTERNAL_ERROR", "Failed to create item"))


@router.put("/{item_id}")
async def update_item(item_id: str, body: UpdateItemRequest, user_id: str = Depends(require_authenticated_user_id)):
    if not UUID_REGEX.match(item_id):
        raise HTTPException(status_code=400, detail=error_response("VALIDATION_ERROR", "Invalid item ID format"))
    data = {k: v for k, v in body.model_dump().items() if v is not None}
    if not data:
        raise HTTPException(status_code=400, detail=error_response("VALIDATION_ERROR", "At least one field must be provided for update"))
    existing = pantry_service.get_item_by_id(user_id, item_id)
    if not existing:
        raise HTTPException(status_code=404, detail=error_response("NOT_FOUND", f"Item with ID {item_id} not found"))
    if existing.get("barcode") and "name" in data and data["name"] != existing["name"]:
        raise HTTPException(
            status_code=403,
            detail=error_response(
                "NAME_LOCKED",
                "Product name cannot be changed for barcode-linked items.",
            ),
        )
    updated = pantry_service.update_item(user_id, item_id, data)
    if not updated:
        raise HTTPException(status_code=404, detail=error_response("NOT_FOUND", f"Item with ID {item_id} not found"))
    return success_response(updated)


@router.delete("/{item_id}")
async def delete_item(item_id: str, user_id: str = Depends(require_authenticated_user_id)):
    if not UUID_REGEX.match(item_id):
        raise HTTPException(status_code=400, detail=error_response("VALIDATION_ERROR", "Invalid item ID format"))
    deleted = pantry_service.delete_item(user_id, item_id)
    if not deleted:
        raise HTTPException(status_code=404, detail=error_response("NOT_FOUND", f"Item with ID {item_id} not found"))
    return success_response({"deleted": True, "id": item_id})