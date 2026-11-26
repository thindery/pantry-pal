"""PP-194..PP-196: journey engine for recipe subscribers and new app users.

Everything funnels through ``email_service.send_email`` and so through ``email_gate``: while
``EMAIL_JOURNEYS_ENABLED`` is off nothing but ``EMAIL_JOURNEYS_TEST_RECIPIENTS`` can be mailed.

State lives in our own Postgres (``email_journey_state``) so every step is visible in the admin
dashboard, unlike a hosted automation. Each step is sent with the idempotency key
``journey:<journey>:<step>:<subject_id>``, so a crash or a double cron run cannot double-send.
"""

from __future__ import annotations

import logging
import os
import re
import secrets
import uuid
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Any, Callable, Optional

from backend.services import email_gate, email_service, journey_emails
from database.db import db_connection

logger = logging.getLogger(__name__)

BOT_UA = re.compile(r"bot|crawl|spider|preview|scanner|monitor|curl|python-requests|headless|barracuda|proofpoint|mimecast", re.I)
STALE_AFTER = timedelta(days=7)
BATCH = 200


@dataclass(frozen=True)
class Step:
    key: str
    offset: timedelta  # from the journey anchor (confirm time / signup time)
    template: str
    render: str  # name of a journey_emails.render_* function
    skip_if: Optional[str] = None  # name of a condition in CONDITIONS


JOURNEYS: dict[str, dict[str, Any]] = {
    "recipe_welcome": {
        "subject_type": "subscriber",
        "category": "marketing",
        "list": "recipes",
        "steps": [
            Step("welcome", timedelta(0), "recipe_welcome", "render_recipe_welcome"),
            Step("cupboard_dinners", timedelta(days=3), "recipe_cupboard_dinners", "render_recipe_cupboard_dinners"),
            Step("know_your_pantry", timedelta(days=7), "recipe_know_your_pantry", "render_recipe_know_your_pantry"),
        ],
    },
    "onboarding": {
        "subject_type": "user",
        "category": "lifecycle",
        "list": "onboarding",
        "steps": [
            Step("scan_first_item", timedelta(days=1), "onboarding_scan_first_item", "render_onboarding_scan", "has_items"),
            Step("recipes", timedelta(days=3), "onboarding_recipes", "render_onboarding_recipes", "has_saved_recipe"),
            Step("pro", timedelta(days=7), "onboarding_pro", "render_onboarding_pro", "not_free_tier"),
        ],
    },
}


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _row_get(row: Any, key: str, idx: int = 0) -> Any:
    return row[key] if isinstance(row, dict) else row[idx]


# ---------------------------------------------------------------- list history

def log_list_event(cur, list_name: str, event: str, subject_ref: Optional[str], source: Optional[str] = None) -> None:
    cur.execute(
        "INSERT INTO email_list_events (list, event, subject_ref, source) VALUES (%s, %s, %s, %s)",
        (list_name, event, subject_ref, source),
    )


# ---------------------------------------------------------------- recipe subscribers

def unsubscribe_url_for(token: str, list_name: str) -> str:
    return f"{email_service._app_url()}/api/public/email/unsubscribe?token={token}&list={list_name}"


def confirmation_will_send() -> bool:
    """True when a confirmation email is actually going out, so the UI can say so honestly."""
    return email_gate.mode() == "on"


