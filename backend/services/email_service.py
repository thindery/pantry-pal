"""Transactional email via Resend. No-ops safely when unconfigured."""

from __future__ import annotations

import logging
import os
import uuid
from typing import Any, Optional

from database.db import db_connection

logger = logging.getLogger(__name__)

DEFAULT_FROM = "Pantry Hub <noreply@mypantryhub.com>"
CONTACT_EMAIL = "hello@mypantryhub.com"


def _app_url() -> str:
    return (os.getenv("FRONTEND_URL") or os.getenv("APP_URL") or "https://www.mypantryhub.com").rstrip("/")


def _is_production() -> bool:
    return (os.getenv("ENVIRONMENT") or "").strip().lower() == "production"


def _from_address() -> str:
    return (os.getenv("RESEND_FROM_EMAIL") or "").strip()


def _api_key() -> str:
    return (os.getenv("RESEND_API_KEY") or "").strip()


def _sanitize_error(error: Any) -> str:
    msg = str(error) if error is not None else ""
    if not msg:
        msg = type(error).__name__ if error is not None else "Unknown error"
    api_key = _api_key()
    if api_key and api_key in msg:
        msg = msg.replace(api_key, "[REDACTED]")
    return msg[:500]


def _mask_email(email: Optional[str]) -> str:
    """Mask email address for safe logging (e.g. u***r@example.com)."""
    if not email:
        return "[EMPTY]"
    parts = email.split("@", 1)
    if len(parts) == 2:
        name, domain = parts
        if len(name) <= 2:
            masked_name = name[0] + "***" if name else "***"
        else:
            masked_name = name[0] + "***" + name[-1]
        return f"{masked_name}@{domain}"
    return "***"


def is_suppressed(email: Optional[str]) -> bool:
    """Check if an email address is in the suppressions table."""
    if not email:
        return False
    try:
        with db_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "SELECT 1 FROM email_suppressions WHERE email = %s",
                    (email.strip().lower(),),
                )
                return cur.fetchone() is not None
    except Exception:
        logger.exception("email_suppressions lookup failed for %s", _mask_email(email))
        return False


def _is_billing_critical_template(template: str) -> bool:
    """Return True if template is billing-critical and should bypass suppression."""
    t = (template or "").strip().lower()
    return t.startswith("payment_") or t.startswith("cancel") or t == "subscription_ended"


def count_sent(
    *,
    template: Optional[str] = None,
    user_id: Optional[str] = None,
    status: Optional[str] = None,
) -> int:
    """Count sent emails excluding backfill rows (status <> 'backfill').

    Dashboards can also query directly using the SQL filter:
        WHERE status <> 'backfill'
    """
    try:
        with db_connection() as conn:
            with conn.cursor() as cur:
                conditions = ["status <> 'backfill'"]
                params: list[Any] = []
                if status:
                    conditions.append("status = %s")
                    params.append(status)
                if template:
                    conditions.append("template = %s")
                    params.append(template)
                if user_id:
                    conditions.append("user_id = %s")
                    params.append(user_id)
                query = f"SELECT COUNT(*) AS cnt FROM email_sends WHERE {' AND '.join(conditions)}"
                cur.execute(query, tuple(params))
                row = cur.fetchone()
                if not row:
                    return 0
                if isinstance(row, dict):
                    return int(row.get("cnt") or 0)
                return int(row[0] or 0)
    except Exception:
        logger.exception("email_sends count failed")
        return 0


def already_sent(idempotency_key: str) -> bool:
    try:
        with db_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "SELECT 1 FROM email_sends WHERE idempotency_key = %s AND (status IS NULL OR status != 'failed')",
                    (idempotency_key,),
                )
                return cur.fetchone() is not None
    except Exception:
        logger.exception("email_sends lookup failed for %s", idempotency_key)
        return False


