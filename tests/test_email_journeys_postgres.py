"""PP-194..PP-198: double opt-in, journeys, gate, unsubscribe, clicks and the admin dashboard.

Real Postgres, fake Resend. No address is ever mailed. Run with RUN_POSTGRES_TESTS=1 and DATABASE_URL.
"""

from __future__ import annotations

import os
import uuid
from datetime import datetime, timedelta, timezone

import pytest

pytestmark = pytest.mark.skipif(
    os.environ.get("RUN_POSTGRES_TESTS") != "1",
    reason="Set RUN_POSTGRES_TESTS=1 and DATABASE_URL to run",
)

FROM_ADDRESS = "Pantry Hub Test <hello@example.test>"


@pytest.fixture(scope="module", autouse=True)
def _migrated():
    from database.migrate import migrate

    migrate()


@pytest.fixture
def sent(monkeypatch):
    import resend

    captured: list[dict] = []

    def fake_send(params):
        captured.append(params)
        return {"id": f"test-resend-{uuid.uuid4().hex[:8]}"}

    monkeypatch.setenv("RESEND_API_KEY", "not-a-real-resend-key")
    monkeypatch.setenv("RESEND_FROM_EMAIL", FROM_ADDRESS)
    monkeypatch.delenv("EMAIL_JOURNEYS_ENABLED", raising=False)
    monkeypatch.delenv("EMAIL_JOURNEYS_TEST_RECIPIENTS", raising=False)
    monkeypatch.delenv("EMAIL_MAILING_ADDRESS", raising=False)
    monkeypatch.delenv("EMAIL_ONBOARDING_SINCE", raising=False)
    monkeypatch.setattr(resend.Emails, "send", staticmethod(fake_send))
    return captured


def _email() -> str:
    return f"pp194-{uuid.uuid4().hex[:10]}@example.test"


def _row(email: str) -> dict:
    from database.db import db_connection

    with db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT id::text AS id, * FROM recipe_newsletter_subscribers WHERE email = %s", (email,))
            return cur.fetchone()


def test_gate_off_sends_nothing_and_ui_is_honest(sent, client):
    email = _email()
    r = client.post("/api/public/recipe-newsletter", json={"email": email, "source": "recipes_index"})
    assert r.status_code == 200
    assert r.json()["data"] == {"subscribed": True, "confirmation_required": False}
    assert sent == []
    row = _row(email)
    assert row["status"] == "pending" and row["confirmation_sent_at"] is None


def test_test_mode_only_reaches_allowlisted_address(sent, client, monkeypatch):
    mine, other = _email(), _email()
    monkeypatch.setenv("EMAIL_JOURNEYS_TEST_RECIPIENTS", mine)
    client.post("/api/public/recipe-newsletter", json={"email": other})
    client.post("/api/public/recipe-newsletter", json={"email": mine})
    assert [p["to"] for p in sent] == [[mine]]
    assert "confirm?token=" in sent[0]["html"]
    assert _row(other)["confirmation_sent_at"] is None
    assert _row(mine)["confirmation_sent_at"] is not None


