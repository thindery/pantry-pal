"""Subscription and billing routes."""

from __future__ import annotations

import logging

from fastapi import APIRouter, Depends, HTTPException, Request

from backend.auth_session import require_authenticated_user_id, resolve_authenticated_user
from backend.services.user_profile import merge_contact
from backend.models.responses import error_response, success_response
from backend.models.schemas import CheckoutConfirmRequest, CheckoutRequest, PortalRequest
from backend.lib.url_validation import validate_redirect_url
from backend.services import email_service, pantry_service, stripe_service, subscription_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/subscription", tags=["Subscription"])


@router.get("/tier")
async def get_tier(user_id: str = Depends(require_authenticated_user_id)):
    items = pantry_service.get_all_items(user_id)
    return success_response(subscription_service.get_user_tier_info(user_id, len(items)))


@router.get("/check-items")
async def check_items(user_id: str = Depends(require_authenticated_user_id)):
    items = pantry_service.get_all_items(user_id)
    check = subscription_service.can_add_items(user_id, len(items))
    return success_response(
        {
            "canAdd": check["allowed"],
            "currentItems": len(items),
            "maxItems": check["remaining"] + len(items) if check["remaining"] != -1 else -1,
            "remaining": check["remaining"],
        }
    )


@router.get("/check-receipt")
async def check_receipt(user_id: str = Depends(require_authenticated_user_id)):
    check = subscription_service.can_scan_receipt(user_id)
    return success_response({"canScan": check["allowed"], "remaining": check["remaining"]})


@router.get("/check-voice")
async def check_voice(user_id: str = Depends(require_authenticated_user_id)):
    return success_response({"canUse": subscription_service.can_use_voice_assistant(user_id)})


@router.get("/prices")
async def get_prices(user_id: str = Depends(require_authenticated_user_id)):
    del user_id
    return success_response(stripe_service.get_price_ids())


@router.get("/status")
async def get_status(user_id: str = Depends(require_authenticated_user_id)):
    items = pantry_service.get_all_items(user_id)
    tier_info = subscription_service.get_user_tier_info(user_id, len(items))
    return success_response(
        {
            "tier": tier_info["tier"],
            "isPaid": tier_info["tier"] != "free",
            "isActive": (tier_info.get("subscription") or {}).get("status") == "active",
            "subscriptionStatus": (tier_info.get("subscription") or {}).get("status"),
        }
    )


@router.get("")
async def get_subscription(user_id: str = Depends(require_authenticated_user_id)):
    """Alias for tier info (API docs compatibility)."""
    items = pantry_service.get_all_items(user_id)
    return success_response(subscription_service.get_user_tier_info(user_id, len(items)))


@router.post("/checkout")
async def checkout(body: CheckoutRequest, request: Request, user_id: str = Depends(require_authenticated_user_id)):
    try:
        for field_name, url in (("successUrl", body.successUrl), ("cancelUrl", body.cancelUrl)):
            try:
                validate_redirect_url(url)
            except ValueError as exc:
                raise HTTPException(
                    status_code=400,
                    detail=error_response("VALIDATION_ERROR", f"Invalid {field_name}", {"reason": str(exc)}),
                ) from exc
        _, jwt_email = await resolve_authenticated_user(request)
        contact = merge_contact(user_id, email=jwt_email)
        session = await stripe_service.create_checkout_session(
            user_id,
            body.tier,
            body.billingInterval,
            body.successUrl,
            body.cancelUrl,
            email=contact.get("email"),
            name=contact.get("name"),
        )
        return success_response(session)
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(
            status_code=500,
            detail=error_response("INTERNAL_ERROR", "Failed to create checkout session"),
        )


