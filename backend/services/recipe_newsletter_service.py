"""PP-193: store recipe-newsletter signups. Does not send email."""

from __future__ import annotations

import re

from database.db import db_connection

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


def subscribe(*, email: str, source: str | None = None, recipe_slug: str | None = None) -> None:
    """Insert or resubscribe. Idempotent for an already-active address. Sends no mail."""
    normalized = normalize_email(email)
    src = normalize_source(source)
    slug = normalize_slug(recipe_slug)
    if src == "recipes_index":
        slug = None
    with db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO recipe_newsletter_subscribers (email, source, recipe_slug, consented_at)
                VALUES (%s, %s, %s, now())
                ON CONFLICT (email) DO UPDATE
                SET
                    source = EXCLUDED.source,
                    recipe_slug = EXCLUDED.recipe_slug,
                    consented_at = CASE
                        WHEN recipe_newsletter_subscribers.unsubscribed_at IS NOT NULL
                        THEN EXCLUDED.consented_at
                        ELSE recipe_newsletter_subscribers.consented_at
                    END,
                    unsubscribed_at = NULL,
                    updated_at = now()
                """,
                (normalized, src, slug),
            )
