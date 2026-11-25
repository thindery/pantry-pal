"""PP-164: weekly-ad hub lookup (signed in)."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query

from backend.auth_session import require_authenticated_user_id
from backend.models.responses import error_response, success_response
from backend.services import weekly_ads

router = APIRouter(prefix="/api/weekly-ads", tags=["Weekly ads"])


@router.get("")
async def get_weekly_ads(
    zip: str = Query("", max_length=10),
    user_id: str = Depends(require_authenticated_user_id),
):
    zip_code = weekly_ads.normalize_zip(zip)
    if not zip_code:
        raise HTTPException(
            status_code=400,
            detail=error_response("INVALID_ZIP", "Enter a 5-digit US ZIP code."),
        )
    return success_response(weekly_ads.stores_for_zip(zip_code))
