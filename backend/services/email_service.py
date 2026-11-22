"""Transactional email via Resend. No-ops safely when unconfigured."""

from __future__ import annotations

import logging
import os
import uuid
from typing import Any, Optional

from database.db import db_connection

logger = logging.getLogger(__name__)

DEFAULT_FROM = "Pantry Hub <noreply@mypantryhub.com>"
CONTACT_EMAIL = "info@mypantryhub.com"


def _app_url() -> str:
    return (os.getenv("FRONTEND_URL") or os.getenv("APP_URL") or "https://www.mypantryhub.com").rstrip("/")


def _is_production() -> bool:
    return (os.getenv("ENVIRONMENT") or "").strip().lower() == "production"


def _from_address() -> str:
    return (os.getenv("RESEND_FROM_EMAIL") or "").strip()


def _api_key() -> str:
    return (os.getenv("RESEND_API_KEY") or "").strip()


def already_sent(idempotency_key: str) -> bool:
    try:
        with db_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "SELECT 1 FROM email_sends WHERE idempotency_key = %s",
                    (idempotency_key,),
                )
                return cur.fetchone() is not None
    except Exception:
        logger.exception("email_sends lookup failed for %s", idempotency_key)
        return False


def _record_send(user_id: Optional[str], template: str, idempotency_key: str, resend_id: Optional[str]) -> bool:
    try:
        with db_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    INSERT INTO email_sends (id, user_id, template, idempotency_key, resend_id)
                    VALUES (%s, %s, %s, %s, %s)
                    ON CONFLICT (idempotency_key) DO NOTHING
                    RETURNING id
                    """,
                    (str(uuid.uuid4()), user_id, template, idempotency_key, resend_id),
                )
                return cur.fetchone() is not None
    except Exception:
        logger.exception("email_sends insert failed")
        return False


def send_email(
    *,
    to: Optional[str],
    subject: str,
    html: str,
    text: str,
    template: str,
    idempotency_key: str,
    user_id: Optional[str] = None,
) -> dict[str, Any]:
    """Send one transactional email, or skip if already sent / not configured."""
    if not to:
        logger.error("Transactional email %s skipped: no recipient available", template)
        return {"skipped": True, "reason": "missing_recipient"}
    if already_sent(idempotency_key):
        return {"skipped": True, "reason": "already_sent"}

    api_key = _api_key()
    from_addr = _from_address()
    if not api_key or not from_addr:
        # Fail loudly in production logs, but never crash the billing/auth path.
        log = logger.error if _is_production() else logger.warning
        missing = []
        if not api_key:
            missing.append("RESEND_API_KEY")
        if not from_addr:
            missing.append("RESEND_FROM_EMAIL")
        log("Transactional email %s not sent; missing %s", template, ", ".join(missing))
        return {"skipped": True, "reason": "not_configured"}

    if not _record_send(user_id, template, idempotency_key, None):
        return {"skipped": True, "reason": "already_sent"}

    try:
        import resend

        resend.api_key = api_key
        result = resend.Emails.send(
            {
                "from": from_addr,
                "to": [to],
                "subject": subject,
                "html": html,
                "text": text,
            }
        )
        resend_id = result.get("id") if isinstance(result, dict) else getattr(result, "id", None)
        if resend_id:
            with db_connection() as conn:
                with conn.cursor() as cur:
                    cur.execute(
                        "UPDATE email_sends SET resend_id = %s WHERE idempotency_key = %s",
                        (resend_id, idempotency_key),
                    )
        logger.info("Sent transactional email %s id=%s", template, resend_id)
        return {"skipped": False, "id": resend_id}
    except Exception:
        logger.exception("Failed to send transactional email %s", template)
        try:
            with db_connection() as conn:
                with conn.cursor() as cur:
                    cur.execute(
                        "DELETE FROM email_sends WHERE idempotency_key = %s AND resend_id IS NULL",
                        (idempotency_key,),
                    )
        except Exception:
            logger.exception("Could not release email send claim %s", template)
        return {"skipped": True, "reason": "send_failed"}


def _wrap(title: str, body_html: str, body_text: str) -> tuple[str, str]:
    html = f"""<!doctype html>
<html><body style="font-family:system-ui,sans-serif;color:#0f172a;line-height:1.5">
  <h1 style="font-size:20px">{title}</h1>
  {body_html}
  <p style="color:#64748b;font-size:13px">Questions? Contact {CONTACT_EMAIL}.</p>
