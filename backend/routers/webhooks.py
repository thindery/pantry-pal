"""Stripe and Resend webhook routes."""

from __future__ import annotations

import json
import logging
import os

from fastapi import APIRouter, HTTPException, Request

from backend.services import resend_webhook, stripe_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/webhooks", tags=["Webhooks"])


@router.post("/stripe")
async def stripe_webhook(request: Request):
    payload = await request.body()
    signature = request.headers.get("stripe-signature")
    if not signature:
        raise HTTPException(status_code=400, detail={"received": False, "error": "Missing stripe-signature header"})
    try:
        event = stripe_service.verify_webhook(payload, signature)
        if not stripe_service.should_handle_webhook_event(event):
            return {"received": True}
        result = stripe_service.process_webhook(
            event["type"] if isinstance(event, dict) else event["type"],
            event["data"] if isinstance(event, dict) else event["data"],
        )
        stripe_service.mark_webhook_event_processed(event)
        return result
    except ValueError as exc:
        # Known verification failures (missing secret, bad signature) — safe to surface code-level message
        msg = str(exc)
        safe = msg if "signature" in msg.lower() or "secret" in msg.lower() or "Webhook" in msg else "Invalid webhook"
        raise HTTPException(status_code=400, detail={"received": False, "error": safe})
    except Exception:
        # Do not leak Stripe SDK / internal exception strings to clients
        # Failed events stay unprocessed so Stripe can retry.
        logger.exception("Webhook processing failed")
        raise HTTPException(status_code=400, detail={"received": False, "error": "Webhook processing failed"})


@router.post("/resend")
async def resend_webhook_route(request: Request):
    secret = (os.getenv("RESEND_WEBHOOK_SECRET") or "").strip()
    if not secret:
        logger.warning("Resend webhook received but RESEND_WEBHOOK_SECRET is unset")
        raise HTTPException(
            status_code=503,
            detail={"received": False, "error": "Webhook service unavailable"},
        )

    payload = await request.body()
    try:
        resend_webhook.verify_svix(payload, request.headers, secret=secret)
    except resend_webhook.SvixVerificationError:
        logger.warning("Resend webhook signature verification failed")
        raise HTTPException(
            status_code=400,
            detail={"received": False, "error": "Invalid webhook signature"},
        )
    except Exception:
        logger.exception("Unexpected error verifying Resend webhook signature")
        raise HTTPException(
            status_code=400,
            detail={"received": False, "error": "Invalid webhook signature"},
        )

    try:
        event = json.loads(payload.decode("utf-8")) if payload else {}
    except Exception:
        raise HTTPException(
            status_code=400,
            detail={"received": False, "error": "Invalid payload JSON"},
        )

    if not isinstance(event, dict):
        raise HTTPException(status_code=400, detail={"received": False, "error": "Invalid payload JSON"})

    svix_id = request.headers.get("svix-id")
    try:
        resend_webhook.process_event(event, event_id=svix_id)
        return {"received": True}
    except Exception:
        logger.exception("Failed to process Resend webhook event")
        raise HTTPException(
            status_code=500,
            detail={"received": False, "error": "Failed to process webhook event"},
        )

