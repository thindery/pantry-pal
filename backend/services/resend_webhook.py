"""Resend webhook signature verification and event processing (PP-124)."""

from __future__ import annotations

import base64
from datetime import datetime, timezone
import hashlib
import hmac
import logging
import math
import os
import time
from typing import Any, Mapping, Optional
import uuid

from psycopg2.extras import Json

from database.db import db_connection

logger = logging.getLogger(__name__)


class SvixVerificationError(ValueError):
    """Raised when Svix signature or timestamp verification fails."""
    pass


def _get_header(headers: Any, key: str) -> Optional[str]:
    """Retrieve header value case-insensitively from dict or Mapping."""
    if not headers:
        return None
    if hasattr(headers, "get"):
        val = headers.get(key)
        if val is not None:
            return str(val)
        val = headers.get(key.lower())
        if val is not None:
            return str(val)
        val = headers.get(key.upper())
        if val is not None:
            return str(val)
    if isinstance(headers, Mapping):
        for k, v in headers.items():
            if str(k).lower() == key.lower():
                return str(v)
    return None


def verify_svix(
    payload: bytes | str,
    headers: Any,
    secret: Optional[str] = None,
) -> None:
    """Verify Svix webhook signature using stdlib hmac/hashlib/base64 only.

    Raises SvixVerificationError on any verification failure.
    """
    signing_secret = secret if secret is not None else os.getenv("RESEND_WEBHOOK_SECRET", "")
    signing_secret = (signing_secret or "").strip()
    if not signing_secret:
        raise SvixVerificationError("Webhook secret not configured")

    svix_id = _get_header(headers, "svix-id")
    svix_timestamp = _get_header(headers, "svix-timestamp")
    svix_signature = _get_header(headers, "svix-signature")

    if not svix_id or not svix_timestamp or not svix_signature:
        raise SvixVerificationError("Missing required svix headers")

    # Reject timestamps more than 5 minutes (300 seconds) from now
    try:
        ts = float(svix_timestamp)
    except (ValueError, TypeError) as exc:
        raise SvixVerificationError("Invalid svix timestamp") from exc

    now = time.time()
    if not math.isfinite(ts) or abs(now - ts) > 300:
        raise SvixVerificationError("Timestamp out of tolerance (>5 minutes)")

    # Secret format: "whsec_<base64>" -> base64 decode part after "whsec_"
    if signing_secret.startswith("whsec_"):
        raw_b64 = signing_secret[len("whsec_"):]
    else:
        raw_b64 = signing_secret

    try:
        secret_bytes = base64.b64decode(raw_b64, validate=True)
        if not secret_bytes:
            raise ValueError("Empty signing key")
    except Exception as exc:
        raise SvixVerificationError("Invalid base64 secret") from exc

    body_bytes = payload if isinstance(payload, bytes) else payload.encode("utf-8")
    to_sign = f"{svix_id}.{svix_timestamp}.".encode("utf-8") + body_bytes
    expected_sig = base64.b64encode(
        hmac.new(secret_bytes, to_sign, hashlib.sha256).digest()
    ).decode("utf-8")

    # Header svix-signature is a space-separated list of "v1,<sig>"
    signatures = svix_signature.split()
    matched = False
    for item in signatures:
        if item.startswith("v1,"):
            candidate = item[len("v1,"):]
            if hmac.compare_digest(expected_sig, candidate):
                matched = True
                break

    if not matched:
        raise SvixVerificationError("Signature mismatch")


def _redact_payload(event: dict[str, Any]) -> dict[str, Any]:
    """Redact payload to never store email bodies/html/text.

    Keeps type, created_at, email_id, subject, tags, bounce/complaint type only.
    """
    data = event.get("data") if isinstance(event.get("data"), dict) else {}
    redacted_data: dict[str, Any] = {}
    for key in ("email_id", "subject", "tags", "created_at", "bounce_type", "type"):
        if key in data and data[key] is not None:
            redacted_data[key] = data[key]
    if isinstance(data.get("bounce"), dict):
        redacted_data["bounce"] = {
            k: v for k, v in data["bounce"].items() if k == "type"
        }
    if isinstance(data.get("complaint"), dict):
        redacted_data["complaint"] = {
            k: v for k, v in data["complaint"].items() if k in ("type", "complaint_feedback_type")
        }

    return {
        "type": event.get("type"),
        "created_at": event.get("created_at"),
        "data": redacted_data,
    }


def _is_permanent_bounce(data: dict[str, Any]) -> bool:
    bounce_type = (
        data.get("bounce_type")
        or data.get("type")
        or (data.get("bounce", {}).get("type") if isinstance(data.get("bounce"), dict) else None)
        or ""
    )
    if isinstance(bounce_type, str) and bounce_type.strip().lower() in (
        "permanent",
        "hard",
        "hard_bounce",
    ):
        return True
    return False


def _extract_recipient(data: dict[str, Any], fallback: Optional[str] = None) -> Optional[str]:
    raw_to = data.get("to")
    if isinstance(raw_to, list) and raw_to:
        first = str(raw_to[0]).strip().lower()
        if first:
            return first
    elif isinstance(raw_to, str) and raw_to.strip():
        return raw_to.strip().lower()
    if fallback and fallback.strip():
        return fallback.strip().lower()
    return None