</body></html>"""
    text = f"{title}\n\n{body_text}\n\nQuestions? Contact {CONTACT_EMAIL}."
    return html, text


def send_welcome(user_id: str, email: Optional[str], name: Optional[str] = None) -> dict[str, Any]:
    greeting = f"Hi {name}," if name else "Hi,"
    url = _app_url()
    html, text = _wrap(
        "Welcome to Pantry Hub",
        f"<p>{greeting}</p><p>Thanks for joining Pantry Hub. Sign in any time at <a href=\"{url}\">{url.replace('https://','')}</a> to keep track of what's in your pantry.</p>",
        f"{greeting}\n\nThanks for joining Pantry Hub. Sign in any time at {url} to keep track of what's in your pantry.",
    )
    return send_email(
        to=email,
        subject="Welcome to Pantry Hub",
        html=html,
        text=text,
        template="welcome",
        idempotency_key=f"welcome:{user_id}",
        user_id=user_id,
    )


def send_payment_confirmation(
    *,
    user_id: str,
    email: Optional[str],
    invoice_id: str,
    tier: Optional[str],
    amount_cents: int,
    currency: str = "usd",
    period_end: Optional[str] = None,
    is_free_invoice: bool = False,
) -> dict[str, Any]:
    amount = f"{(amount_cents or 0) / 100:.2f} {(currency or 'usd').upper()}"
    plan = (tier or "pro").title()
    end_line = f" Your access continues through {period_end}." if period_end else ""
    portal = f"{_app_url()}/dashboard/account/"
    if is_free_invoice or amount_cents == 0:
        subject = f"Your Pantry Hub {plan} plan is active"
        lead = f"Your {plan} plan is now active.{end_line}"
    else:
        subject = f"Payment received for your Pantry Hub {plan} plan"
        lead = f"We received your payment of {amount} for Pantry Hub {plan}.{end_line}"
    html, text = _wrap(
        subject,
        f"<p>{lead}</p><p>You can manage billing at <a href=\"{portal}\">your account page</a>.</p>",
        f"{lead}\n\nManage billing: {portal}",
    )
    return send_email(
        to=email,
        subject=subject,
        html=html,
        text=text,
        template="payment_confirmation",
        idempotency_key=f"invoice.paid:{invoice_id}",
        user_id=user_id,
    )


def send_payment_failed(
    *,
    user_id: str,
    email: Optional[str],
    invoice_id: str,
    amount_cents: int,
    currency: str = "usd",
) -> dict[str, Any]:
    amount = f"{(amount_cents or 0) / 100:.2f} {(currency or 'usd').upper()}"
    portal = f"{_app_url()}/dashboard/account/"
    html, text = _wrap(
        "We couldn't process your Pantry Hub payment",
        f"<p>A payment of {amount} for your Pantry Hub subscription did not go through. Please update your card so your plan stays active.</p><p><a href=\"{portal}\">Update your payment method</a></p>",
        f"A payment of {amount} for your Pantry Hub subscription did not go through. Update your payment method at {portal}",
    )
    return send_email(
        to=email,
        subject="Action needed: Pantry Hub payment failed",
        html=html,
        text=text,
        template="payment_failed",
        idempotency_key=f"invoice.failed:{invoice_id}",
        user_id=user_id,
    )


def send_cancellation_scheduled(
    *,
    user_id: str,
    email: Optional[str],
    subscription_id: str,
    period_end: Optional[str] = None,
) -> dict[str, Any]:
    end_line = f" You'll keep access until {period_end}." if period_end else " You'll keep access until the end of the current period."
    account = f"{_app_url()}/dashboard/account/"
    html, text = _wrap(
        "Your Pantry Hub cancellation is scheduled",
        f"<p>We've scheduled your cancellation.{end_line}</p><p>You can resume the plan from <a href=\"{account}\">your account page</a>.</p>",
        f"We've scheduled your cancellation.{end_line}\n\nResume your plan: {account}",
    )
    return send_email(
        to=email,
        subject="Your Pantry Hub cancellation is scheduled",
        html=html,
        text=text,
        template="cancellation_scheduled",
        idempotency_key=f"cancel.scheduled:{subscription_id}",
        user_id=user_id,
    )


def send_subscription_ended(
    *,
    user_id: str,
    email: Optional[str],
    subscription_id: str,
) -> dict[str, Any]:
    pricing = f"{_app_url()}/pricing/"
    html, text = _wrap(
        "Your Pantry Hub subscription has ended",
        f"<p>Your Pantry Hub paid plan has ended and this account is now on the Free plan.</p><p>You can resubscribe any time from the <a href=\"{pricing}\">pricing page</a>.</p>",
        f"Your Pantry Hub paid plan has ended and this account is now on the Free plan.\n\nResubscribe: {pricing}",
    )
    return send_email(
        to=email,
        subject="Your Pantry Hub subscription has ended",
        html=html,
        text=text,
        template="subscription_ended",
        idempotency_key=f"cancel.ended:{subscription_id}",
        user_id=user_id,
    )
