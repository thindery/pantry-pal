"""Subscription and billing routes."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException

from backend.auth_session import require_authenticated_user_id
from backend.models.responses import error_response, success_response
from backend.models.schemas import CheckoutRequest, PortalRequest
from backend.lib.url_validation import validate_redirect_url
from backend.services import pantry_service, stripe_service, subscription_service

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
async def checkout(body: CheckoutRequest, user_id: str = Depends(require_authenticated_user_id)):
    try:
        for field_name, url in (("successUrl", body.successUrl), ("cancelUrl", body.cancelUrl)):
            try:
                validate_redirect_url(url)
            except ValueError as exc:
                raise HTTPException(
                    status_code=400,
                    detail=error_response("VALIDATION_ERROR", f"Invalid {field_name}", {"reason": str(exc)}),
                ) from exc
        session = await stripe_service.create_checkout_session(
            user_id,
            body.tier,
            body.billingInterval,
            body.successUrl,
            body.cancelUrl,
        )
        return success_response(session)
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(
            status_code=500,
            detail=error_response("INTERNAL_ERROR", "Failed to create checkout session"),
        )


@router.post("/portal")
async def portal(body: PortalRequest, user_id: str = Depends(require_authenticated_user_id)):
    try:
        try:
            validate_redirect_url(body.returnUrl)
        except ValueError as exc:
            raise HTTPException(
                status_code=400,
                detail=error_response("VALIDATION_ERROR", "Invalid returnUrl", {"reason": str(exc)}),
            ) from exc
        session = await stripe_service.create_portal_session(user_id, body.returnUrl)
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

    stripe.Subscription.modify(sub["stripeSubscriptionId"], cancel_at_period_end=True)
    subscription_service.update_user_subscription(user_id, {"subscriptionStatus": "canceled"})
    return success_response({"cancelled": True})


@router.post("/reactivate")
async def reactivate_subscription(user_id: str = Depends(require_authenticated_user_id)):
    sub = subscription_service.get_user_subscription(user_id)
    if not sub or not sub.get("stripeSubscriptionId"):
        raise HTTPException(status_code=400, detail=error_response("VALIDATION_ERROR", "No subscription to reactivate"))
    import stripe

    stripe.Subscription.modify(sub["stripeSubscriptionId"], cancel_at_period_end=False)
    subscription_service.update_user_subscription(user_id, {"subscriptionStatus": "active"})
    items = pantry_service.get_all_items(user_id)
    return success_response(subscription_service.get_user_tier_info(user_id, len(items)))