def _record_send(
    user_id: Optional[str],
    template: str,
    idempotency_key: str,
    resend_id: Optional[str] = None,
    to_email: Optional[str] = None,
    subject: Optional[str] = None,
) -> bool:
    initial_status = "sent" if resend_id else "pending"
    try:
        with db_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    INSERT INTO email_sends (id, user_id, template, idempotency_key, resend_id, to_email, subject, status, updated_at)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, NOW())
                    ON CONFLICT (idempotency_key) DO UPDATE
                    SET status = EXCLUDED.status,
                        resend_id = EXCLUDED.resend_id,
                        error_message = NULL,
                        to_email = EXCLUDED.to_email,
                        subject = EXCLUDED.subject,
                        updated_at = NOW()
                    WHERE email_sends.status = 'failed'
                    RETURNING id
                    """,
                    (str(uuid.uuid4()), user_id, template, idempotency_key, resend_id, to_email, subject, initial_status),
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

    if is_suppressed(to):
        if _is_billing_critical_template(template):
            # Billing-critical templates (payment confirmations, payment failures,
            # cancellation scheduled, subscription ended) must still be sent even if the
            # recipient address is in email_suppressions, so users receive legally and
            # contractually required financial/subscription notifications.
            logger.warning(
                "Recipient %s is in email_suppressions, but sending billing-critical email %s anyway",
                _mask_email(to),
                template,
            )
        else:
            logger.info(
                "Skipping non-billing email %s: recipient %s is suppressed",
                template,
                _mask_email(to),
            )
            return {"skipped": True, "reason": "suppressed"}

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

    if not _record_send(
        user_id,
        template,
        idempotency_key,
        resend_id=None,
        to_email=to,
        subject=subject,
    ):
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
        with db_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    UPDATE email_sends
                    SET status = 'sent', resend_id = %s, updated_at = NOW()
                    WHERE idempotency_key = %s
                    """,
                    (resend_id, idempotency_key),
                )
        logger.info("Sent transactional email %s id=%s", template, resend_id)
        return {"skipped": False, "id": resend_id}
    except Exception as exc:
        logger.exception("Failed to send transactional email %s", template)
        clean_err = _sanitize_error(exc)
        try:
            with db_connection() as conn:
                with conn.cursor() as cur:
                    cur.execute(
                        """
                        UPDATE email_sends
                        SET status = 'failed', error_message = %s, updated_at = NOW()
                        WHERE idempotency_key = %s
                        """,
                        (clean_err, idempotency_key),
                    )
        except Exception:
            logger.exception("Could not record email send failure %s", template)
        return {"skipped": True, "reason": "send_failed"}

# Brand tokens from frontend/app/globals.css. Button uses the darker green for contrast.
COLOR_WASH = "#fefdf9"
COLOR_SURFACE = "#ffffff"
COLOR_HAIRLINE = "#f5f0e6"
COLOR_TEXT = "#0f172a"
COLOR_MUTED = "#64748b"
COLOR_BUTTON = "#689f38"
COLOR_BUTTON_TEXT = "#ffffff"
COLOR_ACCENT = "#f59e0b"
COLOR_DANGER = "#f43f5e"
COLOR_DARK_WASH = "#0f172a"
COLOR_DARK_CARD = "#1e293b"
COLOR_DARK_TEXT = "#e2e8f0"

# Copied from the live pricing page (frontend/components/PricingPage.tsx). Do not invent extras.
PRO_FEATURES = [
    "Unlimited pantry items",
    "Unlimited AI receipt scans",
    "Cloud sync across devices",
    "Advanced analytics",
    "Push notifications",
    "CSV export",
    "Priority support",
]
FAMILY_FEATURES = [
    "Everything in Pro",
    "Up to 5 household members",
    "Shared household inventory",
    "Personal + shared lists",
    "Activity feed (who used what)",
    "Admin controls",
    "Family meal planning",
]
# Free plan limits copied directly from frontend/components/PricingPage.tsx (TIERS[0].features).
# Read from PricingPage.tsx TIERS[0].features. Hard-coded to match the exact Free plan limits shown there.
FREE_FEATURES = [
    "Up to 50 pantry items",
    "5 AI receipt scans/month",
    "Manual item entry",
    "Basic categories",
    "Single device",
    "Shopping list",
]


def _html_escape(value: str) -> str:
    return (
        value.replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
    )


def _plan_features(tier: Optional[str]) -> list[str]:
    name = (tier or "pro").strip().lower()
    if name == "family":
        return list(FAMILY_FEATURES)
    if name == "free":
        return list(FREE_FEATURES)
    return list(PRO_FEATURES)


def _format_period_end(period_end: Optional[str]) -> Optional[str]:
    if not period_end:
        return None
    raw = period_end.strip()
    try:
        from datetime import datetime

        parsed = datetime.fromisoformat(raw.replace("Z", "+00:00"))
        return parsed.strftime("%B %d, %Y")
    except Exception:
        return raw


