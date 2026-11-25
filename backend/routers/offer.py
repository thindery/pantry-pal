"""PP-166: public first-month offer details for the marketing banner."""

from __future__ import annotations

from fastapi import APIRouter

from backend.models.responses import success_response
from backend.services import first_month_offer

router = APIRouter(prefix="/api/public", tags=["Offer"])


@router.get("/offer")
async def get_offer():
    """Display-only offer state. Never includes the Stripe coupon id."""
    return success_response(first_month_offer.public_offer())
