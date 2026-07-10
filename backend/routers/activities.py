"""Activity logging routes."""

from __future__ import annotations

import re

from fastapi import APIRouter, Depends, HTTPException, Query

from backend.clerk_auth import require_authenticated_user_id
from backend.models.responses import error_response, success_response
from backend.models.schemas import CreateActivityRequest
from backend.services import pantry_service

router = APIRouter(prefix="/api/activities", tags=["Activities"])
UUID_REGEX = re.compile(
    r"^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$",
    re.I,
)


@router.get("")
async def list_activities(
    user_id: str = Depends(require_authenticated_user_id),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    itemId: str | None = None,
):
    if itemId and not UUID_REGEX.match(itemId):
        raise HTTPException(status_code=400, detail=error_response("VALIDATION_ERROR", "Invalid itemId format"))
    offset = (page - 1) * limit
    activities = pantry_service.get_activities(user_id, limit, offset, itemId)
    total = pantry_service.get_activity_count(user_id, itemId)
    return success_response(
        activities,
        {"page": page, "limit": limit, "total": total, "totalPages": (total + limit - 1) // limit},
    )


@router.post("", status_code=201)
async def create_activity(body: CreateActivityRequest, user_id: str = Depends(require_authenticated_user_id)):
    activity = pantry_service.log_activity(
        user_id, body.itemId, body.type, body.amount, body.source.value
    )
    if not activity:
        raise HTTPException(
            status_code=404,
            detail=error_response("NOT_FOUND", f"Item with ID {body.itemId} not found"),
        )
    return success_response(activity)