def _parse_timestamp(ts_val: Any) -> Optional[datetime]:
    if not ts_val:
        return None
    if isinstance(ts_val, datetime):
        return ts_val
    if isinstance(ts_val, (int, float)):
        return datetime.fromtimestamp(ts_val, tz=timezone.utc)
    if isinstance(ts_val, str):
        try:
            return datetime.fromisoformat(ts_val.replace("Z", "+00:00"))
        except Exception:
            return None
    return None


def process_event(event: dict[str, Any], event_id: Optional[str] = None) -> dict[str, Any]:
    """Process a verified Resend webhook event idempotently."""
    eid = event_id or event.get("id") or str(uuid.uuid4())
    event_type = str(event.get("type") or "unknown")
    data = event.get("data") if isinstance(event.get("data"), dict) else {}
    resend_id = data.get("email_id") or event.get("email_id")
    occurred_at = _parse_timestamp(event.get("created_at") or data.get("created_at"))
    redacted = _redact_payload(event)

    with db_connection() as conn:
        with conn.cursor() as cur:
            email_send_id: Optional[str] = None
            to_email: Optional[str] = None

            if resend_id:
                cur.execute(
                    "SELECT id, status, opened_at, clicked_at, to_email FROM email_sends WHERE resend_id = %s",
                    (resend_id,),
                )
                send_row = cur.fetchone()
                if send_row:
                    if isinstance(send_row, dict):
                        email_send_id = send_row.get("id")
                        to_email = send_row.get("to_email")
                    else:
                        email_send_id = send_row[0]
                        to_email = send_row[4]

            # Idempotent insert into email_events
            cur.execute(
                """
                INSERT INTO email_events (id, resend_id, email_send_id, event_type, occurred_at, created_at, payload)
                VALUES (%s, %s, %s, %s, %s, NOW(), %s)
                ON CONFLICT (id) DO NOTHING
                RETURNING id
                """,
                (eid, resend_id, email_send_id, event_type, occurred_at, Json(redacted)),
            )
            inserted = cur.fetchone()
            if not inserted:
                logger.info("Duplicate Resend webhook event %s ignored", eid)
                return {"duplicate": True}

            recipient = _extract_recipient(data, to_email)
            event_ts = occurred_at or datetime.now(timezone.utc)

            if event_type == "email.sent":
                if email_send_id:
                    cur.execute(
                        """
                        UPDATE email_sends
                        SET status = 'sent', updated_at = NOW()
                        WHERE id = %s AND status IN ('pending', 'failed')
                        """,
                        (email_send_id,),
                    )
            elif event_type == "email.delivered":
                if email_send_id:
                    cur.execute(
                        """
                        UPDATE email_sends
                        SET status = 'delivered', updated_at = NOW()
                        WHERE id = %s AND (status IS NULL OR status NOT IN ('bounced', 'complained'))
                        """,
                        (email_send_id,),
                    )
            elif event_type == "email.bounced":
                if email_send_id:
                    cur.execute(
                        """
                        UPDATE email_sends
                        SET status = 'bounced', updated_at = NOW()
                        WHERE id = %s AND status <> 'complained'
                        """,
                        (email_send_id,),
                    )
                if _is_permanent_bounce(data) and recipient:
                    cur.execute(
                        """
                        INSERT INTO email_suppressions (email, reason, source_event_id, created_at, updated_at)
                        VALUES (%s, 'bounced', %s, NOW(), NOW())
                        ON CONFLICT (email) DO UPDATE
                        SET reason = CASE WHEN email_suppressions.reason = 'complained'
                                          THEN 'complained' ELSE EXCLUDED.reason END,
                            source_event_id = EXCLUDED.source_event_id,
                            updated_at = NOW()
                        """,
                        (recipient, eid),
                    )
            elif event_type == "email.complained":
                if email_send_id:
                    cur.execute(
                        """
                        UPDATE email_sends
                        SET status = 'complained', updated_at = NOW()
                        WHERE id = %s
                        """,
                        (email_send_id,),
                    )
                if recipient:
                    cur.execute(
                        """
                        INSERT INTO email_suppressions (email, reason, source_event_id, created_at, updated_at)
                        VALUES (%s, 'complained', %s, NOW(), NOW())
                        ON CONFLICT (email) DO UPDATE
                        SET reason = EXCLUDED.reason,
                            source_event_id = EXCLUDED.source_event_id,
                            updated_at = NOW()
                        """,
                        (recipient, eid),
                    )
            elif event_type == "email.opened":
                if email_send_id:
                    cur.execute(
                        """
                        UPDATE email_sends
                        SET opened_at = COALESCE(opened_at, %s), updated_at = NOW()
                        WHERE id = %s
                        """,
                        (event_ts, email_send_id),
                    )
            elif event_type == "email.clicked":
                if email_send_id:
                    cur.execute(
                        """
                        UPDATE email_sends
                        SET clicked_at = COALESCE(clicked_at, %s),
                            opened_at = COALESCE(opened_at, %s),
                            updated_at = NOW()
                        WHERE id = %s
                        """,
                        (event_ts, event_ts, email_send_id),
                    )
            elif event_type == "email.failed":
                if email_send_id:
                    raw_err = data.get("error") or data.get("message") or "Delivery failed"
                    short_err = str(raw_err)[:500]
                    cur.execute(
                        """
                        UPDATE email_sends
                        SET status = 'failed',
                            error_message = COALESCE(%s, error_message),
                            updated_at = NOW()
                        WHERE id = %s AND status IN ('pending', 'sent')
                        """,
                        (short_err, email_send_id),
                    )
            # email.delivery_delayed, email.suppressed, and unknown event types are recorded only

    return {"duplicate": False, "received": True}