def _cta_rows(label: str, url: str) -> str:
    safe_label = _html_escape(label)
    safe_url = _html_escape(url)
    return f"""
        <tr>
          <td style="padding:8px 0 8px 0;">
            <a href="{safe_url}" style="display:inline-block;background-color:{COLOR_BUTTON};color:{COLOR_BUTTON_TEXT};font-size:16px;font-weight:700;text-decoration:none;padding:14px 24px;border-radius:8px;">{safe_label}</a>
          </td>
        </tr>
        <tr>
          <td style="padding:0 0 16px 0;font-size:13px;line-height:1.5;color:{COLOR_MUTED};word-break:break-all;">
            If the button does not work, copy this link into your browser:<br>
            <a href="{safe_url}" style="color:{COLOR_TEXT};text-decoration:underline;">{safe_url}</a>
          </td>
        </tr>
    """


def _feature_list_html(items: list[str]) -> str:
    rows = "".join(
        f'<tr><td style="padding:0 0 6px 0;font-size:15px;line-height:1.5;color:{COLOR_TEXT};">• {_html_escape(item)}</td></tr>'
        for item in items
    )
    return f'<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">{rows}</table>'


def _wrap(
    *,
    title: str,
    preheader: str,
    body_html: str,
    body_text: str,
    cta_label: Optional[str] = None,
    cta_url: Optional[str] = None,
) -> tuple[str, str]:
    """Shared branded shell (PP-131). Table-based HTML plus a plain-text fallback."""
    safe_title = _html_escape(title)
    safe_preheader = _html_escape(preheader)
    cta_html = _cta_rows(cta_label, cta_url) if cta_label and cta_url else ""
    html = f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<title>{safe_title}</title>
