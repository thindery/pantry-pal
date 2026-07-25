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
        # Known verification failures (missing secret, bad signature) — safe to surface code-level message
        msg = str(exc)
        safe = msg if "signature" in msg.lower() or "secret" in msg.lower() or "Webhook" in msg else "Invalid webhook"
        raise HTTPException(status_code=400, detail={"received": False, "error": safe})
    except Exception:
        # Do not leak Stripe SDK / internal exception strings to clients
        raise HTTPException(status_code=400, detail={"received": False, "error": "Webhook processing failed"})