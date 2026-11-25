"""PP-178: Send to Instacart (Beta). Off unless INSTACART_API_KEY is set on the server."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException

from backend.auth_session import require_authenticated_user_id
from backend.models.responses import error_response, success_response
from backend.models.schemas import InstacartHandoffRequest
from backend.services import instacart_service

router = APIRouter(prefix="/api/instacart", tags=["Instacart"])


@router.get("/status")
async def instacart_status(user_id: str = Depends(require_authenticated_user_id)):
    """Lets the shopping list page hide the button. Never includes the key."""
    return success_response({"enabled": instacart_service.is_enabled(), "beta": True})


@router.post("/shopping-list")
async def create_instacart_list(
    body: InstacartHandoffRequest,
    user_id: str = Depends(require_authenticated_user_id),
):
    if not instacart_service.is_enabled():
        raise HTTPException(
            status_code=404,
            detail=error_response("NOT_FOUND", "Instacart is not available"),
        )
    try:
        result = await instacart_service.create_shopping_list_link(
            [item.model_dump() for item in body.items]
        )
    except instacart_service.InstacartError as exc:
        raise HTTPException(
            status_code=502,
            detail=error_response("INSTACART_ERROR", str(exc)),
        )
    return success_response({"url": result["url"], "itemCount": result["itemCount"]})
