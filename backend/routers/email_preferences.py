"""PP-137: email preferences (opt-in low-stock digest) and one-click unsubscribe."""

from __future__ import annotations

from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import HTMLResponse
from pydantic import BaseModel

from backend.auth_session import require_authenticated_user_id
from backend.models.responses import error_response, success_response
from backend.services import low_stock_digest

router = APIRouter(tags=["Email preferences"])


class EmailPreferencesUpdate(BaseModel):
    lowStockDigest: Optional[bool] = None
    thresholdConfig: Optional[dict[str, Any]] = None
    itemThresholdOverrides: Optional[dict[str, Any]] = None


@router.get("/api/email-preferences")
async def get_email_preferences(user_id: str = Depends(require_authenticated_user_id)):
    return success_response(low_stock_digest.get_preferences(user_id))


@router.put("/api/email-preferences")
async def update_email_preferences(
    body: EmailPreferencesUpdate, user_id: str = Depends(require_authenticated_user_id)
):
    if body.lowStockDigest is True and not low_stock_digest.is_enabled():
        raise HTTPException(
            status_code=409,
            detail=error_response("NOT_AVAILABLE", "The low-stock email is not available yet."),
        )
    prefs = low_stock_digest.set_preferences(
        user_id,
        low_stock_digest=body.lowStockDigest,
        threshold_config=body.thresholdConfig,
        item_threshold_overrides=body.itemThresholdOverrides,
    )
    return success_response(prefs)


_PAGE = """<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="robots" content="noindex">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>Pantry Hub email</title></head>
<body style="font-family:system-ui,sans-serif;background:#fefdf9;color:#0f172a;padding:48px 16px;text-align:center;">
<h1 style="font-size:22px;">{title}</h1><p>{body}</p>
<p><a href="https://www.mypantryhub.com/dashboard/account/" style="color:#689f38;">Email settings</a></p></body></html>"""


@router.api_route("/api/public/email/unsubscribe", methods=["GET", "POST"], response_class=HTMLResponse)
async def unsubscribe(request: Request, token: str = ""):
    """GET from the email link or POST from a mail client's one-click button."""
    ok = low_stock_digest.unsubscribe(token)
    if ok:
        page = _PAGE.format(
            title="You're unsubscribed",
            body="You won't get the weekly low-stock email anymore. Billing and account emails are not affected.",
        )
        return HTMLResponse(page)
    page = _PAGE.format(
        title="Link not recognized",
        body="This unsubscribe link is invalid or expired. You can turn the email off in your account settings.",
    )
    return HTMLResponse(page, status_code=404)