def test_double_opt_in_welcome_journey_and_unsubscribe(sent, client, monkeypatch):
    from backend.services import email_journeys
    from database.db import db_connection

    email = _email()
    monkeypatch.setenv("EMAIL_JOURNEYS_TEST_RECIPIENTS", email)
    client.post("/api/public/recipe-newsletter", json={"email": email, "source": "recipe_page", "recipe_slug": "easy-lasagna"})
    row = _row(email)
    assert len(sent) == 1 and sent[0]["subject"].startswith("Confirm")
    assert "headers" not in sent[0] or "List-Unsubscribe" not in sent[0].get("headers", {})

    # A scanner does not confirm; a person does.
    r = client.get(f"/api/public/email/confirm?token={row['confirm_token']}", headers={"user-agent": "Mimecast-Scanner"})
    assert "Yes, send me recipes" in r.text and _row(email)["status"] == "pending"
    r = client.get(f"/api/public/email/confirm?token={row['confirm_token']}", headers={"user-agent": "Mozilla/5.0 Gmail"})
    assert "on the list" in r.text
    assert _row(email)["status"] == "confirmed"
    # Welcome went out immediately with unsubscribe headers and tracked links.
    welcome = sent[-1]
    assert welcome["subject"].startswith("You're in")
    assert welcome["headers"]["List-Unsubscribe-Post"] == "List-Unsubscribe=One-Click"
    assert "/api/public/email/click?s=" in welcome["html"] and 'alt="AI illustration' in welcome["html"]
    assert "[mailing address added at launch]" in welcome["html"]  # test mode placeholder, never invented
    # Confirming twice does not resend.
    client.get(f"/api/public/email/confirm?token={row['confirm_token']}", headers={"user-agent": "Mozilla/5.0"})
    assert len(sent) == 2

    # Step 2 is not due for 3 days.
    assert email_journeys.run_due(only=("recipe_welcome", row["id"]))["sent"] == 0
    with db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("UPDATE email_journey_state SET next_run_at = now() - interval '1 minute' WHERE subject_id = %s", (row["id"],))
    assert email_journeys.run_due(only=("recipe_welcome", row["id"]))["sent"] == 1
    assert sent[-1]["subject"] == "Three dinners from the cupboard"
    # Re-running the same step cannot double send.
    with db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "UPDATE email_journey_state SET next_step = 1, status = 'active', next_run_at = now() - interval '1 minute' WHERE subject_id = %s",
                (row["id"],),
            )
    count = len(sent)
    email_journeys.run_due(only=("recipe_welcome", row["id"]))
    assert len(sent) == count

    # One-click unsubscribe: GET only shows a button, POST does it, journey stops.
    url = f"/api/public/email/unsubscribe?token={row['unsubscribe_token']}&list=recipes"
    assert "Unsubscribe</button>" in client.get(url).text
    assert _row(email)["status"] == "confirmed"
    assert client.post(url).status_code == 200
    assert _row(email)["status"] == "unsubscribed"
    with db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT status, stopped_reason FROM email_journey_state WHERE subject_id = %s", (row["id"],))
            st = cur.fetchone()
    assert st["status"] == "stopped" and st["stopped_reason"] == "unsubscribed"
    # Resubscribe via the page's undo restores the confirmed status.
    assert client.post(url + "&action=resubscribe").status_code == 200
    assert _row(email)["status"] == "confirmed"


def test_click_redirect_counts_humans_not_bots_and_blocks_open_redirects(sent, client, monkeypatch):
    from database.db import db_connection

    email = _email()
    monkeypatch.setenv("EMAIL_JOURNEYS_TEST_RECIPIENTS", email)
    client.post("/api/public/recipe-newsletter", json={"email": email})
    with db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT id FROM email_sends WHERE to_email = %s", (email,))
            send_id = cur.fetchone()["id"]
    r = client.get(f"/api/public/email/click?s={send_id}&l=test&p=/recipes/", follow_redirects=False, headers={"user-agent": "Mozilla/5.0"})
    assert r.status_code == 302 and r.headers["location"].endswith("/recipes/")
    r = client.get(f"/api/public/email/click?s={send_id}&l=test&p=//evil.example", follow_redirects=False, headers={"user-agent": "Mozilla/5.0"})
    assert r.headers["location"].rstrip("/").endswith("mypantryhub.com")
    client.get(f"/api/public/email/click?s={send_id}&l=bot&p=/recipes/", follow_redirects=False, headers={"user-agent": "ProofpointScanner"})
    client.get("/api/public/email/click?s=not-a-send&l=x&p=/", follow_redirects=False)
    with db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT link_label, is_bot FROM email_clicks WHERE email_send_id = %s ORDER BY created_at", (send_id,))
            rows = cur.fetchall()
            cur.execute("SELECT clicked_at FROM email_sends WHERE id = %s", (send_id,))
            assert cur.fetchone()["clicked_at"] is not None
    assert [(r["link_label"], r["is_bot"]) for r in rows] == [("test", False), ("test", False), ("bot", True)]


