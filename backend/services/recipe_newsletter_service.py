"""PP-193: store recipe-newsletter signups. Does not send email."""

from __future__ import annotations

import logging
import re

from database.db import db_connection

logger = logging.getLogger(__name__)

EMAIL_RE = re.compile(r"^[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}$")
SLUG_RE = re.compile(r"^[a-z0-9]+(-[a-z0-9]+)*$")
ALLOWED_SOURCES = frozenset({"recipes_index", "recipe_page"})
MAX_EMAIL_LEN = 254
MAX_SLUG_LEN = 80


class InvalidNewsletterEmail(ValueError):
    """Raised when the submitted address is not a usable email."""


def normalize_email(raw: str | None) -> str:
    email = (raw or "").strip().lower()
    if not email or len(email) > MAX_EMAIL_LEN or not EMAIL_RE.fullmatch(email):
        raise InvalidNewsletterEmail("Enter a valid email address.")
    return email


def normalize_source(raw: str | None) -> str:
    source = (raw or "").strip() or "recipes_index"
    if source not in ALLOWED_SOURCES:
        return "recipes_index"
    return source


def normalize_slug(raw: str | None) -> str | None:
    slug = (raw or "").strip().lower()
    if not slug:
        return None
    if len(slug) > MAX_SLUG_LEN or not SLUG_RE.fullmatch(slug):
        return None
    return slug


def subscribe(*, email: str, source: str | None = None, recipe_slug: str | None = None) -> dict:
    """Store a signup and start double opt-in. Idempotent for an already-active address.

    New and re-subscribing addresses are ``pending`` until they click the confirmation link.
    An already confirmed address is left alone (and not emailed). Whether a confirmation email
    really goes out is decided by the PP-194 gate; ``confirmation_required`` tells the UI the truth.
    """
    from backend.services import email_journeys

    normalized = normalize_email(email)
    src = normalize_source(source)
    slug = normalize_slug(recipe_slug)
    if src == "recipes_index":
        slug = None
    with db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT id::text AS id, status FROM recipe_newsletter_subscribers WHERE email = %s FOR UPDATE",
                (normalized,),
            )
            existing = cur.fetchone()
            if existing is None:
                cur.execute(
                    """
                    INSERT INTO recipe_newsletter_subscribers (email, source, recipe_slug, consented_at, status)
                    VALUES (%s, %s, %s, now(), 'pending')
                    RETURNING id::text AS id
                    """,
                    (normalized, src, slug),
                )
                sid = cur.fetchone()["id"]
                email_journeys.log_list_event(cur, "recipes", "subscribed", sid, src)
                status = "pending"
            else:
                sid, status = existing["id"], existing["status"]
                if status == "unsubscribed":
                    cur.execute(
                        """
                        UPDATE recipe_newsletter_subscribers
                        SET status = 'pending', unsubscribed_at = NULL, consented_at = now(),
                            confirmation_sent_at = NULL, source = %s, recipe_slug = %s, updated_at = now()
                        WHERE id::text = %s
                        """,
                        (src, slug, sid),
                    )
                    email_journeys.log_list_event(cur, "recipes", "subscribed", sid, src)
                    status = "pending"
    if status == "pending":
        try:
            email_journeys.send_confirmation(sid)
        except Exception:
            logger.exception("Recipe confirmation send failed for subscriber %s", sid)
    return {
        "id": sid,
        "status": status,
        "confirmation_required": status == "pending" and email_journeys.confirmation_will_send(),
    }