@router.post("/checkout/confirm")
async def confirm_checkout(body: CheckoutConfirmRequest, user_id: str = Depends(require_authenticated_user_id)):
    """PP-168: success page confirms the paid session so a late webhook cannot show Free."""
    try:
        result = stripe_service.confirm_checkout_session(user_id, body.sessionId)
        return success_response(result)
    except ValueError as exc:
        raise HTTPException(
            status_code=400,
            detail=error_response("VALIDATION_ERROR", "Invalid checkout session"),
        ) from exc
    except PermissionError as exc:
        raise HTTPException(
            status_code=404,
            detail=error_response("NOT_FOUND", "Checkout session not found"),
        ) from exc
    except Exception:
        logger.exception("Checkout confirm failed")
        raise HTTPException(
            status_code=502,
            detail=error_response("INTERNAL_ERROR", "Could not confirm checkout yet"),
        )


@router.post("/portal")
async def portal(body: PortalRequest, request: Request, user_id: str = Depends(require_authenticated_user_id)):
    try:
        try:
            validate_redirect_url(body.returnUrl)
        except ValueError as exc:
            raise HTTPException(
                status_code=400,
                detail=error_response("VALIDATION_ERROR", "Invalid returnUrl", {"reason": str(exc)}),
            ) from exc
        _, jwt_email = await resolve_authenticated_user(request)
        contact = merge_contact(user_id, email=jwt_email)
        session = await stripe_service.create_portal_session(
            user_id,
            body.returnUrl,
            email=contact.get("email"),
            name=contact.get("name"),
        )
        return success_response(session)
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(
            status_code=500,
            detail=error_response("INTERNAL_ERROR", "Failed to create portal session"),
        )


@router.post("/cancel")
async def cancel_subscription(user_id: str = Depends(require_authenticated_user_id)):
    sub = subscription_service.get_user_subscription(user_id)
    if not sub or not sub.get("stripeSubscriptionId"):
        raise HTTPException(status_code=400, detail=error_response("VALIDATION_ERROR", "No active subscription"))
    import stripe

    updated = stripe.Subscription.modify(sub["stripeSubscriptionId"], cancel_at_period_end=True)
    period_end = stripe_service._iso_from_unix(stripe_service._period_unix(updated)[1])
    status = getattr(updated, "status", None) or (updated.get("status") if isinstance(updated, dict) else None)
    subscription_service.update_user_subscription(
        user_id,
        {
            "cancelAtPeriodEnd": True,
            "subscriptionEndDate": period_end or sub.get("subscriptionEndDate"),
            "subscriptionStatus": status if status in {"active", "trialing", "past_due"} else (sub.get("subscriptionStatus") or "active"),
        },
    )
    items = pantry_service.get_all_items(user_id)
    info = subscription_service.get_user_tier_info(user_id, len(items))
    try:
        contact = merge_contact(user_id)
        email_service.send_cancellation_scheduled(
            user_id=user_id,
            email=contact.get("email"),
            subscription_id=sub["stripeSubscriptionId"],
            period_end=period_end or sub.get("subscriptionEndDate"),
            tier=sub.get("tier"),
        )
    except Exception:
        logger.exception("Cancellation email failed after the subscription was updated")
    return success_response(info)


@router.post("/reactivate")
async def reactivate_subscription(user_id: str = Depends(require_authenticated_user_id)):
    sub = subscription_service.get_user_subscription(user_id)
    if not sub or not sub.get("stripeSubscriptionId"):
        raise HTTPException(status_code=400, detail=error_response("VALIDATION_ERROR", "No subscription to reactivate"))
    import stripe

    updated = stripe.Subscription.modify(sub["stripeSubscriptionId"], cancel_at_period_end=False)
    status = getattr(updated, "status", None) or (updated.get("status") if isinstance(updated, dict) else None)
    subscription_service.update_user_subscription(
        user_id,
        {
            "cancelAtPeriodEnd": False,
            "subscriptionStatus": status or "active",
        },
    )
    items = pantry_service.get_all_items(user_id)
    return success_response(subscription_service.get_user_tier_info(user_id, len(items)))
