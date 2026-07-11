"""Admin dashboard routes."""

from __future__ import annotations

from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query, Request

from backend.auth_session import resolve_authenticated_user
from backend.clerk_auth import is_admin_user
from backend.models.responses import error_response, success_response
from backend.services import admin_service

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