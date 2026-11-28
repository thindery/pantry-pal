"""PP-248: free-plan limit emails ("45 of 50 items" and "you hit the free limit").

Off unless ``FREE_LIMIT_EMAILS_ENABLED`` is truthy, and every send still passes ``email_gate``
(lifecycle category: needs ``EMAIL_JOURNEYS_ENABLED`` and ``EMAIL_MAILING_ADDRESS``).

Rules (Tylor, 2026-11-27):
* Real free users only. Paid users, admin/internal/test accounts, anyone who turned off
  getting-started emails (``email_preferences.onboarding_tips``) and suppressed addresses are skipped.
* Forward-only: a user qualifies only if the item that crossed the threshold (the 45th or the
  50th pantry row by ``created_at``) was added at or after ``FREE_LIMIT_EMAILS_SINCE``. No backfill.
* Once per user per trigger: idempotency key ``free_limit:<trigger>:<user_id>``.
* A user already at 50 gets only the "limit" email, never both in one run.
"""

from __future__ import annotations

import logging
import os
import re
import uuid
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any, Optional

from backend.services import email_gate, email_journeys, email_service, first_month_offer
from backend.services import journey_emails as je
from database.db import db_connection

logger = logging.getLogger(__name__)

TRUTHY = {"1", "true", "yes", "on"}
FREE_ITEM_LIMIT = 50
NEAR_AT = 45
LIST = "onboarding"  # unsubscribes share the getting-started list (email_preferences.onboarding_tips)
BATCH = 200

INTERNAL_DOMAINS = {"mypantryhub.com", "peakcollective.us", "peakcollective.com", "example.com", "example.org", "test.com"}
INTERNAL_PATTERNS = re.compile(r"(thindery|\+test|^test[.@+_-]|^qa[.@+_-]|e2e|playwright|@test\.)", re.I)


@dataclass(frozen=True)
class Trigger:
    key: str
    nth_item: int  # the pantry row that crossed the threshold
    template: str


NEAR = Trigger("near_limit", NEAR_AT, "free_limit_near")
LIMIT = Trigger("hit_limit", FREE_ITEM_LIMIT, "free_limit_hit")


def enabled() -> bool:
    return (os.getenv("FREE_LIMIT_EMAILS_ENABLED") or "").strip().lower() in TRUTHY


def since() -> Optional[datetime]:
    raw = (os.getenv("FREE_LIMIT_EMAILS_SINCE") or "").strip()
    if not raw:
        return None
    try:
        parsed = datetime.fromisoformat(raw.replace("Z", "+00:00"))
    except ValueError:
        logger.error("FREE_LIMIT_EMAILS_SINCE is not an ISO timestamp; free-limit emails are off")
        return None
    return parsed if parsed.tzinfo else parsed.replace(tzinfo=timezone.utc)


def _csv_env(name: str) -> set[str]:
    return {p.strip().lower() for p in (os.getenv(name) or "").split(",") if p.strip()}


def is_internal(email: Optional[str], user_id: Optional[str]) -> bool:
    """Tylor's, admin, internal and test accounts never get these emails."""
    addr = (email or "").strip().lower()
    if not addr:
        return True
    if user_id and user_id.lower() in _csv_env("ADMIN_USER_IDS"):
        return True
    if addr in _csv_env("ADMIN_EMAILS") or addr in _csv_env("FREE_LIMIT_EMAILS_EXCLUDE"):
        return True
    if addr in {e for e in [(os.getenv("EMAIL_WEEKLY_TEST_TO") or "").strip().lower()] if e}:
        return True
    domain = addr.rsplit("@", 1)[-1]
    if domain in INTERNAL_DOMAINS or domain.endswith(".test") or domain.endswith(".invalid"):
        return True
    return bool(INTERNAL_PATTERNS.search(addr))


# ---------------------------------------------------------------- templates

def _offer_line() -> tuple[str, str]:
    if first_month_offer.is_enabled():
        line = "New subscribers pay $1 for the first month of Pro, then $4.99/month. Cancel anytime."
    else:
        line = "Pro is $4.99/month, or $39.99/year (save 33%). Cancel anytime."
    return je._p(line), line


