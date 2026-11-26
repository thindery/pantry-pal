"""PP-164, PP-179: weekly-ad hub lookup and store favorites (signed in)."""

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
    return success_response(weekly_ads.stores_for_zip(zip_code, user_id=user_id))


@router.put("/favorites/{zip}/{store_id}")
async def add_favorite(
    zip: str,
    store_id: str,
    user_id: str = Depends(require_authenticated_user_id),
):
    zip_code = weekly_ads.normalize_zip(zip)
    if not zip_code:
        raise HTTPException(
            status_code=400,
            detail=error_response("INVALID_ZIP", "Enter a 5-digit US ZIP code."),
        )
    if not weekly_ads.store_applies_to_zip(store_id, zip_code):
        raise HTTPException(
            status_code=404,
            detail=error_response("STORE_NOT_FOUND", "Store not found or does not serve this ZIP code."),
        )
    weekly_ads.add_favorite(user_id, zip_code, store_id)
    return success_response({"zip": zip_code, "storeId": store_id, "isFavorite": True, "is_favorite": True})


@router.delete("/favorites/{zip}/{store_id}")
async def remove_favorite(
    zip: str,
    store_id: str,
    user_id: str = Depends(require_authenticated_user_id),
):
    zip_code = weekly_ads.normalize_zip(zip)
    if not zip_code:
        raise HTTPException(
            status_code=400,
            detail=error_response("INVALID_ZIP", "Enter a 5-digit US ZIP code."),
        )
    if not weekly_ads.store_applies_to_zip(store_id, zip_code):
        raise HTTPException(
            status_code=404,
            detail=error_response("STORE_NOT_FOUND", "Store not found or does not serve this ZIP code."),
        )
    weekly_ads.remove_favorite(user_id, zip_code, store_id)
    return success_response({"zip": zip_code, "storeId": store_id, "isFavorite": False, "is_favorite": False})
