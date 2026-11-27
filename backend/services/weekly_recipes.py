"""PP-235: weekly recipe newsletter on top of the PP-194..199 email system.

Flow:
1. ``build_issue`` (cron, Wednesday morning) picks 3 recipes and 1 tip, stores the issue as a ``draft``
   and emails a ``[TEST]`` copy to the owner only. Nothing reaches the list.
2. An admin presses "Approve & send" in the Marketing view (``approve_issue``), or, only when
   ``EMAIL_WEEKLY_AUTO_SEND`` is switched on, the issue is approved automatically after
   ``EMAIL_WEEKLY_AUTO_SEND_DELAY_HOURS`` (default 24) unless an admin skips it first.
3. ``process_sends`` (cron, every 15 minutes) sends approved issues to the audience. It is resumable
   and idempotent: one ``email_sends`` row per address per issue, so a rerun never sends twice.

Audience: confirmed recipe newsletter subscribers plus app users who turned the weekly recipe email on
in their account. Everything goes through the PP-194 gate (``EMAIL_JOURNEYS_*``), the suppression list
and a one-click unsubscribe.
"""

from __future__ import annotations

import logging
import os
import time
import uuid
from datetime import date, datetime, timedelta, timezone
from typing import Any, Optional
from zoneinfo import ZoneInfo

from psycopg2.extras import Json

from backend.services import email_gate, email_journeys, email_service, journey_emails, weekly_content
from database.db import db_connection

logger = logging.getLogger(__name__)

JOURNEY = journey_emails.WEEKLY_JOURNEY
TEMPLATE = "weekly_recipes"
TEST_TEMPLATE = "weekly_recipes_test"
LIST = "weekly"
CHICAGO = ZoneInfo("America/Chicago")
MAX_PER_RUN = 500
GIVE_UP_AFTER = timedelta(hours=24)  # an address that still fails a day after sending began is left out
LOCK_KEY = 235_000_001
HELD_REASONS = {"journeys_disabled", "missing_mailing_address", "not_a_test_recipient", "not_configured"}
TRUTHY = {"1", "true", "yes", "on"}


# ---------------------------------------------------------------- settings

def auto_send_enabled() -> bool:
    return (os.getenv("EMAIL_WEEKLY_AUTO_SEND") or "").strip().lower() in TRUTHY


def auto_send_delay_hours() -> int:
    try:
        return max(1, int(os.getenv("EMAIL_WEEKLY_AUTO_SEND_DELAY_HOURS") or 24))
    except ValueError:
        return 24


def test_recipient() -> Optional[str]:
    """The only address a draft is ever sent to before approval."""
    explicit = (os.getenv("EMAIL_WEEKLY_TEST_TO") or "").strip().lower()
    if explicit:
        return explicit
    raw = (os.getenv("EMAIL_JOURNEYS_TEST_RECIPIENTS") or "").split(",")
    for part in raw:
        if part.strip():
            return part.strip().lower()
    return None


def _send_interval() -> float:
    try:
        return max(0.0, float(os.getenv("EMAIL_WEEKLY_SEND_INTERVAL") or 0.6))
    except ValueError:
        return 0.6


def chicago_hour(now: Optional[datetime] = None) -> int:
    return (now or datetime.now(timezone.utc)).astimezone(CHICAGO).hour


def issue_date(now: Optional[datetime] = None) -> date:
    return (now or datetime.now(timezone.utc)).astimezone(CHICAGO).date()


# ---------------------------------------------------------------- building

def _issue_from_row(row: dict[str, Any]) -> dict[str, Any]:
    return {**row, "id": str(row["id"])}


def get_issue(issue_id: str) -> Optional[dict[str, Any]]:
    with db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT * FROM email_weekly_issues WHERE id::text = %s", (issue_id,))
            row = cur.fetchone()
    return _issue_from_row(row) if row else None


def _get_by_key(key: str) -> Optional[dict[str, Any]]:
    with db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT * FROM email_weekly_issues WHERE issue_key = %s", (key,))
            row = cur.fetchone()
    return _issue_from_row(row) if row else None