<style>
  @media (prefers-color-scheme: dark) {{
    .ph-wash {{ background-color: {COLOR_DARK_WASH} !important; }}
    .ph-card {{ background-color: {COLOR_DARK_CARD} !important; }}
    .ph-text, .ph-title, .ph-wordmark {{ color: {COLOR_DARK_TEXT} !important; }}
    .ph-muted, .ph-footer {{ color: #94a3b8 !important; }}
    .ph-link {{ color: {COLOR_DARK_TEXT} !important; }}
  }}
</style>
</head>
<body class="ph-wash" style="margin:0;padding:0;background-color:{COLOR_WASH};">
  <div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">{safe_preheader}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="ph-wash" style="background-color:{COLOR_WASH};">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="ph-card" style="max-width:520px;background-color:{COLOR_SURFACE};border:2px solid {COLOR_HAIRLINE};border-radius:12px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:{COLOR_TEXT};">
          <tr>
            <td class="ph-wordmark" style="padding:28px 28px 8px 28px;font-family:Georgia,'Times New Roman',serif;font-size:26px;font-weight:700;line-height:1.2;color:{COLOR_TEXT};">
              Pantry Hub
            </td>
          </tr>
          <tr>
            <td style="padding:8px 28px 0 28px;">
              <h1 class="ph-title" style="margin:0 0 12px 0;font-size:22px;font-weight:700;line-height:1.3;color:{COLOR_TEXT};">{safe_title}</h1>
            </td>
          </tr>
          <tr>
            <td class="ph-text" style="padding:0 28px 8px 28px;font-size:16px;line-height:1.5;color:{COLOR_TEXT};">
              {body_html}
            </td>
          </tr>
          <tr>
            <td style="padding:8px 28px 8px 28px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                {cta_html}
              </table>
            </td>
          </tr>
          <tr>
            <td class="ph-footer" style="padding:8px 28px 28px 28px;font-size:13px;line-height:1.5;color:{COLOR_MUTED};">
              Questions? Reply to this email or write <a class="ph-link" href="mailto:{CONTACT_EMAIL}" style="color:{COLOR_TEXT};text-decoration:underline;">{CONTACT_EMAIL}</a>.<br>
              <a class="ph-link" href="https://www.mypantryhub.com" style="color:{COLOR_MUTED};text-decoration:underline;">www.mypantryhub.com</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>"""
    cta_text = ""
    if cta_label and cta_url:
        cta_text = f"\n\n{cta_label}:\n{cta_url}"
    text = (
        f"Pantry Hub\n\n{title}\n\n{body_text}{cta_text}"
        f"\n\nQuestions? Reply to this email or write {CONTACT_EMAIL}."
        f"\nwww.mypantryhub.com"
    )
    return html, text


def send_welcome(user_id: str, email: Optional[str], name: Optional[str] = None) -> dict[str, Any]:
    greeting = f"Hi {_html_escape(name)}," if name else "Hi,"
    greeting_text = f"Hi {name}," if name else "Hi,"
    url = f"{_app_url()}/dashboard/"
    body_html = f"""
      <p style="margin:0 0 16px 0;">{greeting}</p>
      <p style="margin:0 0 16px 0;">Welcome to Pantry Hub. Here is a simple way to get started:</p>
      <p style="margin:0 0 8px 0;">1. Open Scan Barcode or Quick Scan and add what's in the cupboard.</p>
      <p style="margin:0 0 8px 0;">2. Build a shopping list from what you're low on.</p>
      <p style="margin:0 0 16px 0;">3. Optional: snap a receipt later. The Free plan includes 5 AI receipt scans per month.</p>
    """
    body_text = (
        f"{greeting_text}\n\nWelcome to Pantry Hub. Here is a simple way to get started:\n\n"
        "1. Open Scan Barcode or Quick Scan and add what's in the cupboard.\n"
        "2. Build a shopping list from what you're low on.\n"
        "3. Optional: snap a receipt later. The Free plan includes 5 AI receipt scans per month."
    )
    html, text = _wrap(
        title="Welcome to Pantry Hub",
        preheader="Scan your first item and start a shopping list.",
        body_html=body_html,
        body_text=body_text,
        cta_label="Open your pantry",
        cta_url=url,
    )
    return send_email(
        to=email,
        subject="Welcome to Pantry Hub — scan your first item",
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
    pretty_end = _format_period_end(period_end)
    end_html = f" Your access continues through {_html_escape(pretty_end)}." if pretty_end else ""
    end_text = f" Your access continues through {pretty_end}." if pretty_end else ""
    portal = f"{_app_url()}/dashboard/account/"
    pantry = f"{_app_url()}/dashboard/"
    if is_free_invoice or amount_cents == 0:
        subject = f"Your Pantry Hub {plan} plan is active"
        lead = f"Your {plan} plan is now active.{end_text}"
        lead_html = f"Your {_html_escape(plan)} plan is now active.{end_html}"
        preheader = f"Your {plan} plan is active" + (f" through {pretty_end}." if pretty_end else ".")
    else:
        subject = f"Payment received for your Pantry Hub {plan} plan"
        lead = f"We received your payment of {amount} for Pantry Hub {plan}.{end_text}"
        lead_html = (
            f"We received your payment of {_html_escape(amount)} for Pantry Hub {_html_escape(plan)}.{end_html}"
        )
        preheader = f"Payment of {amount} received for your {plan} plan."
    features = _plan_features(tier)
    feature_heading = f"What's included with {plan}"
    body_html = f"""
      <p style="margin:0 0 16px 0;">{lead_html}</p>
      <p style="margin:0 0 8px 0;font-weight:700;">{_html_escape(feature_heading)}</p>
      {_feature_list_html(features)}
      <p style="margin:16px 0 0 0;font-size:14px;color:{COLOR_MUTED};">You can also <a href="{_html_escape(portal)}" style="color:{COLOR_TEXT};text-decoration:underline;">manage billing</a> from your account page.</p>
    """
    feature_text = "\n".join(f"- {item}" for item in features)
    body_text = f"{lead}\n\n{feature_heading}:\n{feature_text}\n\nManage billing: {portal}"
    html, text = _wrap(
        title=subject,
        preheader=preheader,
        body_html=body_html,
        body_text=body_text,
        cta_label="Go to your pantry",
        cta_url=pantry,
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
    body_html = f"""
      <p style="margin:0 0 12px 0;"><span style="display:inline-block;background-color:{COLOR_ACCENT};color:{COLOR_TEXT};font-size:12px;font-weight:700;letter-spacing:0.02em;padding:4px 8px;border-radius:4px;">Action needed</span></p>
      <p style="margin:0 0 16px 0;">A payment of {_html_escape(amount)} for your Pantry Hub subscription did not go through. Please update your card so your plan stays active.</p>
    """
    body_text = (
        f"A payment of {amount} for your Pantry Hub subscription did not go through. "
        "Please update your card so your plan stays active."
    )
    html, text = _wrap(
        title="We couldn't process your Pantry Hub payment",
        preheader="Update your payment method so your plan stays active.",
        body_html=body_html,
        body_text=body_text,
        cta_label="Update payment method",
        cta_url=portal,
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


def send_renewal_reminder(
    *,
    user_id: str,
    email: Optional[str],
    subscription_id: str,
    renewal_date: Optional[str],
    amount_cents: int,
    currency: str = "usd",
    tier: Optional[str] = None,
    interval: Optional[str] = None,
) -> dict[str, Any]:
    """PP-136: heads-up before the first full-price renewal after a promotion.

    Never calls the promotion a trial. Amount and date come from Stripe's
    upcoming invoice and subscription, not from the price list.
    """
    tier_key = (tier or "").strip().lower()
    plan = {"pro": "Pro", "family": "Family"}.get(tier_key, "Pantry Hub")
    cur = (currency or "usd").upper()
    amount = f"${(amount_cents or 0) / 100:.2f}" if cur == "USD" else f"{(amount_cents or 0) / 100:.2f} {cur}"
    per = {"month": "/month", "year": "/year"}.get((interval or "").strip().lower(), "")
    pretty_date = _format_period_end(renewal_date) or "your next billing date"
    account = f"{_app_url()}/dashboard/account/"
    plan_label = f"{plan} plan" if plan != "Pantry Hub" else "Pantry Hub plan"
    first = f"Your promotional price ends soon. On {pretty_date}, your {plan_label} renews at {amount}{per} on the card you have on file."
    second = "You don't need to do anything to keep your plan. To change or cancel before then, manage your billing."
    body_html = f"""
      <p style="margin:0 0 16px 0;">{_html_escape(first)}</p>
      <p style="margin:0 0 16px 0;">{_html_escape(second)}</p>
    """
    body_text = f"{first}\n\n{second}"
    html, text = _wrap(
        title=f"Your {plan_label} renews on {pretty_date}",
        preheader=f"Your plan renews at {amount}{per} on {pretty_date}.",
        body_html=body_html,
        body_text=body_text,
        cta_label="Manage billing",
        cta_url=account,
    )
    return send_email(
        to=email,
        subject=f"Your {plan_label} renews at {amount}{per} on {pretty_date}",
        html=html,
        text=text,
        template="renewal_reminder",
        idempotency_key=f"renewal.reminder:{subscription_id}:{renewal_date or 'unknown'}",
        user_id=user_id,
    )


def send_cancellation_scheduled(
    *,
    user_id: str,
    email: Optional[str],
    subscription_id: str,
    period_end: Optional[str] = None,
    tier: Optional[str] = None,
) -> dict[str, Any]:
    # Only name the plan when the caller knows it; never guess Pro for a Family user.
    tier_key = (tier or "").strip().lower()
    plan = {"pro": "Pro", "family": "Family"}.get(tier_key)
    subject_access = f"Your {plan} access" if plan else "Your access"
    pretty_end = _format_period_end(period_end)
    if pretty_end:
        access_line = f"{subject_access} continues through {pretty_end}."
        access_html = f"{_html_escape(subject_access)} continues through {_html_escape(pretty_end)}."
    else:
        access_line = f"{subject_access} continues until the end of your current billing period."
        access_html = f"{_html_escape(subject_access)} continues until the end of your current billing period."
    preheader = access_line
    account = f"{_app_url()}/dashboard/account/"
    body_html = f"""
      <p style="margin:0 0 16px 0;">Your cancellation is scheduled. {access_html}</p>
      <p style="margin:0 0 16px 0;">If you change your mind, you can keep your plan anytime before your billing period ends.</p>
    """
    body_text = (
        f"Your cancellation is scheduled. {access_line}\n\n"
        "If you change your mind, you can keep your plan anytime before your billing period ends."
    )
    html, text = _wrap(
        title="Your Pantry Hub cancellation is scheduled",
        preheader=preheader,
        body_html=body_html,
        body_text=body_text,
        cta_label="Keep my plan",
        cta_url=account,
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
    body_html = f"""
      <p style="margin:0 0 16px 0;">Your paid plan has ended. You're now on the Free plan.</p>
      <p style="margin:0 0 8px 0;font-weight:700;">What's included with Free</p>
      {_feature_list_html(FREE_FEATURES)}
    """
    feature_text = "\n".join(f"- {item}" for item in FREE_FEATURES)
    body_text = (
        "Your paid plan has ended. You're now on the Free plan.\n\n"
        f"What's included with Free:\n{feature_text}"
    )
    html, text = _wrap(
        title="Your Pantry Hub subscription has ended",
        preheader="You're now on the Free plan. You can resubscribe any time.",
        body_html=body_html,
        body_text=body_text,
        cta_label="Resubscribe",
        cta_url=pricing,
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