def _render(trigger: Trigger, *, send_id: str, unsubscribe_url: str, name: Optional[str], count: int, test: bool = False) -> je.Rendered:
    g_html, g_text = je._greeting(name)
    offer_html, offer_text = _offer_line()
    if trigger is NEAR:
        left = max(0, FREE_ITEM_LIMIT - count)
        subject = f"You're at {count} of {FREE_ITEM_LIMIT} free pantry items"
        title = f"{left} items left on the free plan"
        preheader = "Pro removes the item limit."
        lead = (
            f"Your pantry has {count} items. The free plan holds {FREE_ITEM_LIMIT}, so you have {left} left. "
            "Upgrade to Pro and keep adding everything you buy, with no item limit."
        )
    else:
        subject = f"Your pantry hit the {FREE_ITEM_LIMIT}-item free limit"
        title = "Keep adding with Pro"
        preheader = "Your items are safe. Pro lets you add more."
        lead = (
            f"Your pantry reached the {FREE_ITEM_LIMIT}-item limit on the free plan, so new items can't be added. "
            "Everything you have is safe and you can still update it. Pro removes the limit."
        )
    benefits = [f for f in email_service.PRO_FEATURES if f != "Everything in Free"]
    items = "".join(f'<li style="margin:0 0 6px 0;">{je._html_escape(b)}</li>' for b in benefits)
    body_html = je._p(g_html) + je._p(je._html_escape(lead)) + f'<ul style="margin:0 0 16px 18px;padding:0;">{items}</ul>' + offer_html
    body_text = f"{g_text}\n\n{lead}\n\n" + "\n".join(f"- {b}" for b in benefits) + f"\n\n{offer_text}"
    footer_html, footer_text = je._footer(
        "You're getting this because your free Pantry Hub pantry is near or at its item limit. We send it once.",
        unsubscribe_url,
    )
    if test:
        subject = f"[TEST] {subject}"
        body_html = je._p("<strong>[TEST] Review copy. Real recipients never see this line.</strong>") + body_html
        body_text = "[TEST] Review copy. Real recipients never see this line.\n\n" + body_text
    html, text = je._wrap(
        title=title,
        preheader=preheader,
        body_html=body_html,
        body_text=body_text,
        cta_label="Upgrade to Pro",
        cta_url=je.tracked(send_id, f"free_limit_{trigger.key}", "/pricing/"),
        hero_html="",
        footer_html=footer_html,
        footer_text=footer_text,
    )
    return je.Rendered(subject, html, text)


def render_near(**kw: Any) -> je.Rendered:
    return _render(NEAR, **kw)


def render_limit(**kw: Any) -> je.Rendered:
    return _render(LIMIT, **kw)


# ---------------------------------------------------------------- selection

_CANDIDATES_SQL = """
SELECT u.id::text AS user_id, u.email, u.name, c.items, c.crossed_near_at, c.crossed_limit_at
FROM users u
JOIN (
    SELECT p.user_id,
           COUNT(*) AS items,
           (ARRAY_AGG(p.created_at ORDER BY p.created_at, p.id))[%s] AS crossed_near_at,
           (ARRAY_AGG(p.created_at ORDER BY p.created_at, p.id))[%s] AS crossed_limit_at
    FROM pantry_items p
    GROUP BY p.user_id
    HAVING COUNT(*) >= %s
) c ON c.user_id = u.id::text
LEFT JOIN user_subscriptions s ON s.user_id = u.id::text
LEFT JOIN email_preferences ep ON ep.user_id = u.id::text
WHERE u.email IS NOT NULL
  AND COALESCE(s.tier, 'free') = 'free'
  AND COALESCE(ep.onboarding_tips, TRUE)
ORDER BY u.id
LIMIT %s
"""


def _as_utc(value: Any) -> Optional[datetime]:
    if value is None:
        return None
    if isinstance(value, str):
        value = datetime.fromisoformat(value.replace("Z", "+00:00"))
    return value if value.tzinfo else value.replace(tzinfo=timezone.utc)


