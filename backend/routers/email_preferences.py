"""PP-137: email preferences (opt-in low-stock digest) and one-click unsubscribe."""

from __future__ import annotations

from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import HTMLResponse, RedirectResponse
from pydantic import BaseModel

from backend.auth_session import require_authenticated_user_id
from backend.models.responses import error_response, success_response
from backend.services import email_journeys, low_stock_digest

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


_LISTS = {
    "recipes": {
        "label": "recipe emails",
        "done": "You won't get recipe emails from Pantry Hub anymore. Account and billing emails are not affected.",
        "off": email_journeys.unsubscribe_recipes,
        "on": email_journeys.resubscribe_recipes,
    },
    "onboarding": {
        "label": "getting-started tips",
        "done": "You won't get getting-started tips anymore. Account and billing emails are not affected.",
        "off": email_journeys.unsubscribe_onboarding,
        "on": email_journeys.resubscribe_onboarding,
    },
}


def _confirm_form(token: str, list_name: str, label: str) -> str:
    return _PAGE.format(
        title=f"Stop {label}?",
        body=(
            f'<form method="post" action="/api/public/email/unsubscribe?token={token}&amp;list={list_name}">'
            '<button type="submit" style="background:#689f38;color:#fff;border:0;border-radius:8px;'
            'padding:12px 20px;font-size:16px;font-weight:700;cursor:pointer;">Unsubscribe</button></form>'
        ),
    )


@router.api_route("/api/public/email/unsubscribe", methods=["GET", "POST"], response_class=HTMLResponse)
async def unsubscribe(request: Request, token: str = "", list: str = "", action: str = ""):
    """Unsubscribe by token.

    ``list=recipes|onboarding`` (PP-195/196): GET shows a one-button page and POST (the page button, or a
    mail client's RFC 8058 one-click) does it, so link scanners that prefetch GETs cannot unsubscribe anyone.
    No ``list`` is the original low-stock digest link (PP-137): GET unsubscribes at once.
    """
    cfg = _LISTS.get(list)
    if cfg is not None:
        if request.method == "GET":
            return HTMLResponse(_confirm_form(token, list, cfg["label"]))
        form_action = ""
        try:
            form = await request.form()
            form_action = str(form.get("action") or "")
        except Exception:
            form_action = ""
        if (action or form_action) == "resubscribe":
            ok = cfg["on"](token)
            title, body = ("You're back on the list", "Welcome back.") if ok else ("Link not recognized", "This link is invalid or expired.")
            return HTMLResponse(_PAGE.format(title=title, body=body), status_code=200 if ok else 404)
        ok = cfg["off"](token)
        if not ok:
            return HTMLResponse(
                _PAGE.format(title="Link not recognized", body="This unsubscribe link is invalid or expired."),
                status_code=404,
            )
        undo = (
            f'{cfg["done"]}<form method="post" action="/api/public/email/unsubscribe?token={token}&amp;list={list}&amp;action=resubscribe" '
            'style="margin-top:16px;"><button type="submit" style="background:none;border:0;color:#475569;text-decoration:underline;'
            'font-size:14px;cursor:pointer;">Unsubscribed by mistake? Resubscribe</button></form>'
        )
        return HTMLResponse(_PAGE.format(title="You're unsubscribed", body=undo))
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


@router.get("/api/public/email/confirm", response_class=HTMLResponse)
async def confirm_subscription(request: Request, token: str = ""):
    """Double opt-in link. Known link-scanner user agents get a button page instead of confirming."""
    ua = request.headers.get("user-agent", "")
    if email_journeys.BOT_UA.search(ua):
        return HTMLResponse(
            _PAGE.format(
                title="Confirm your recipe emails",
                body=f'<form method="get" action="/api/public/email/confirm"><input type="hidden" name="token" value="{token}">'
                '<button type="submit" style="background:#689f38;color:#fff;border:0;border-radius:8px;padding:12px 20px;'
                'font-size:16px;font-weight:700;cursor:pointer;">Yes, send me recipes</button></form>',
            )
        )
    if email_journeys.confirm_subscriber(token):
        return HTMLResponse(
            _PAGE.format(
                title="You're on the list",
                body='Thanks for confirming. Your first email is on its way. <a href="/recipes/" style="color:#689f38;">Browse recipes</a>',
            )
        )
    return HTMLResponse(
        _PAGE.format(title="Link not recognized", body="This confirmation link is invalid or expired. Sign up again on the recipes page."),
        status_code=404,
    )


@router.get("/api/public/email/click")
async def email_click(request: Request, s: str = "", l: str = "", p: str = "/"):
    """First-party click tracking. Redirects to a site path only (never an arbitrary URL)."""
    path = p if p.startswith("/") and not p.startswith("//") and "\\" not in p and len(p) <= 300 else "/"
    ua = request.headers.get("user-agent", "")
    try:
        email_journeys.record_click(s, l, path, is_bot=bool(email_journeys.BOT_UA.search(ua)))
    except Exception:
        pass  # never break the redirect over analytics
    return RedirectResponse(f"{email_journeys.email_service._app_url()}{path}", status_code=302)
