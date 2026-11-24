"""Item groups API endpoints."""

from __future__ import annotations

import re

from fastapi import APIRouter, Depends, HTTPException

from backend.auth_session import require_authenticated_user_id
from backend.models.responses import error_response, success_response
from backend.models.schemas import (
    AddItemGroupItemRequest,
    CreateItemGroupRequest,
    UpdateItemGroupRequest,
)
from backend.services import item_group_service
from backend.services.item_group_service import GroupNotFoundError, ItemNotFoundError

router = APIRouter(prefix="/api/item-groups", tags=["Item Groups"])

UUID_REGEX = re.compile(
    r"^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$",
    re.I,
)


def _validate_uuid(val: str, label: str = "ID") -> None:
    if not UUID_REGEX.match(val):
        raise HTTPException(
            status_code=400,
            detail=error_response("VALIDATION_ERROR", f"Invalid {label} format"),
        )


@router.get("")
async def list_item_groups(user_id: str = Depends(require_authenticated_user_id)):
    """List all item groups for the authenticated user."""
    try:
        groups = item_group_service.get_user_groups(user_id)
        return success_response(groups)
    except Exception:
        raise HTTPException(
            status_code=500,
            detail=error_response("INTERNAL_ERROR", "Failed to retrieve item groups"),
        )


@router.post("", status_code=201)
async def create_item_group(
    body: CreateItemGroupRequest,
    user_id: str = Depends(require_authenticated_user_id),
):
    """Create a new item group and link items."""
    for item_id in body.itemIds:
        _validate_uuid(item_id, "item ID")

    try:
        group = item_group_service.create_group(
            user_id=user_id,
            name=body.name,
            item_ids=body.itemIds,
            target_quantity=body.targetQuantity,
        )
        return success_response(group)
    except ItemNotFoundError as exc:
        raise HTTPException(
            status_code=404,
            detail=error_response("NOT_FOUND", str(exc)),
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=400,
            detail=error_response("VALIDATION_ERROR", str(exc)),
        )
    except Exception:
        raise HTTPException(
            status_code=500,
            detail=error_response("INTERNAL_ERROR", "Failed to create item group"),
        )


@router.patch("/{group_id}")
async def update_item_group(
    group_id: str,
    body: UpdateItemGroupRequest,
    user_id: str = Depends(require_authenticated_user_id),
):
    """Rename or set target quantity on an item group."""
    _validate_uuid(group_id, "group ID")

    try:
        update_target = "targetQuantity" in body.model_fields_set
        group = item_group_service.update_group(
            user_id=user_id,
            group_id=group_id,
            name=body.name,
            target_quantity=body.targetQuantity,
            update_target=update_target,
        )
        return success_response(group)
    except GroupNotFoundError as exc:
        raise HTTPException(
            status_code=404,
            detail=error_response("NOT_FOUND", str(exc)),
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=400,
            detail=error_response("VALIDATION_ERROR", str(exc)),
        )
    except Exception:
        raise HTTPException(
            status_code=500,
            detail=error_response("INTERNAL_ERROR", "Failed to update item group"),
        )


@router.delete("/{group_id}")
async def delete_item_group(
    group_id: str,
    user_id: str = Depends(require_authenticated_user_id),
):
    """Unlink members and delete the item group."""
    _validate_uuid(group_id, "group ID")

    try:
        result = item_group_service.delete_group(user_id, group_id)
        return success_response(result)
    except GroupNotFoundError as exc:
        raise HTTPException(
            status_code=404,
            detail=error_response("NOT_FOUND", str(exc)),
        )
    except Exception:
        raise HTTPException(
            status_code=500,
            detail=error_response("INTERNAL_ERROR", "Failed to delete item group"),
        )


@router.post("/{group_id}/items", status_code=200)
async def add_item_to_group(
    group_id: str,
    body: AddItemGroupItemRequest,
    user_id: str = Depends(require_authenticated_user_id),
):
    """Add an item to a group, moving it from any existing group."""
    _validate_uuid(group_id, "group ID")
    _validate_uuid(body.itemId, "item ID")

    try:
        group = item_group_service.add_item_to_group(user_id, group_id, body.itemId)
        return success_response(group)
    except (GroupNotFoundError, ItemNotFoundError) as exc:
        raise HTTPException(
            status_code=404,
            detail=error_response("NOT_FOUND", str(exc)),
        )
    except Exception:
        raise HTTPException(
            status_code=500,
            detail=error_response("INTERNAL_ERROR", "Failed to add item to group"),
        )


@router.delete("/{group_id}/items/{item_id}")
async def remove_item_from_group(
    group_id: str,
    item_id: str,
    user_id: str = Depends(require_authenticated_user_id),
):
    """Unlink an item from a group. Deletes group if empty."""
    _validate_uuid(group_id, "group ID")
    _validate_uuid(item_id, "item ID")

    try:
        result = item_group_service.remove_item_from_group(user_id, group_id, item_id)
        return success_response(result)
    except (GroupNotFoundError, ItemNotFoundError) as exc:
        raise HTTPException(
            status_code=404,
            detail=error_response("NOT_FOUND", str(exc)),
        )
    except Exception:
        raise HTTPException(
            status_code=500,
            detail=error_response("INTERNAL_ERROR", "Failed to remove item from group"),
        )