def send_confirmation(subscriber_id: str) -> dict[str, Any]:
    """Send (or skip) the double opt-in email. Safe to call repeatedly."""
    with db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT id::text AS id, email, status, confirm_token FROM recipe_newsletter_subscribers WHERE id = %s",
                (subscriber_id,),
            )
            row = cur.fetchone()
    if not row or row["status"] != "pending":
        return {"skipped": True, "reason": "not_pending"}
    send_id = str(uuid.uuid4())
    confirm_url = f"{email_service._app_url()}/api/public/email/confirm?token={row['confirm_token']}"
    rendered = journey_emails.render_confirm(send_id=send_id, confirm_url=confirm_url)
    # One confirmation per day at most, so a re-submit cannot be used to spam an address.
    day = _now().strftime("%Y%m%d")
    result = email_service.send_email(
        to=row["email"],
        subject=rendered.subject,
        html=rendered.html,
        text=rendered.text,
        template="recipe_confirm",
        idempotency_key=f"journey:recipe_confirm:{row['id']}:{day}",
        category="confirmation",
        journey="recipe_welcome",
        journey_step="confirm",
        send_id=send_id,
    )
    if not result.get("skipped"):
        with db_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "UPDATE recipe_newsletter_subscribers SET confirmation_sent_at = now() WHERE id = %s",
                    (subscriber_id,),
                )
    else:
        logger.info("Recipe confirmation not sent (%s)", result.get("reason"))
    return result


def confirm_subscriber(token: str) -> Optional[str]:
    """Flip pending -> confirmed and start the welcome journey. Returns the subscriber id or None."""
    if not token or len(token) > 200:
        return None
    with db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                UPDATE recipe_newsletter_subscribers
                SET status = 'confirmed',
                    confirmed_at = COALESCE(confirmed_at, now()),
                    unsubscribed_at = NULL,
                    updated_at = now()
                WHERE confirm_token = %s AND status IN ('pending', 'confirmed')
                RETURNING id::text AS id, email, status, source
                """,
                (token,),
            )
            row = cur.fetchone()
            if not row:
                return None
            sid, email = row["id"], row["email"]
            cur.execute(
                "SELECT 1 FROM email_list_events WHERE list = 'recipes' AND event = 'confirmed' AND subject_ref = %s",
                (sid,),
            )
            if not cur.fetchone():
                log_list_event(cur, "recipes", "confirmed", sid, row.get("source"))
    enroll("recipe_welcome", "subscriber", sid, email)
    try:
        run_due(only=("recipe_welcome", sid))
    except Exception:  # best effort; the cron picks it up
        logger.exception("Inline welcome send failed for subscriber %s", sid)
    return sid


def unsubscribe_recipes(token: str) -> bool:
    if not token or len(token) > 200:
        return False
    with db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT id::text AS id, status, source FROM recipe_newsletter_subscribers WHERE unsubscribe_token = %s FOR UPDATE",
                (token,),
            )
            row = cur.fetchone()
            if not row:
                return False
            sid = row["id"]
            if row["status"] != "unsubscribed":
                cur.execute(
                    "UPDATE recipe_newsletter_subscribers SET status = 'unsubscribed', "
                    "unsubscribed_at = now(), updated_at = now() WHERE id::text = %s",
                    (sid,),
                )
                log_list_event(cur, "recipes", "unsubscribed", sid, row.get("source"))
            cur.execute(
                "UPDATE email_journey_state SET status = 'stopped', stopped_reason = 'unsubscribed', updated_at = now() "
                "WHERE subject_id = %s AND status = 'active'",
                (sid,),
            )
    return True


def resubscribe_recipes(token: str) -> bool:
    """Undo an accidental unsubscribe. The address was confirmed before, so it goes back to confirmed."""
    if not token or len(token) > 200:
        return False
    with db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                UPDATE recipe_newsletter_subscribers
                SET status = CASE WHEN confirmed_at IS NOT NULL THEN 'confirmed' ELSE 'pending' END,
                    unsubscribed_at = NULL, updated_at = now()
                WHERE unsubscribe_token = %s AND status = 'unsubscribed'
                RETURNING id::text AS id, source
                """,
                (token,),
            )
            row = cur.fetchone()
            if not row:
                return False
            log_list_event(cur, "recipes", "resubscribed", row["id"], row.get("source"))
    return True


