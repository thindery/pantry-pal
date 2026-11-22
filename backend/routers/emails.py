"""Transactional email endpoints."""

from __future__ import annotations

from fastapi import APIRouter, Depends, Request

from backend.auth_session import require_authenticated_user_id, resolve_authenticated_user
from backend.models.responses import success_response
from backend.services import email_service
from backend.services.user_profile import merge_contact

router = APIRouter(prefix="/api/emails", tags=["Emails"])


@router.post("/welcome")
async def send_welcome(request: Request, user_id: str = Depends(require_authenticated_user_id)):
    _, jwt_email = await resolve_authenticated_user(request)
    contact = merge_contact(user_id, email=jwt_email)
    result = email_service.send_welcome(user_id, contact.get("email"), contact.get("name"))
    return success_response({"sent": not result.get("skipped"), "reason": result.get("reason") or "sent"})
