"""PP-193: public, capture-only recipe newsletter signup. Sends no email."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from backend.models.responses import error_response, success_response
from backend.services import recipe_newsletter_service
from backend.services.recipe_newsletter_service import InvalidNewsletterEmail

router = APIRouter(prefix="/api/public", tags=["Recipe newsletter"])


class NewsletterSubscribeRequest(BaseModel):
    email: str
    source: str = "recipes_index"
    recipe_slug: str | None = None
    # Honeypot. Bots that fill it get a fake success and are not stored.
    website: str = Field(default="")


@router.post("/recipe-newsletter")
async def subscribe(body: NewsletterSubscribeRequest):
    if body.website.strip():
        return success_response({"subscribed": True})
    try:
        result = recipe_newsletter_service.subscribe(
            email=body.email,
            source=body.source,
            recipe_slug=body.recipe_slug,
        )
    except InvalidNewsletterEmail:
        raise HTTPException(
            status_code=400,
            detail=error_response("INVALID_EMAIL", "Enter a valid email address."),
        )
    return success_response({"subscribed": True, "confirmation_required": bool(result["confirmation_required"])})