def unsubscribe_onboarding(token: str) -> bool:
    if not token or len(token) > 200:
        return False
    with db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                UPDATE email_preferences SET onboarding_tips = FALSE, updated_at = now()
                WHERE unsubscribe_token = %s RETURNING user_id
                """,
                (token,),
            )
            row = cur.fetchone()
            if not row:
                return False
            log_list_event(cur, "onboarding", "unsubscribed", row["user_id"], "email_link")
            cur.execute(
                "UPDATE email_journey_state SET status = 'stopped', stopped_reason = 'unsubscribed', updated_at = now() "
                "WHERE subject_id = %s AND journey = 'onboarding' AND status = 'active'",
                (row["user_id"],),
            )
    return True


def resubscribe_onboarding(token: str) -> bool:
    if not token or len(token) > 200:
        return False
    with db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "UPDATE email_preferences SET onboarding_tips = TRUE, updated_at = now() WHERE unsubscribe_token = %s RETURNING user_id",
                (token,),
            )
            row = cur.fetchone()
            if not row:
                return False
            log_list_event(cur, "onboarding", "resubscribed", row["user_id"], "email_link")
    return True


def record_click(send_id: str, label: str, path: str, *, is_bot: bool = False) -> bool:
    """Count a click on a tracked link. Ignored unless it belongs to a real send."""
    if not send_id or len(send_id) > 64 or not label or len(label) > 120:
        return False
    with db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO email_clicks (email_send_id, link_label, path, is_bot)
                SELECT id, %s, %s, %s FROM email_sends WHERE id = %s
                RETURNING email_send_id
                """,
                (label, path[:300], is_bot, send_id),
            )
            if cur.fetchone() is None:
                return False
            if not is_bot:
                cur.execute(
                    "UPDATE email_sends SET clicked_at = COALESCE(clicked_at, now()), updated_at = now() WHERE id = %s",
                    (send_id,),
                )
    return True


# ---------------------------------------------------------------- state

def enroll(journey: str, subject_type: str, subject_id: str, email: str, anchor_at: Optional[datetime] = None) -> bool:
    cfg = JOURNEYS[journey]
    anchor = anchor_at or _now()
    first = cfg["steps"][0]
    with db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO email_journey_state (journey, subject_type, subject_id, email, anchor_at, next_run_at)
                VALUES (%s, %s, %s, %s, %s, %s)
                ON CONFLICT (journey, subject_id) DO NOTHING
                RETURNING id
                """,
                (journey, subject_type, subject_id, email.strip().lower(), anchor, anchor + first.offset),
            )
            return cur.fetchone() is not None


def _ensure_unsubscribe_token(user_id: str) -> tuple[str, bool]:
    with db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "INSERT INTO email_preferences (user_id, unsubscribe_token) VALUES (%s, %s) ON CONFLICT (user_id) DO NOTHING",
                (user_id, secrets.token_urlsafe(32)),
            )
            cur.execute("SELECT unsubscribe_token, onboarding_tips FROM email_preferences WHERE user_id = %s", (user_id,))
            row = cur.fetchone()
    return row["unsubscribe_token"], bool(row["onboarding_tips"])


# ---------------------------------------------------------------- skip conditions (users)

def _count(sql: str, params: tuple) -> int:
    with db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(sql, params)
            row = cur.fetchone()
    return int(_row_get(row, "n"))


def cond_has_items(user_id: str) -> bool:
    return _count("SELECT COUNT(*) AS n FROM pantry_items WHERE user_id = %s", (user_id,)) > 0


def cond_has_saved_recipe(user_id: str) -> bool:
    return _count("SELECT COUNT(*) AS n FROM recipes WHERE user_id = %s", (user_id,)) > 0


def cond_not_free_tier(user_id: str) -> bool:
    return (
        _count(
            "SELECT COUNT(*) AS n FROM user_subscriptions WHERE user_id = %s AND tier <> 'free' "
            "AND subscription_status IN ('active', 'trialing', 'past_due')",
            (user_id,),
        )
        > 0
    )


CONDITIONS: dict[str, Callable[[str], bool]] = {
    "has_items": cond_has_items,
    "has_saved_recipe": cond_has_saved_recipe,
    "not_free_tier": cond_not_free_tier,
}


# ---------------------------------------------------------------- enrollment sweep (users)

def onboarding_since() -> Optional[datetime]:
    """Only accounts created at or after this instant are ever enrolled. Unset means nobody."""
    raw = (os.getenv("EMAIL_ONBOARDING_SINCE") or "").strip()
    if not raw:
        return None
    try:
        parsed = datetime.fromisoformat(raw.replace("Z", "+00:00"))
    except ValueError:
        logger.error("EMAIL_ONBOARDING_SINCE is not an ISO timestamp; onboarding enrollment is off")
        return None
    return parsed if parsed.tzinfo else parsed.replace(tzinfo=timezone.utc)


def enroll_new_users() -> int:
    since = onboarding_since()
    if since is None:
        return 0
    with db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT u.id::text AS id, u.email, u.created_at
                FROM users u
                WHERE u.created_at >= %s AND u.email IS NOT NULL
                  AND NOT EXISTS (SELECT 1 FROM email_journey_state s WHERE s.journey = 'onboarding' AND s.subject_id = u.id::text)
                ORDER BY u.created_at ASC
                LIMIT %s
                """,
                (since, BATCH),
            )
            rows = list(cur.fetchall())
    return sum(1 for r in rows if enroll("onboarding", "user", r["id"], r["email"], r["created_at"]))