def build_issue(*, day: Optional[date] = None, send_test: bool = True) -> dict[str, Any]:
    """Create this week's draft (once per ISO week) and send the [TEST] copy. Never mails the list."""
    day = day or issue_date()
    key = weekly_content.issue_key_for(day)
    existing = _get_by_key(key)
    if existing:
        result: dict[str, Any] = {"issue_key": key, "created": False, "status": existing["status"], "id": existing["id"]}
        if send_test and existing["status"] == "draft" and not existing["test_sent_at"]:
            result["test"] = send_test_copy(existing["id"])  # an earlier test copy never went out: try again
        return result

    with db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT recipe_slugs, tip_id FROM email_weekly_issues WHERE status <> 'skipped' ORDER BY created_at DESC LIMIT 30"
            )
            recent = cur.fetchall()
    slugs = weekly_content.pick_recipes(day, [list(r["recipe_slugs"]) for r in recent])
    tip = weekly_content.pick_tip([r["tip_id"] for r in recent])
    content = weekly_content.build_content(slugs, tip)
    with db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO email_weekly_issues (issue_key, subject, preheader, content, recipe_slugs, tip_id)
                VALUES (%s, %s, %s, %s, %s, %s)
                ON CONFLICT (issue_key) DO NOTHING
                RETURNING id::text AS id
                """,
                (key, weekly_content.subject_for(slugs), weekly_content.PREHEADER, Json(content), slugs, tip.id),
            )
            row = cur.fetchone()
    if not row:  # lost a race with another run
        existing = _get_by_key(key)
        return {"issue_key": key, "created": False, "status": existing["status"] if existing else "unknown"}
    result = {"issue_key": key, "created": True, "status": "draft", "id": row["id"], "recipes": slugs, "tip": tip.id}
    if send_test:
        result["test"] = send_test_copy(row["id"])
    return result


def render_for(issue: dict[str, Any], *, send_id: str, unsubscribe_url: str, audience: str, test: bool = False):
    return journey_emails.render_weekly_issue(
        send_id=send_id,
        content=issue["content"],
        subject=issue["subject"],
        preheader=issue["preheader"],
        unsubscribe_url=unsubscribe_url,
        audience=audience,
        test=test,
    )


def send_test_copy(issue_id: str, *, again: bool = False) -> dict[str, Any]:
    """Email the [TEST] copy to the owner address only. Test sends are kept out of the issue's stats."""
    issue = get_issue(issue_id)
    if not issue:
        return {"sent": False, "reason": "no_such_issue"}
    to = test_recipient()
    if not to:
        return {"sent": False, "reason": "no_test_recipient"}
    key = issue["issue_key"]
    send_id = str(uuid.uuid4())
    # A preview link: the token is not real, so it can never unsubscribe anyone.
    unsub = email_journeys.unsubscribe_url_for("test-copy-not-a-real-token", "recipes")
    rendered = render_for(issue, send_id=send_id, unsubscribe_url=unsub, audience="subscriber", test=True)
    suffix = f":{int(time.time())}" if again else ""
    result = email_service.send_email(
        to=to,
        subject=rendered.subject,
        html=rendered.html,
        text=rendered.text,
        template=TEST_TEMPLATE,
        idempotency_key=f"weekly:{key}:test{suffix}",
        category="marketing",
        journey=JOURNEY,
        journey_step=f"{key}:test",
        send_id=send_id,
        unsubscribe_url=unsub,
    )
    sent = not result.get("skipped")
    if sent:
        with db_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("UPDATE email_weekly_issues SET test_sent_at = now(), updated_at = now() WHERE id::text = %s", (issue_id,))
    return {"sent": sent, "reason": result.get("reason"), "subject": rendered.subject}


# ---------------------------------------------------------------- audience

