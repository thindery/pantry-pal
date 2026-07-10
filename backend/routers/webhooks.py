"""Stripe webhook routes."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, Request

from backend.services import stripe_service

router = APIRouter(prefix="/api/webhooks", tags=["Webhooks"])


@router.post("/stripe")
async def stripe_webhook(request: Request):
    payload = await request.body()
    signature = request.headers.get("stripe-signature")
    if not signature:
        raise HTTPException(status_code=400, detail={"received": False, "error": "Missing stripe-signature header"})
    try:
        event = stripe_service.verify_webhook(payload, signature)
        result = stripe_service.process_webhook(event["type"], event["data"])
        return result
    except ValueError as exc:
        raise HTTPException(status_code=400, detail={"received": False, "error": str(exc)})
    except Exception as exc:
        raise HTTPException(status_code=400, detail={"received": False, "error": str(exc)})