# ---------------------------------------------------------------- runner

def _advance(state_id: str, journey: str, step_index: int, anchor: datetime, *, sent: bool) -> None:
    steps = JOURNEYS[journey]["steps"]
    nxt = step_index + 1
    with db_connection() as conn:
        with conn.cursor() as cur:
            if nxt >= len(steps):
                cur.execute(
                    "UPDATE email_journey_state SET status = 'completed', next_step = %s, "
                    "last_sent_at = CASE WHEN %s THEN now() ELSE last_sent_at END, updated_at = now() WHERE id = %s",
                    (nxt, sent, state_id),
                )
            else:
                cur.execute(
                    "UPDATE email_journey_state SET next_step = %s, next_run_at = %s, "
                    "last_sent_at = CASE WHEN %s THEN now() ELSE last_sent_at END, updated_at = now() WHERE id = %s",
                    (nxt, anchor + steps[nxt].offset, sent, state_id),
                )


def _stop(state_id: str, reason: str) -> None:
    with db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "UPDATE email_journey_state SET status = 'stopped', stopped_reason = %s, updated_at = now() WHERE id = %s",
                (reason, state_id),
            )


def _subscriber_context(state: dict[str, Any]) -> Optional[dict[str, Any]]:
    with db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT status, unsubscribe_token, email FROM recipe_newsletter_subscribers WHERE id::text = %s",
                (state["subject_id"],),
            )
            row = cur.fetchone()
    if not row or row["status"] != "confirmed":
        return None
    return {"token": row["unsubscribe_token"], "email": row["email"], "name": None, "user_id": None}


def _user_context(state: dict[str, Any]) -> Optional[dict[str, Any]]:
    with db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT name, email FROM users WHERE id::text = %s", (state["subject_id"],))
            row = cur.fetchone()
    if not row or not row["email"]:
        return None
    token, on = _ensure_unsubscribe_token(state["subject_id"])
    if not on:
        return None
    return {"token": token, "email": row["email"], "name": (row["name"] or "").split(" ")[0] or None, "user_id": state["subject_id"]}


def run_due(*, only: Optional[tuple[str, str]] = None, dry_run: bool = False) -> dict[str, int]:
    """Send every due step. Returns counters; never raises for one bad row."""
    stats = {"mode": email_gate.mode(), "due": 0, "sent": 0, "held": 0, "skipped": 0, "stopped": 0, "failed": 0}
    now = _now()
    sql = (
        "SELECT id::text AS id, journey, subject_type, subject_id, email, next_step, anchor_at, next_run_at "
        "FROM email_journey_state WHERE status = 'active' AND next_run_at <= %s"
    )
    params: list[Any] = [now]
    if only:
        sql += " AND journey = %s AND subject_id = %s"
        params += [only[0], only[1]]
    sql += " ORDER BY next_run_at ASC LIMIT %s"
    params.append(BATCH)
    with db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(sql, tuple(params))
            due = list(cur.fetchall())
    stats["due"] = len(due)
    for state in due:
        try:
            _run_one(state, now, stats, dry_run)
        except Exception:
            stats["failed"] += 1
            logger.exception("Journey step failed for %s/%s", state["journey"], state["subject_id"])
    return stats