def audience() -> list[dict[str, Any]]:
    """Everyone who should get the weekly email right now, one row per address."""
    with db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT id::text AS subject_id, lower(email) AS email, unsubscribe_token AS token
                FROM recipe_newsletter_subscribers WHERE status = 'confirmed' ORDER BY created_at, id
                """
            )
            subscribers = cur.fetchall()
            cur.execute(
                """
                SELECT u.id::text AS subject_id, lower(u.email) AS email, p.unsubscribe_token AS token
                FROM users u JOIN email_preferences p ON p.user_id = u.id::text
                WHERE p.weekly_recipes AND u.email IS NOT NULL AND u.email <> ''
                ORDER BY u.id::text
                """
            )
            users = cur.fetchall()
            cur.execute(
                """
                SELECT lower(email) AS email FROM recipe_newsletter_subscribers WHERE status = 'unsubscribed'
                UNION SELECT email FROM email_suppressions
                """
            )
            blocked = {r["email"] for r in cur.fetchall()}
    seen: set[str] = set()
    out: list[dict[str, Any]] = []
    for r in subscribers:  # a confirmed subscriber who is also an app user gets one email, with the recipes unsubscribe link
        if r["email"] in blocked or r["email"] in seen:
            continue
        seen.add(r["email"])
        out.append({**r, "subject_type": "subscriber", "list": "recipes", "user_id": None})
    for r in users:
        if r["email"] in blocked or r["email"] in seen:
            continue
        seen.add(r["email"])
        out.append({**r, "subject_type": "user", "list": LIST, "user_id": r["subject_id"]})
    return out


def audience_counts() -> dict[str, int]:
    rows = audience()
    subs = sum(1 for r in rows if r["subject_type"] == "subscriber")
    return {"subscribers": subs, "app_users": len(rows) - subs, "total": len(rows)}


# ---------------------------------------------------------------- approval

def approve_issue(issue_id: str, approved_by: str) -> Optional[dict[str, Any]]:
    """draft -> approved. Returns the issue, or None if it was not a draft."""
    with db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                UPDATE email_weekly_issues SET status = 'approved', approved_at = now(), approved_by = %s, updated_at = now()
                WHERE id::text = %s AND status = 'draft' RETURNING id::text AS id
                """,
                (approved_by, issue_id),
            )
            row = cur.fetchone()
    return get_issue(row["id"]) if row else None


def skip_issue(issue_id: str) -> bool:
    """A draft, or an approved issue that has not started sending, can be skipped."""
    with db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                UPDATE email_weekly_issues SET status = 'skipped', updated_at = now()
                WHERE id::text = %s AND (status = 'draft' OR (status = 'approved' AND send_started_at IS NULL))
                RETURNING id
                """,
                (issue_id,),
            )
            return cur.fetchone() is not None


def auto_approve_due() -> int:
    """Only with EMAIL_WEEKLY_AUTO_SEND on: approve drafts whose test copy went out and whose review window passed."""
    if not auto_send_enabled():
        return 0
    cutoff = datetime.now(timezone.utc) - timedelta(hours=auto_send_delay_hours())
    with db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                UPDATE email_weekly_issues SET status = 'approved', approved_at = now(), approved_by = 'auto', updated_at = now()
                WHERE status = 'draft' AND test_sent_at IS NOT NULL AND test_sent_at <= %s
                RETURNING id
                """,
                (cutoff,),
            )
            return len(cur.fetchall())


# ---------------------------------------------------------------- sending

def _send_one(issue: dict[str, Any], rec: dict[str, Any]) -> dict[str, Any]:
    key = issue["issue_key"]
    send_id = str(uuid.uuid4())
    unsub = email_journeys.unsubscribe_url_for(rec["token"], rec["list"])
    rendered = render_for(issue, send_id=send_id, unsubscribe_url=unsub, audience=rec["subject_type"])
    return email_service.send_email(
        to=rec["email"],
        subject=rendered.subject,
        html=rendered.html,
        text=rendered.text,
        template=TEMPLATE,
        idempotency_key=f"weekly:{key}:{rec['subject_type']}:{rec['subject_id']}",
        user_id=rec["user_id"],
        category="marketing",
        journey=JOURNEY,
        journey_step=key,
        send_id=send_id,
        unsubscribe_url=unsub,
    )


