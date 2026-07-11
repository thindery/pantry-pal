"""Shopping session routes."""

from __future__ import annotations

import re

from fastapi import APIRouter, Depends, HTTPException, Query

from backend.auth_session import require_authenticated_user_id
from backend.models.responses import error_response, success_response
from backend.models.schemas import (
    AddSessionItemRequest,
    CompleteSessionRequest,
    CreateSessionRequest,
    UpdateSessionReceiptRequest,
)
from backend.services import shopping_sessions_service

router = APIRouter(prefix="/api/shopping-sessions", tags=["Shopping Sessions"])
UUID_REGEX = re.compile(
    r"^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$",
    re.I,
)


@router.get("")
async def list_sessions(
    user_id: str = Depends(require_authenticated_user_id),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    status: str | None = None,
):
    offset = (page - 1) * limit
    sessions = shopping_sessions_service.get_user_sessions(user_id, limit, offset, status)
    total = shopping_sessions_service.get_session_count(user_id, status)
    return success_response(
        sessions,
        {"page": page, "limit": limit, "total": total, "totalPages": (total + limit - 1) // limit, "status": status or "all"},
    )


@router.post("", status_code=201)
async def create_session(body: CreateSessionRequest, user_id: str = Depends(require_authenticated_user_id)):
    session = shopping_sessions_service.create_session(user_id, body.model_dump())
    return success_response(session)


@router.get("/{session_id}")
async def get_session(session_id: str, user_id: str = Depends(require_authenticated_user_id)):
    if not UUID_REGEX.match(session_id):
        raise HTTPException(status_code=400, detail=error_response("VALIDATION_ERROR", "Invalid session ID format"))
    session = shopping_sessions_service.get_session_by_id(user_id, session_id)
    if not session:
        raise HTTPException(status_code=404, detail=error_response("NOT_FOUND", f"Shopping session with ID {session_id} not found"))
    return success_response(session)


@router.post("/{session_id}/items", status_code=201)
async def add_item(session_id: str, body: AddSessionItemRequest, user_id: str = Depends(require_authenticated_user_id)):
    if not UUID_REGEX.match(session_id):
        raise HTTPException(status_code=400, detail=error_response("VALIDATION_ERROR", "Invalid session ID format"))
    try:
        item = shopping_sessions_service.add_session_item(user_id, session_id, body.model_dump())
        return success_response(item)
    except ValueError:
        raise HTTPException(status_code=404, detail=error_response("NOT_FOUND", "Shopping session not found or not active"))


@router.delete("/{session_id}/items/{item_id}")
async def remove_item(session_id: str, item_id: str, user_id: str = Depends(require_authenticated_user_id)):
    if not UUID_REGEX.match(session_id) or not UUID_REGEX.match(item_id):
        raise HTTPException(status_code=400, detail=error_response("VALIDATION_ERROR", "Invalid ID format"))
    deleted = shopping_sessions_service.remove_session_item(user_id, session_id, item_id)
    if not deleted:
        raise HTTPException(status_code=404, detail=error_response("NOT_FOUND", "Item not found in session"))
    return success_response({"deleted": True, "itemId": item_id})


@router.post("/{session_id}/complete")
async def complete_session(
    session_id: str,
    body: CompleteSessionRequest,
    user_id: str = Depends(require_authenticated_user_id),
):
    if not UUID_REGEX.match(session_id):
        raise HTTPException(status_code=400, detail=error_response("VALIDATION_ERROR", "Invalid session ID format"))
    session = shopping_sessions_service.complete_session(user_id, session_id, body.model_dump())
    if not session:
        raise HTTPException(status_code=404, detail=error_response("NOT_FOUND", "Shopping session not found or not active"))
    return success_response(session)


@router.post("/{session_id}/cancel")
async def cancel_session(session_id: str, user_id: str = Depends(require_authenticated_user_id)):
    if not UUID_REGEX.match(session_id):
        raise HTTPException(status_code=400, detail=error_response("VALIDATION_ERROR", "Invalid session ID format"))
    cancelled = shopping_sessions_service.cancel_session(user_id, session_id)
    if not cancelled:
        raise HTTPException(status_code=404, detail=error_response("NOT_FOUND", "Shopping session not found or not active"))
    return success_response({"cancelled": True, "sessionId": session_id})


@router.post("/{session_id}/add-to-inventory")
async def add_to_inventory(session_id: str, user_id: str = Depends(require_authenticated_user_id)):
    if not UUID_REGEX.match(session_id):
        raise HTTPException(status_code=400, detail=error_response("VALIDATION_ERROR", "Invalid session ID format"))
    try:
        result = shopping_sessions_service.add_session_to_inventory(user_id, session_id)
        return success_response(result, {"itemsAdded": len(result["items"]), "activitiesLogged": len(result["activities"])})
    except ValueError as exc:
        msg = str(exc)
        if "not found" in msg.lower():
            raise HTTPException(status_code=404, detail=error_response("NOT_FOUND", msg))
        raise HTTPException(status_code=400, detail=error_response("INVALID_STATE", msg))


@router.post("/{session_id}/receipt")
async def update_receipt(
    session_id: str,
    body: UpdateSessionReceiptRequest,
    user_id: str = Depends(require_authenticated_user_id),
):
    if not UUID_REGEX.match(session_id):
        raise HTTPException(status_code=400, detail=error_response("VALIDATION_ERROR", "Invalid session ID format"))
    session = shopping_sessions_service.update_session_receipt(user_id, session_id, body.receiptUrl)
    if not session:
        raise HTTPException(status_code=404, detail=error_response("NOT_FOUND", "Shopping session not found or not completed"))
    return success_response(session)