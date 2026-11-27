"""PP-198: admin email marketing dashboard data. Real rows only; nothing is estimated."""

from __future__ import annotations

import os
from datetime import datetime, timedelta, timezone
from typing import Any

from backend.services import email_gate, email_journeys, weekly_recipes
from backend.services.admin_service import _mask_email_str
from database.db import db_connection

DAYS = {"7d": 7, "30d": 30, "90d": 90}
LISTS = ("recipes", "onboarding")


def _iso(value: Any) -> str:
    return value.isoformat() if isinstance(value, datetime) else str(value)


def _rate(num: int, den: int):
    return round(num / den, 4) if den > 0 else None


def get_email_marketing(period: str = "30d") -> dict[str, Any]:
    days = DAYS.get(period, 30)
    cutoff = datetime.now(timezone.utc) - timedelta(days=days)

    config = {
        "journeys_mode": email_gate.mode(),
        "test_recipient_count": len(email_gate.test_recipients()),
        "mailing_address_set": bool(email_gate.mailing_address()),
        "webhook_secret_present": bool((os.getenv("RESEND_WEBHOOK_SECRET") or "").strip()),
        "onboarding_enrollment_on": email_journeys.onboarding_since() is not None,
    }

    with db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT status, COUNT(*) AS n,
                       COALESCE(SUM(CASE WHEN created_at >= %s THEN 1 ELSE 0 END), 0) AS new_in_period
                FROM recipe_newsletter_subscribers GROUP BY status
                """,
                (cutoff,),
            )
            by_status = {"pending": 0, "confirmed": 0, "unsubscribed": 0}
            new_in_period = 0
            for r in cur.fetchall():
                by_status[str(r["status"])] = int(r["n"])
                new_in_period += int(r["new_in_period"])

            cur.execute(
                """
                SELECT date_trunc('day', created_at)::date AS day, event, COUNT(*) AS n
                FROM email_list_events
                WHERE list = 'recipes' AND created_at >= %s
                GROUP BY 1, 2 ORDER BY 1
                """,
                (cutoff,),
            )
            day_map: dict[str, dict[str, int]] = {}
            for r in cur.fetchall():
                d = day_map.setdefault(str(r["day"]), {"subscribed": 0, "confirmed": 0, "unsubscribed": 0, "resubscribed": 0})
                d[str(r["event"])] = int(r["n"])
            by_day = [{"day": day, **vals} for day, vals in sorted(day_map.items())]

            cur.execute(
                """
                SELECT source, COUNT(*) AS n FROM recipe_newsletter_subscribers
                WHERE created_at >= %s GROUP BY source ORDER BY n DESC
                """,
                (cutoff,),
            )
            by_source = [{"source": str(r["source"]), "count": int(r["n"])} for r in cur.fetchall()]

            cur.execute(
                """
                SELECT recipe_slug, COUNT(*) AS n FROM recipe_newsletter_subscribers
                WHERE created_at >= %s AND recipe_slug IS NOT NULL GROUP BY recipe_slug ORDER BY n DESC LIMIT 5
                """,
                (cutoff,),
            )
            top_recipes = [{"recipe_slug": str(r["recipe_slug"]), "count": int(r["n"])} for r in cur.fetchall()]

            cur.execute(
                "SELECT list, COUNT(*) AS n FROM email_list_events WHERE event = 'unsubscribed' AND created_at >= %s GROUP BY list",
                (cutoff,),
            )
            unsubs = {str(r["list"]): int(r["n"]) for r in cur.fetchall()}

            # Per template engagement (non-backfill, actually sent).
            cur.execute(
                """
                SELECT s.template, s.category, s.journey, s.journey_step,
                       COUNT(*) AS sent,
                       COALESCE(SUM(CASE WHEN s.status = 'delivered' OR s.opened_at IS NOT NULL OR s.clicked_at IS NOT NULL THEN 1 ELSE 0 END), 0) AS delivered,
                       COALESCE(SUM(CASE WHEN s.opened_at IS NOT NULL THEN 1 ELSE 0 END), 0) AS opened,
                       COALESCE(SUM(CASE WHEN s.clicked_at IS NOT NULL THEN 1 ELSE 0 END), 0) AS clicked,
                       COALESCE(SUM(CASE WHEN s.status = 'bounced' THEN 1 ELSE 0 END), 0) AS bounced,
                       COALESCE(SUM(CASE WHEN s.status = 'complained' THEN 1 ELSE 0 END), 0) AS complained
                FROM email_sends s
                WHERE s.status NOT IN ('backfill', 'failed', 'pending') AND s.created_at >= %s
                GROUP BY s.template, s.category, s.journey, s.journey_step
                ORDER BY sent DESC
                """,
                (cutoff,),
            )
            templates = []
            for r in cur.fetchall():
                sent = int(r["sent"])
                templates.append(
                    {
                        "template": str(r["template"]),
                        "category": str(r["category"]),
                        "journey": r["journey"],
                        "step": r["journey_step"],
                        "sent": sent,
                        "delivered": int(r["delivered"]),
                        "opened": int(r["opened"]),
                        "clicked": int(r["clicked"]),
                        "bounced": int(r["bounced"]),
                        "complained": int(r["complained"]),
                        "click_rate": _rate(int(r["clicked"]), sent),
                        "bounce_rate": _rate(int(r["bounced"]), sent),
                    }
                )

            # Journey enrollment funnel.
            cur.execute(
                "SELECT journey, status, COUNT(*) AS n FROM email_journey_state GROUP BY journey, status"
            )
            state: dict[str, dict[str, int]] = {}
            for r in cur.fetchall():
                state.setdefault(str(r["journey"]), {"active": 0, "completed": 0, "stopped": 0})[str(r["status"])] = int(r["n"])
            cur.execute(
                "SELECT journey, COALESCE(stopped_reason, 'unknown') AS reason, COUNT(*) AS n FROM email_journey_state "
                "WHERE status = 'stopped' GROUP BY journey, reason"
            )
            stop_reasons: dict[str, dict[str, int]] = {}
            for r in cur.fetchall():
                stop_reasons.setdefault(str(r["journey"]), {})[str(r["reason"])] = int(r["n"])
            cur.execute(
                "SELECT journey, COUNT(*) AS n FROM email_journey_state WHERE status = 'active' AND next_run_at <= now() GROUP BY journey"
            )
            overdue = {str(r["journey"]): int(r["n"]) for r in cur.fetchall()}

            # First-party clicks (human clicks only; bot-like user agents are stored but not counted).
            cur.execute(
                """
                SELECT c.link_label, c.path, COUNT(DISTINCT c.email_send_id) AS unique_clicks, COUNT(*) AS total_clicks
                FROM email_clicks c
                WHERE c.created_at >= %s AND NOT c.is_bot
                GROUP BY c.link_label, c.path ORDER BY unique_clicks DESC, total_clicks DESC LIMIT 15
                """,
                (cutoff,),
            )
            top_links = [
                {"label": str(r["link_label"]), "path": str(r["path"]), "unique_clicks": int(r["unique_clicks"]), "total_clicks": int(r["total_clicks"])}
                for r in cur.fetchall()
            ]
            cur.execute("SELECT COUNT(*) AS n FROM email_clicks WHERE created_at >= %s AND is_bot", (cutoff,))
            bot_clicks = int(cur.fetchone()["n"])

            cur.execute("SELECT 1 FROM email_events WHERE event_type = 'email.opened' LIMIT 1")
            open_tracking_seen = bool(cur.fetchone())
            cur.execute("SELECT 1 FROM email_events LIMIT 1")
            webhook_events_seen = bool(cur.fetchone())

            cur.execute(
                """
                SELECT e.occurred_at, e.event_type, s.template, s.journey, s.to_email
                FROM email_events e LEFT JOIN email_sends s ON s.id = e.email_send_id
                ORDER BY COALESCE(e.occurred_at, e.created_at) DESC LIMIT 30
                """
            )
            recent_events = [
                {
                    "occurred_at": _iso(r["occurred_at"]) if r["occurred_at"] else None,
                    "event_type": str(r["event_type"]),
                    "template": r["template"],
                    "journey": r["journey"],
                    "to_email": _mask_email_str(r["to_email"]) if r["to_email"] else None,
                }
                for r in cur.fetchall()
            ]

    journeys = []
    for name, cfg in email_journeys.JOURNEYS.items():
        counts = state.get(name, {"active": 0, "completed": 0, "stopped": 0})
        step_rows = {t["step"]: t for t in templates if t["journey"] == name}
        steps = []
        for st in cfg["steps"]:
            row = step_rows.get(st.key)
            steps.append(
                {
                    "step": st.key,
                    "delay_days": st.offset.days,
                    "sent": row["sent"] if row else 0,
                    "delivered": row["delivered"] if row else 0,
                    "opened": row["opened"] if row else 0,
                    "clicked": row["clicked"] if row else 0,
                    "bounced": row["bounced"] if row else 0,
                    "click_rate": row["click_rate"] if row else None,
                }
            )
        journeys.append(
            {
                "journey": name,
                "list": cfg["list"],
                "enrolled": sum(counts.values()),
                **counts,
                "overdue": overdue.get(name, 0),
                "stop_reasons": stop_reasons.get(name, {}),
                "unsubscribed_in_period": unsubs.get(cfg["list"], 0),
                "steps": steps,
            }
        )

    total_subs = sum(by_status.values())
    return {
        "period": period,
        "config": config,
        "subscribers": {
            "total": total_subs,
            **by_status,
            "new_in_period": new_in_period,
            "unsubscribed_in_period": unsubs.get("recipes", 0),
            "by_day": by_day,
            "by_source": by_source,
            "top_recipes": top_recipes,
        },
        "journeys": journeys,
        "templates": templates,
        "top_links": top_links,
        "bot_clicks_ignored": bot_clicks,
        "tracking": {
            "webhook_events_seen": webhook_events_seen,
            "open_tracking_seen": open_tracking_seen,
            "click_source": "first-party redirect (human clicks) plus Resend webhook clicks when enabled",
        },
        "recent_events": recent_events,
        "weekly": weekly_recipes.admin_summary(),
    }