def _run_issue(issue: dict[str, Any], stats: dict[str, Any]) -> None:
    recipients = audience()
    started = issue["send_started_at"] is not None
    sent = skipped = held = failed = 0
    attempted = 0
    for rec in recipients:
        if attempted >= MAX_PER_RUN:
            held += 1  # not an error: the next run picks up where this one stopped
            break
        result = _send_one(issue, rec)
        if not result.get("skipped"):
            attempted += 1
            sent += 1
            if not started:
                started = True
                with db_connection() as conn:
                    with conn.cursor() as cur:
                        cur.execute(
                            "UPDATE email_weekly_issues SET status = 'sending', send_started_at = now(), updated_at = now() "
                            "WHERE id::text = %s AND send_started_at IS NULL",
                            (issue["id"],),
                        )
            time.sleep(_send_interval())
            continue
        reason = result.get("reason")
        if reason == "send_failed":
            failed += 1
        elif reason in HELD_REASONS:
            held += 1
            if reason != "not_a_test_recipient":  # that one is per address; the others close the gate for everyone
                break
        else:
            skipped += 1  # already_sent, suppressed, missing_recipient: nothing more to do for this address
    stats["sent"] += sent
    stats["skipped"] += skipped
    stats["held"] += held
    stats["failed"] += failed
    started_at = issue["send_started_at"]
    gave_up = bool(failed and started_at and datetime.now(timezone.utc) - started_at > GIVE_UP_AFTER)
    if gave_up:
        logger.warning("weekly issue %s: giving up on %s address(es) that kept failing", issue["issue_key"], failed)
        stats["gave_up"] += failed
    if held == 0 and (failed == 0 or gave_up):
        with db_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    UPDATE email_weekly_issues
                    SET status = 'sent', send_completed_at = now(), updated_at = now(),
                        send_started_at = COALESCE(send_started_at, now()),
                        recipients_total = (SELECT COUNT(*) FROM email_sends
                                            WHERE journey = %s AND journey_step = %s AND status NOT IN ('failed', 'pending', 'backfill'))
                    WHERE id::text = %s AND status IN ('approved', 'sending')
                    """,
                    (JOURNEY, issue["issue_key"], issue["id"]),
                )
        stats["completed"].append(issue["issue_key"])


def process_sends() -> dict[str, Any]:
    """Cron entry (every 15 minutes): auto-approve if enabled, then send approved issues. Safe to run concurrently."""
    stats: dict[str, Any] = {
        "mode": email_gate.mode(),
        "auto_send": auto_send_enabled(),
        "auto_approved": 0,
        "sent": 0,
        "skipped": 0,
        "held": 0,
        "failed": 0,
        "gave_up": 0,
        "completed": [],
        "locked": False,
    }
    with db_connection() as lock_conn:  # the advisory lock lives on this one connection for the whole run
        with lock_conn.cursor() as lock_cur:
            lock_cur.execute("SELECT pg_try_advisory_lock(%s) AS got", (LOCK_KEY,))
            if not lock_cur.fetchone()["got"]:
                stats["locked"] = True
                return stats
            try:
                stats["auto_approved"] = auto_approve_due()
                with db_connection() as conn:
                    with conn.cursor() as cur:
                        cur.execute(
                            "SELECT * FROM email_weekly_issues WHERE status IN ('approved', 'sending') ORDER BY created_at"
                        )
                        issues = [_issue_from_row(r) for r in cur.fetchall()]
                for issue in issues:
                    _run_issue(issue, stats)
            finally:
                lock_cur.execute("SELECT pg_advisory_unlock(%s)", (LOCK_KEY,))
    return stats


# ---------------------------------------------------------------- app-user opt-in

def get_user_opt_in(user_id: str) -> bool:
    with db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT weekly_recipes FROM email_preferences WHERE user_id = %s", (user_id,))
            row = cur.fetchone()
    return bool(row and row["weekly_recipes"])


def set_user_opt_in(user_id: str, on: bool, source: str = "account") -> bool:
    token, _ = email_journeys._ensure_unsubscribe_token(user_id)  # creates the preferences row if needed
    with db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "UPDATE email_preferences SET weekly_recipes = %s, updated_at = now() WHERE user_id = %s AND weekly_recipes IS DISTINCT FROM %s RETURNING user_id",
                (on, user_id, on),
            )
            if cur.fetchone():
                email_journeys.log_list_event(cur, LIST, "subscribed" if on else "unsubscribed", user_id, source)
    return on


def unsubscribe_weekly(token: str) -> bool:
    if not token or len(token) > 200:
        return False
    with db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT user_id, weekly_recipes FROM email_preferences WHERE unsubscribe_token = %s FOR UPDATE", (token,))
            row = cur.fetchone()
            if not row:
                return False
            if row["weekly_recipes"]:
                cur.execute("UPDATE email_preferences SET weekly_recipes = FALSE, updated_at = now() WHERE user_id = %s", (row["user_id"],))
                email_journeys.log_list_event(cur, LIST, "unsubscribed", row["user_id"], "email_link")
    return True


def resubscribe_weekly(token: str) -> bool:
    if not token or len(token) > 200:
        return False
    with db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "UPDATE email_preferences SET weekly_recipes = TRUE, updated_at = now() WHERE unsubscribe_token = %s RETURNING user_id",
                (token,),
            )
            row = cur.fetchone()
            if not row:
                return False
            email_journeys.log_list_event(cur, LIST, "resubscribed", row["user_id"], "email_link")
    return True


# ---------------------------------------------------------------- admin view

def _rate(num: int, den: int):
    return round(num / den, 4) if den > 0 else None


def admin_summary(limit: int = 12) -> dict[str, Any]:
    """Weekly issues with real sent/open/click counts. Test copies are not counted."""
    with db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT * FROM email_weekly_issues ORDER BY created_at DESC LIMIT %s", (limit,))
            rows = cur.fetchall()
            keys = [r["issue_key"] for r in rows]
            stats: dict[str, dict[str, int]] = {}
            if keys:
                cur.execute(
                    """
                    SELECT journey_step,
                           COUNT(*) AS sent,
                           COALESCE(SUM(CASE WHEN status = 'delivered' OR opened_at IS NOT NULL OR clicked_at IS NOT NULL THEN 1 ELSE 0 END), 0) AS delivered,
                           COALESCE(SUM(CASE WHEN opened_at IS NOT NULL THEN 1 ELSE 0 END), 0) AS opened,
                           COALESCE(SUM(CASE WHEN clicked_at IS NOT NULL THEN 1 ELSE 0 END), 0) AS clicked,
                           COALESCE(SUM(CASE WHEN status = 'bounced' THEN 1 ELSE 0 END), 0) AS bounced,
                           COALESCE(SUM(CASE WHEN status = 'complained' THEN 1 ELSE 0 END), 0) AS complained
                    FROM email_sends
                    WHERE journey = %s AND template = %s AND journey_step = ANY(%s)
                          AND status NOT IN ('backfill', 'failed', 'pending')
                    GROUP BY journey_step
                    """,
                    (JOURNEY, TEMPLATE, keys),
                )
                for r in cur.fetchall():
                    stats[str(r["journey_step"])] = {k: int(r[k]) for k in ("sent", "delivered", "opened", "clicked", "bounced", "complained")}
    zero = {"sent": 0, "delivered": 0, "opened": 0, "clicked": 0, "bounced": 0, "complained": 0}
    issues = []
    for r in rows:
        st = {**zero, **stats.get(r["issue_key"], {})}
        content = r["content"] or {}
        issues.append(
            {
                "id": str(r["id"]),
                "issue_key": r["issue_key"],
                "status": r["status"],
                "subject": r["subject"],
                "recipes": [{"slug": x["slug"], "title": x["title"]} for x in content.get("recipes", [])],
                "tip_title": (content.get("tip") or {}).get("title"),
                "test_sent_at": r["test_sent_at"].isoformat() if r["test_sent_at"] else None,
                "approved_at": r["approved_at"].isoformat() if r["approved_at"] else None,
                "approved_by": "auto" if r["approved_by"] == "auto" else ("admin" if r["approved_by"] else None),
                "send_started_at": r["send_started_at"].isoformat() if r["send_started_at"] else None,
                "send_completed_at": r["send_completed_at"].isoformat() if r["send_completed_at"] else None,
                "created_at": r["created_at"].isoformat(),
                "stats": {**st, "open_rate": _rate(st["opened"], st["sent"]), "click_rate": _rate(st["clicked"], st["sent"])},
                "can_approve": r["status"] == "draft",
                "can_skip": r["status"] == "draft" or (r["status"] == "approved" and r["send_started_at"] is None),
            }
        )
    return {
        "auto_send": auto_send_enabled(),
        "auto_send_delay_hours": auto_send_delay_hours(),
        "test_recipient_set": bool(test_recipient()),
        "audience": audience_counts(),
        "issues": issues,
    }