def test_onboarding_journey_skips_done_steps_and_respects_cutoff_and_optout(sent, monkeypatch):
    from backend.services import email_journeys
    from database.db import db_connection

    email = _email()
    uid = str(uuid.uuid4())
    old_uid = str(uuid.uuid4())
    since = datetime.now(timezone.utc) - timedelta(days=10)
    monkeypatch.setenv("EMAIL_JOURNEYS_TEST_RECIPIENTS", email)
    with db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("INSERT INTO users (id, name, email, created_at) VALUES (%s, 'Sam Cook', %s, %s)", (uid, email, since + timedelta(days=4)))
            cur.execute("INSERT INTO users (id, name, email, created_at) VALUES (%s, 'Old Timer', %s, %s)", (old_uid, _email(), since - timedelta(days=100)))
            cur.execute(
                "INSERT INTO pantry_items (id, user_id, name, quantity, unit, category, last_updated) VALUES (%s, %s, 'Rice', 1, 'bag', 'pantry', 'now')",
                (str(uuid.uuid4()), uid),
            )
    # Nothing enrolls until EMAIL_ONBOARDING_SINCE is set.
    assert email_journeys.enroll_new_users() == 0
    monkeypatch.setenv("EMAIL_ONBOARDING_SINCE", since.isoformat())
    email_journeys.enroll_new_users()
    with db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT subject_id FROM email_journey_state WHERE journey = 'onboarding' AND subject_id IN (%s, %s)", (uid, old_uid))
            assert [r["subject_id"] for r in cur.fetchall()] == [uid]
    # Anchored 6 days ago: step 1 (has items) is skipped, step 2 (recipes) is sent, step 3 (pro, day 7) is not due yet.
    assert email_journeys.run_due(only=("onboarding", uid))["skipped"] == 1
    assert email_journeys.run_due(only=("onboarding", uid))["sent"] == 1
    assert email_journeys.run_due(only=("onboarding", uid))["due"] == 0
    with db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("UPDATE email_journey_state SET next_run_at = now() - interval '1 minute' WHERE subject_id = %s", (uid,))
    email_journeys.run_due(only=("onboarding", uid))
    subjects = [p["subject"] for p in sent]
    assert subjects == ["Turn what you have into dinner", "What Pro adds to Pantry Hub"]
    assert "Hi Sam," in sent[0]["html"] and sent[0]["headers"]["List-Unsubscribe"].startswith("<")
    with db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT status FROM email_journey_state WHERE subject_id = %s", (uid,))
            assert cur.fetchone()["status"] == "completed"
            cur.execute("SELECT journey, journey_step, category FROM email_sends WHERE user_id = %s ORDER BY created_at", (uid,))
            assert [(r["journey"], r["journey_step"], r["category"]) for r in cur.fetchall()] == [
                ("onboarding", "recipes", "lifecycle"),
                ("onboarding", "pro", "lifecycle"),
            ]


def test_onboarding_optout_stops_journey(sent, client, monkeypatch):
    from backend.services import email_journeys
    from database.db import db_connection

    email = _email()
    uid = str(uuid.uuid4())
    monkeypatch.setenv("EMAIL_JOURNEYS_TEST_RECIPIENTS", email)
    with db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("INSERT INTO users (id, name, email) VALUES (%s, 'Opt Out', %s)", (uid, email))
    email_journeys.enroll("onboarding", "user", uid, email, datetime.now(timezone.utc) - timedelta(days=2))
    token, _ = email_journeys._ensure_unsubscribe_token(uid)
    assert client.post(f"/api/public/email/unsubscribe?token={token}&list=onboarding").status_code == 200
    email_journeys.run_due(only=("onboarding", uid))
    assert sent == []
    with db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT status FROM email_journey_state WHERE subject_id = %s", (uid,))
            assert cur.fetchone()["status"] == "stopped"


def test_on_mode_holds_commercial_mail_without_mailing_address(sent, monkeypatch):
    from backend.services import email_gate

    monkeypatch.setenv("EMAIL_JOURNEYS_ENABLED", "true")
    assert email_gate.check("a@example.test", "marketing") == (False, "missing_mailing_address")
    assert email_gate.check("a@example.test", "confirmation") == (True, "ok")
    monkeypatch.setenv("EMAIL_MAILING_ADDRESS", "PO Box 1, Example City")
    assert email_gate.check("a@example.test", "marketing") == (True, "ok")


def test_admin_dashboard_reports_real_rows(sent, client, monkeypatch, auth_headers):
    monkeypatch.setenv("ADMIN_USER_IDS", auth_headers["x-user-id"])
    email = _email()
    monkeypatch.setenv("EMAIL_JOURNEYS_TEST_RECIPIENTS", email)
    client.post("/api/public/recipe-newsletter", json={"email": email})
    r = client.get("/api/admin/email-marketing?period=7d", headers=auth_headers)
    assert r.status_code == 200
    data = r.json()["data"]
    assert data["config"]["journeys_mode"] == "test" and data["config"]["test_recipient_count"] == 1
    assert data["subscribers"]["pending"] >= 1 and data["subscribers"]["new_in_period"] >= 1
    assert {j["journey"] for j in data["journeys"]} == {"recipe_welcome", "onboarding"}
    assert any(t["template"] == "recipe_confirm" and t["sent"] >= 1 for t in data["templates"])
    assert data["tracking"]["webhook_events_seen"] in (True, False)
    assert client.get("/api/admin/email-marketing").status_code in (401, 403)
