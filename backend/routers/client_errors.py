"""Client error logging routes for admin diagnostics."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.responses import JSONResponse

from backend.clerk_auth import is_admin_user, resolve_authenticated_user
from backend.models.responses import error_response
from backend.models.schemas import ClientErrorCreateRequest
from backend.services import client_errors_service

router = APIRouter(prefix="/api/client-errors", tags=["Client Errors"])


async def require_admin(request: Request) -> str:
    user_id, email = await resolve_authenticated_user(request)
    if not user_id:
        raise HTTPException(status_code=401, detail=error_response("UNAUTHORIZED", "Authentication required"))
    if not is_admin_user(user_id, email):
        raise HTTPException(status_code=403, detail=error_response("FORBIDDEN", "Admin access required"))
    return user_id


@router.post("")
async def create_client_error(body: ClientErrorCreateRequest):
    try:
        saved = client_errors_service.save_client_error(
            user_id=body.userId,
            error_type=body.type,
            error_message=body.message,
            error_stack=body.stack,
            component=body.component,
            url=body.url,
            user_agent=body.userAgent,
        )
        return {"success": True, "id": saved["id"]}
    except Exception:
        return JSONResponse(status_code=500, content={"error": "Failed to save"})


@router.get("")
async def list_client_errors(
    resolved: str = Query("false"),
    limit: int = Query(50, ge=1, le=500),
    _admin: str = Depends(require_admin),
):
    try:
        errors = client_errors_service.get_client_errors(
            resolved=resolved.lower() == "true",
            limit=limit,
        )
        return {"errors": errors}
    except Exception:
        return JSONResponse(status_code=500, content={"error": "Failed to fetch"})


@router.patch("/{error_id}/resolve")
async def resolve_client_error(error_id: str, _admin: str = Depends(require_admin)):
    try:
        updated = client_errors_service.mark_error_resolved(error_id)
        if not updated:
            return JSONResponse(status_code=404, content={"error": "Not found"})
        return {"success": True}
    except Exception:
        return JSONResponse(status_code=500, content={"error": "Failed to resolve"})