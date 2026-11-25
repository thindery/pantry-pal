"""Admin dashboard routes."""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict
from fastapi import APIRouter, Depends, HTTPException, Query, Request

from backend.auth_session import resolve_authenticated_user
from backend.clerk_auth import is_admin_user
from backend.models.responses import error_response, success_response
from backend.services import admin_service, ai_providers, app_settings

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