def _run_one(state: dict[str, Any], now: datetime, stats: dict[str, int], dry_run: bool) -> None:
    journey = state["journey"]
    cfg = JOURNEYS[journey]
    steps: list[Step] = cfg["steps"]
    index = state["next_step"]
    if index >= len(steps):
        _stop(state["id"], "no_more_steps")
        return
    if now - state["next_run_at"] > STALE_AFTER:
        _stop(state["id"], "stale")
        stats["stopped"] += 1
        return
    step = steps[index]
    ctx = _subscriber_context(state) if state["subject_type"] == "subscriber" else _user_context(state)
    if ctx is None:
        _stop(state["id"], "no_longer_eligible")
        stats["stopped"] += 1
        return
    if email_service.is_suppressed(ctx["email"]):
        _stop(state["id"], "suppressed")
        stats["stopped"] += 1
        return
    if step.skip_if and CONDITIONS[step.skip_if](state["subject_id"]):
        if not dry_run:
            _advance(state["id"], journey, index, state["anchor_at"], sent=False)
        stats["skipped"] += 1
        return
    allowed, _why = email_gate.check(ctx["email"], cfg["category"])
    if not allowed:
        stats["held"] += 1  # stays due; nothing advances while the gate is closed
        return
    if dry_run:
        stats["sent"] += 1
        return
    send_id = str(uuid.uuid4())
    unsub = unsubscribe_url_for(ctx["token"], cfg["list"])
    kwargs: dict[str, Any] = {"send_id": send_id, "unsubscribe_url": unsub}
    if state["subject_type"] == "user":
        kwargs["name"] = ctx["name"]
    rendered = getattr(journey_emails, step.render)(**kwargs)
    result = email_service.send_email(
        to=ctx["email"],
        subject=rendered.subject,
        html=rendered.html,
        text=rendered.text,
        template=step.template,
        idempotency_key=f"journey:{journey}:{step.key}:{state['subject_id']}",
        user_id=ctx["user_id"],
        category=cfg["category"],
        journey=journey,
        journey_step=step.key,
        send_id=send_id,
        unsubscribe_url=unsub,
    )
    reason = result.get("reason")
    if result.get("skipped") and reason not in ("already_sent",):
        if reason == "send_failed":
            stats["failed"] += 1  # retried on the next run; the idempotency row is marked failed
        else:
            stats["held"] += 1
        return
    _advance(state["id"], journey, index, state["anchor_at"], sent=not result.get("skipped"))
    stats["sent"] += 1


def run(*, dry_run: bool = False) -> dict[str, int]:
    """Cron entry: enroll new users, retry missed confirmations, then send what is due."""
    stats = {"mode": email_gate.mode(), "enrolled_users": 0, "confirmations": 0}
    if email_gate.mode() == "off":
        stats["note"] = "journeys disabled"  # type: ignore[assignment]
        return stats
    if not dry_run:
        stats["enrolled_users"] = enroll_new_users()
        stats["confirmations"] = retry_confirmations()
    stats.update(run_due(dry_run=dry_run))
    return stats


def retry_confirmations(max_age_hours: int = 48) -> int:
    """Re-attempt confirmations that never went out (a failed send is not silent here). Never touches old backlog."""
    with db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT id::text AS id FROM recipe_newsletter_subscribers
                WHERE status = 'pending' AND confirmation_sent_at IS NULL
                  AND created_at > now() - make_interval(hours => %s)
                ORDER BY created_at ASC LIMIT %s
                """,
                (max_age_hours, BATCH),
            )
            ids = [r["id"] for r in cur.fetchall()]
    sent = 0
    for sid in ids:
        if not send_confirmation(sid).get("skipped"):
            sent += 1
    return sent