def _due_trigger(row: dict[str, Any], cutoff: datetime) -> Optional[Trigger]:
    items = int(row["items"])
    if items >= FREE_ITEM_LIMIT:
        crossed = _as_utc(row.get("crossed_limit_at"))
        return LIMIT if crossed and crossed >= cutoff else None
    crossed = _as_utc(row.get("crossed_near_at"))
    return NEAR if items >= NEAR_AT and crossed and crossed >= cutoff else None


def run(*, dry_run: bool = False) -> dict[str, Any]:
    stats: dict[str, Any] = {"enabled": enabled(), "gate": email_gate.mode(), "candidates": 0, "sent": 0,
                             "already_sent": 0, "skipped_internal": 0, "skipped_suppressed": 0,
                             "not_due": 0, "held": 0, "failed": 0}
    cutoff = since()
    if not enabled() or cutoff is None:
        stats["note"] = "free-limit emails off" if not enabled() else "FREE_LIMIT_EMAILS_SINCE unset"
        return stats
    with db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(_CANDIDATES_SQL, (NEAR_AT, FREE_ITEM_LIMIT, NEAR_AT, BATCH))
            rows = list(cur.fetchall())
    stats["candidates"] = len(rows)
    for row in rows:
        try:
            _one(row, cutoff, stats, dry_run)
        except Exception:
            stats["failed"] += 1
            logger.exception("free-limit email failed for one user")
    return stats


def _one(row: dict[str, Any], cutoff: datetime, stats: dict[str, Any], dry_run: bool) -> None:
    if is_internal(row["email"], row["user_id"]):
        stats["skipped_internal"] += 1
        return
    trigger = _due_trigger(row, cutoff)
    if trigger is None:
        stats["not_due"] += 1
        return
    if email_service.is_suppressed(row["email"]):
        stats["skipped_suppressed"] += 1
        return
    if dry_run:
        stats["sent"] += 1
        return
    token, on = email_journeys._ensure_unsubscribe_token(row["user_id"])
    if not on:
        return
    send_id = str(uuid.uuid4())
    unsub = email_journeys.unsubscribe_url_for(token, LIST)
    name = (row.get("name") or "").split(" ")[0] or None
    rendered = _render(trigger, send_id=send_id, unsubscribe_url=unsub, name=name, count=min(int(row["items"]), FREE_ITEM_LIMIT))
    result = email_service.send_email(
        to=row["email"],
        subject=rendered.subject,
        html=rendered.html,
        text=rendered.text,
        template=trigger.template,
        idempotency_key=f"free_limit:{trigger.key}:{row['user_id']}",
        user_id=row["user_id"],
        category="lifecycle",
        journey="free_limit",
        journey_step=trigger.key,
        send_id=send_id,
        unsubscribe_url=unsub,
    )
    reason = result.get("reason")
    if not result.get("skipped"):
        stats["sent"] += 1
    elif reason == "already_sent":
        stats["already_sent"] += 1
    elif reason == "send_failed":
        stats["failed"] += 1
    else:
        stats["held"] += 1


def send_test(to: str) -> list[dict[str, Any]]:
    """[TEST] copies of both emails to one address (review only; unsubscribe link is inert)."""
    out = []
    stamp = datetime.now(timezone.utc).strftime("%Y%m%d%H%M%S")
    for trigger, count in ((NEAR, NEAR_AT), (LIMIT, FREE_ITEM_LIMIT)):
        send_id = str(uuid.uuid4())
        rendered = _render(trigger, send_id=send_id, unsubscribe_url=f"{email_service._app_url()}/dashboard/account/",
                           name=None, count=count, test=True)
        out.append(email_service.send_email(
            to=to,
            subject=rendered.subject,
            html=rendered.html,
            text=rendered.text,
            template=f"{trigger.template}_test",
            idempotency_key=f"free_limit_test:{trigger.key}:{stamp}",
            category="lifecycle",
            journey="free_limit",
            journey_step=f"{trigger.key}_test",
            send_id=send_id,
        ))
    return out
