"""Admin dashboard routes."""

from __future__ import annotations

import logging
from typing import Literal

from pydantic import BaseModel, ConfigDict
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query, Request

from backend.auth_session import resolve_authenticated_user
from backend.clerk_auth import is_admin_user
from backend.models.responses import error_response, success_response
from backend.services import admin_service, ai_providers, app_settings

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/admin", tags=["Admin"])


async def require_admin(request: Request) -> str:
    user_id, email = await resolve_authenticated_user(request)
    if not user_id:
        raise HTTPException(status_code=401, detail=error_response("UNAUTHORIZED", "Authentication required"))
    if not is_admin_user(user_id, email):
        raise HTTPException(status_code=403, detail=error_response("FORBIDDEN", "Admin access required"))
    return user_id


@router.get("/dashboard")
async def dashboard(
    period: Literal["7d", "30d", "90d"] = Query("7d"),
    _admin: str = Depends(require_admin),
):
    try:
        return success_response(admin_service.get_dashboard_metrics(period))
    except Exception:
        raise HTTPException(
            status_code=500,
            detail=error_response("INTERNAL_ERROR", "Failed to retrieve dashboard metrics"),
        )


@router.get("/funnel")
async def funnel(
    period: Literal["7d", "30d", "90d"] = Query("7d"),
    _admin: str = Depends(require_admin),
):
    try:
        return success_response(admin_service.get_funnel_metrics(period))
    except Exception:
        raise HTTPException(
            status_code=500,
            detail=error_response("INTERNAL_ERROR", "Failed to retrieve funnel metrics"),
        )


@router.get("/transactions")
async def transactions(
    limit: int = Query(10, ge=1, le=100),
    cursor: str | None = None,
    _admin: str = Depends(require_admin),
):
    try:
        return success_response(admin_service.get_transactions(limit, cursor))
    except Exception:
        raise HTTPException(
            status_code=500,
            detail=error_response("INTERNAL_ERROR", "Failed to retrieve transactions"),
        )


@router.get("/alerts")
async def alerts(_admin: str = Depends(require_admin)):
    try:
        return success_response(admin_service.get_failed_payment_alerts())
    except Exception:
        raise HTTPException(
            status_code=500,
            detail=error_response("INTERNAL_ERROR", "Failed to retrieve alerts"),
        )


@router.get("/email-metrics")
async def email_metrics(
    period: Literal["7d", "30d", "90d"] = Query("7d"),
    _admin: str = Depends(require_admin),
):
    try:
        return success_response(admin_service.get_email_metrics(period))
    except Exception:
        raise HTTPException(
            status_code=500,
            detail=error_response("INTERNAL_ERROR", "Failed to retrieve email metrics"),
        )


@router.get("/email-marketing")
async def email_marketing(
    period: Literal["7d", "30d", "90d"] = Query("30d"),
    _admin: str = Depends(require_admin),
):
    """PP-198: subscribers, journeys, per-email engagement, link clicks and recent webhook events."""
    from backend.services import admin_email_marketing

    try:
        return success_response(admin_email_marketing.get_email_marketing(period))
    except Exception:
        logger.exception("email marketing dashboard failed")
        raise HTTPException(
            status_code=500,
            detail=error_response("INTERNAL_ERROR", "Failed to retrieve email marketing data"),
        )


@router.post("/email-marketing/weekly/{issue_id}/approve")
async def approve_weekly_issue(issue_id: str, background: BackgroundTasks, admin_id: str = Depends(require_admin)):
    """PP-235: "Approve & send". Moves a draft to approved and starts sending; the 15-minute cron resumes it."""
    from backend.services import weekly_recipes

    issue = weekly_recipes.approve_issue(issue_id, admin_id)
    if not issue:
        raise HTTPException(
            status_code=409,
            detail=error_response("NOT_A_DRAFT", "This issue is not a draft, so it can't be approved."),
        )
    logger.info("weekly recipe issue %s approved by admin", issue["issue_key"])
    background.add_task(weekly_recipes.process_sends)
    return success_response({"id": issue["id"], "issue_key": issue["issue_key"], "status": "approved"})


@router.post("/email-marketing/weekly/{issue_id}/skip")
async def skip_weekly_issue(issue_id: str, _admin: str = Depends(require_admin)):
    """PP-235: skip an issue that has not started sending."""
    from backend.services import weekly_recipes

    if not weekly_recipes.skip_issue(issue_id):
        raise HTTPException(
            status_code=409,
            detail=error_response("CANNOT_SKIP", "Only a draft, or an approved issue that has not started sending, can be skipped."),
        )
    return success_response({"id": issue_id, "status": "skipped"})


class AiProviderUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    provider: Literal["ollama", "gemini"]


def _ai_provider_payload() -> dict:
    return {"provider": app_settings.get_ai_provider(), "options": list(ai_providers.PROVIDERS), **ai_providers.provider_status()}


@router.get("/ai-provider")
async def get_ai_provider(_admin: str = Depends(require_admin)):
    return success_response(_ai_provider_payload())


@router.put("/ai-provider")
async def put_ai_provider(body: AiProviderUpdate, admin_id: str = Depends(require_admin)):
    try:
        app_settings.set_ai_provider(body.provider, admin_id)
    except Exception:
        raise HTTPException(
            status_code=500,
            detail=error_response("INTERNAL_ERROR", "Failed to save AI provider"),
        )
    return success_response(_ai_provider_payload())
