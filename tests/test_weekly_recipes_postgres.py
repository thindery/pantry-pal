"""PP-235: weekly recipe newsletter against real Postgres with a fake Resend. No address is ever mailed.

Run with RUN_POSTGRES_TESTS=1 and DATABASE_URL (the database name must contain "test").
"""

from __future__ import annotations

import os
import uuid
from datetime import date, datetime, timedelta, timezone

import pytest

pytestmark = pytest.mark.skipif(
    os.environ.get("RUN_POSTGRES_TESTS") != "1",
    reason="Set RUN_POSTGRES_TESTS=1 and DATABASE_URL to run",
)

OWNER = "owner-pp235@example.test"
WED = date(2026, 11, 25)  # ISO week 2026-W48


@pytest.fixture(scope="module", autouse=True)
def _migrated():
    from database.migrate import migrate

    migrate()


@pytest.fixture
def env(monkeypatch):
    """Marketing mail ON with a fake Resend, and a clean slate for everything the audience reads."""
    import resend

    from database.db import db_connection

    assert "test" in os.environ["DATABASE_URL"].rsplit("/", 1)[-1], "refusing to wipe a non-test database"
    captured: list[dict] = []

    def fake_send(params):
        captured.append(params)
        return {"id": f"test-resend-{uuid.uuid4().hex[:8]}"}

    monkeypatch.setenv("RESEND_API_KEY", "not-a-real-resend-key")
    monkeypatch.setenv("RESEND_FROM_EMAIL", "Pantry Hub Test <hello@example.test>")
    monkeypatch.setenv("EMAIL_JOURNEYS_ENABLED", "true")
    monkeypatch.setenv("EMAIL_MAILING_ADDRESS", "1 Test Street, Testville")
    monkeypatch.setenv("EMAIL_WEEKLY_TEST_TO", OWNER)
    monkeypatch.setenv("EMAIL_WEEKLY_SEND_INTERVAL", "0")
    monkeypatch.delenv("EMAIL_JOURNEYS_TEST_RECIPIENTS", raising=False)
    monkeypatch.delenv("EMAIL_WEEKLY_AUTO_SEND", raising=False)
    monkeypatch.delenv("EMAIL_WEEKLY_AUTO_SEND_DELAY_HOURS", raising=False)
    monkeypatch.setattr(resend.Emails, "send", staticmethod(fake_send))
    with db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("DELETE FROM email_weekly_issues")
            cur.execute("DELETE FROM email_sends WHERE journey = 'weekly_recipes'")
            cur.execute("DELETE FROM recipe_newsletter_subscribers")
            cur.execute("UPDATE email_preferences SET weekly_recipes = FALSE")
            cur.execute("DELETE FROM email_suppressions")
    return captured


def _email() -> str:
    return f"pp235-{uuid.uuid4().hex[:10]}@example.test"


def _subscriber(status="confirmed") -> tuple[str, str]:
    from database.db import db_connection

    email = _email()
    with db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "INSERT INTO recipe_newsletter_subscribers (email, source, status, confirmed_at) VALUES (%s, 'test', %s, "
                "CASE WHEN %s = 'confirmed' THEN now() END) RETURNING id::text AS id, unsubscribe_token",
                (email, status, status),
            )
            row = cur.fetchone()
    return email, row["unsubscribe_token"]


def _user(opted_in=True) -> tuple[str, str, str]:
    from backend.services import email_journeys, weekly_recipes
    from database.db import db_connection

    uid, email = str(uuid.uuid4()), _email()
    with db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("INSERT INTO users (id, name, email) VALUES (%s, 'Sam Cook', %s)", (uid, email))
    token, _ = email_journeys._ensure_unsubscribe_token(uid)
    weekly_recipes.set_user_opt_in(uid, opted_in)
    return uid, email, token


def _issue(key="2026-W48") -> dict:
    from backend.services import weekly_recipes

    return weekly_recipes._get_by_key(key)


def _sent_to(captured) -> list[str]:
    return sorted(p["to"][0] for p in captured)


def _approve_and_send(issue_id: str) -> dict:
    from backend.services import weekly_recipes

    assert weekly_recipes.approve_issue(issue_id, "admin-1")
    return weekly_recipes.process_sends()


# ---------------------------------------------------------------- build + test copy

def test_build_stores_a_draft_and_mails_only_the_owner(env):
    from backend.services import weekly_recipes

    sub_email, _ = _subscriber()
    _user()
    out = weekly_recipes.build_issue(day=WED)
    assert out["created"] and out["status"] == "draft" and out["issue_key"] == "2026-W48"
    assert out["test"]["sent"] is True
    # Exactly one email left, to the owner, marked as a test, and nothing went to the list.
    assert _sent_to(env) == [OWNER]
    mail = env[0]
    assert mail["subject"].startswith("[TEST] This week:") and "has not been sent to the list" in mail["html"]
    assert sub_email not in str(env)
    issue = _issue()
    assert issue["status"] == "draft" and issue["test_sent_at"] is not None and issue["approved_at"] is None
    assert len(issue["recipe_slugs"]) == 3 and issue["content"]["tip"]["id"] == issue["tip_id"]
    # Running the build again in the same week changes nothing and sends nothing.
    again = weekly_recipes.build_issue(day=WED + timedelta(days=1))
    assert again["created"] is False and len(env) == 1
    # And the draft is not touched by the send job while nobody has approved it.
    stats = weekly_recipes.process_sends()
    assert stats["sent"] == 0 and len(env) == 1 and _issue()["status"] == "draft"


def test_failed_test_copy_is_retried_by_the_next_build(env, monkeypatch):
    from backend.services import weekly_recipes

    monkeypatch.delenv("EMAIL_WEEKLY_TEST_TO")
    out = weekly_recipes.build_issue(day=WED)
    assert out["test"] == {"sent": False, "reason": "no_test_recipient"} and env == []
    monkeypatch.setenv("EMAIL_WEEKLY_TEST_TO", OWNER)
    retry = weekly_recipes.build_issue(day=WED)
    assert retry["created"] is False and retry["test"]["sent"] is True
    assert _sent_to(env) == [OWNER]


def test_test_copy_respects_the_gate(env, monkeypatch):
    from backend.services import weekly_recipes

    monkeypatch.delenv("EMAIL_JOURNEYS_ENABLED")
    out = weekly_recipes.build_issue(day=WED)
    assert out["created"] and out["test"]["sent"] is False and out["test"]["reason"] == "journeys_disabled"
    assert env == []


def test_rotation_never_repeats_recently_and_skipped_issues_do_not_count(env):
    from backend.services import weekly_recipes

    seen: list[list[str]] = []
    for i in range(4):
        out = weekly_recipes.build_issue(day=WED + timedelta(days=7 * i), send_test=False)
        seen.append(out["recipes"])
    flat = [s for week in seen for s in week]
    assert len(flat) == len(set(flat)) == 12
    tips = {_issue(f"2026-W{48 + i}")["tip_id"] for i in range(4)}
    assert len(tips) == 4
    # Skip the newest: its recipes become available again for the next issue.
    skipped = _issue("2026-W51")
    assert weekly_recipes.skip_issue(skipped["id"])
    nxt = weekly_recipes.build_issue(day=WED + timedelta(days=28), send_test=False)
    assert set(nxt["recipes"]).isdisjoint(set(seen[0]) | set(seen[1]) | set(seen[2]))


# ---------------------------------------------------------------- audience and approval

def test_approved_issue_goes_to_the_right_people_once(env):
    from backend.services import weekly_recipes
    from database.db import db_connection

    confirmed, tok = _subscriber("confirmed")
    _subscriber("pending")
    unsubbed, _ = _subscriber("unsubscribed")
    suppressed, _ = _subscriber("confirmed")
    uid, user_email, user_tok = _user(opted_in=True)
    _user(opted_in=False)
    both_email, _ = _subscriber("confirmed")  # also an app user with the same address
    both_uid = str(uuid.uuid4())
    with db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("INSERT INTO users (id, name, email) VALUES (%s, 'Dup', %s)", (both_uid, both_email))
            cur.execute("INSERT INTO email_suppressions (email, reason) VALUES (%s, 'bounced')", (suppressed,))
    from backend.services import email_journeys

    email_journeys._ensure_unsubscribe_token(both_uid)
    weekly_recipes.set_user_opt_in(both_uid, True)

    weekly_recipes.build_issue(day=WED)
    env.clear()
    stats = _approve_and_send(_issue()["id"])
    assert _sent_to(env) == sorted([confirmed, user_email, both_email])
    assert unsubbed not in str(env) and suppressed not in str(env)
    assert stats["sent"] == 3 and stats["completed"] == ["2026-W48"]
    issue = _issue()
    assert issue["status"] == "sent" and issue["recipients_total"] == 3 and issue["send_completed_at"]
    assert issue["approved_by"] == "admin-1"

    by_to = {p["to"][0]: p for p in env}
    sub_mail, user_mail = by_to[confirmed], by_to[user_email]
    assert f"token={tok}&list=recipes" in sub_mail["headers"]["List-Unsubscribe"]
    assert f"token={user_tok}&list=weekly" in user_mail["headers"]["List-Unsubscribe"]
    assert user_mail["headers"]["List-Unsubscribe-Post"] == "List-Unsubscribe=One-Click"
    assert "list=recipes" in by_to[both_email]["headers"]["List-Unsubscribe"]  # one email, subscriber link wins
    assert "[TEST]" not in sub_mail["subject"] and "test copy" not in sub_mail["html"]
    assert "/api/public/email/click?s=" in sub_mail["html"] and "p=/auth/signin/" in sub_mail["html"]
    assert "p=/dashboard/" in user_mail["html"] and "1 Test Street, Testville" in user_mail["html"]

    # A second run, even a repeated approval, never sends again.
    assert weekly_recipes.approve_issue(issue["id"], "admin-2") is None
    again = weekly_recipes.process_sends()
    assert again["sent"] == 0 and len(env) == 3


def test_closed_gate_holds_an_approved_issue_until_mail_is_on(env, monkeypatch):
    from backend.services import weekly_recipes

    email, _ = _subscriber()
    weekly_recipes.build_issue(day=WED, send_test=False)
    monkeypatch.delenv("EMAIL_JOURNEYS_ENABLED")
    stats = _approve_and_send(_issue()["id"])
    assert stats["sent"] == 0 and stats["held"] >= 1 and env == []
    assert _issue()["status"] == "approved" and _issue()["send_started_at"] is None
    # Test mode: only an allowlisted address could receive it, and the subscriber is not on the list.
    monkeypatch.setenv("EMAIL_JOURNEYS_TEST_RECIPIENTS", OWNER)
    assert weekly_recipes.process_sends()["sent"] == 0 and env == []
    # Mail switched on: the next run sends.
    monkeypatch.delenv("EMAIL_JOURNEYS_TEST_RECIPIENTS")
    monkeypatch.setenv("EMAIL_JOURNEYS_ENABLED", "true")
    assert weekly_recipes.process_sends()["sent"] == 1
    assert _sent_to(env) == [email] and _issue()["status"] == "sent"


def test_missing_mailing_address_holds_the_send(env, monkeypatch):
    from backend.services import weekly_recipes

    _subscriber()
    weekly_recipes.build_issue(day=WED, send_test=False)
    monkeypatch.delenv("EMAIL_MAILING_ADDRESS")
    stats = _approve_and_send(_issue()["id"])
    assert stats["sent"] == 0 and env == [] and _issue()["status"] == "approved"


def test_big_list_is_sent_across_runs_and_resumes(env, monkeypatch):
    from backend.services import weekly_recipes

    emails = {_subscriber()[0] for _ in range(5)}
    monkeypatch.setattr(weekly_recipes, "MAX_PER_RUN", 2)
    weekly_recipes.build_issue(day=WED, send_test=False)
    first = _approve_and_send(_issue()["id"])
    assert first["sent"] == 2 and _issue()["status"] == "sending" and first["completed"] == []
    assert weekly_recipes.process_sends()["sent"] == 2
    last = weekly_recipes.process_sends()
    assert last["sent"] == 1 and last["completed"] == ["2026-W48"]
    assert _sent_to(env) == sorted(emails) and len(env) == 5  # nobody twice
    assert _issue()["status"] == "sent"


def test_a_failed_send_is_retried_on_the_next_run(env, monkeypatch):
    import resend

    from backend.services import weekly_recipes

    good, _ = _subscriber()
    bad, _ = _subscriber()
    real = resend.Emails.send
    calls = {"n": 0}

    def flaky(params):
        if params["to"][0] == bad and calls["n"] == 0:
            calls["n"] += 1
            raise RuntimeError("resend is down")
        return real(params)

    monkeypatch.setattr(resend.Emails, "send", staticmethod(flaky))
    weekly_recipes.build_issue(day=WED, send_test=False)
    first = _approve_and_send(_issue()["id"])
    assert first["failed"] == 1 and first["sent"] == 1 and _issue()["status"] == "sending"
    second = weekly_recipes.process_sends()
    assert second["sent"] == 1 and second["failed"] == 0 and _issue()["status"] == "sent"
    assert _sent_to(env) == sorted([good, bad])


def test_an_address_that_keeps_failing_does_not_block_the_issue_forever(env, monkeypatch):
    import resend

    from backend.services import weekly_recipes
    from database.db import db_connection

    good, _ = _subscriber()
    bad, _ = _subscriber()
    real = resend.Emails.send

    def always_fails_for_bad(params):
        if params["to"][0] == bad:
            raise RuntimeError("mailbox rejected")
        return real(params)

    monkeypatch.setattr(resend.Emails, "send", staticmethod(always_fails_for_bad))
    weekly_recipes.build_issue(day=WED, send_test=False)
    _approve_and_send(_issue()["id"])
    assert _issue()["status"] == "sending"
    assert weekly_recipes.process_sends()["failed"] == 1 and _issue()["status"] == "sending"  # retried, still inside the day
    with db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("UPDATE email_weekly_issues SET send_started_at = now() - interval '25 hours'")
    last = weekly_recipes.process_sends()
    assert last["gave_up"] == 1 and last["completed"] == ["2026-W48"] and _issue()["status"] == "sent"
    assert _sent_to(env) == [good]


def test_test_mode_skips_other_addresses_but_still_reaches_an_allowlisted_one(env, monkeypatch):
    from backend.services import weekly_recipes

    other, _ = _subscriber()
    mine, _ = _subscriber()
    weekly_recipes.build_issue(day=WED, send_test=False)
    monkeypatch.delenv("EMAIL_JOURNEYS_ENABLED")
    monkeypatch.setenv("EMAIL_JOURNEYS_TEST_RECIPIENTS", mine)
    stats = _approve_and_send(_issue()["id"])
    assert _sent_to(env) == [mine] and stats["sent"] == 1 and stats["held"] == 1
    assert other not in str(env) and _issue()["status"] == "sending"  # not "sent": the rest of the list is still held


def test_a_second_sender_cannot_run_at_the_same_time(env):
    import psycopg2

    from backend.services import weekly_recipes

    _subscriber()
    weekly_recipes.build_issue(day=WED, send_test=False)
    weekly_recipes.approve_issue(_issue()["id"], "admin-1")
    other = psycopg2.connect(os.environ["DATABASE_URL"])
    try:
        cur = other.cursor()
        cur.execute("SELECT pg_advisory_lock(%s)", (weekly_recipes.LOCK_KEY,))
        stats = weekly_recipes.process_sends()
        assert stats["locked"] is True and stats["sent"] == 0 and env == []
        cur.execute("SELECT pg_advisory_unlock(%s)", (weekly_recipes.LOCK_KEY,))
    finally:
        other.close()
    assert weekly_recipes.process_sends()["sent"] == 1


# ---------------------------------------------------------------- skip, auto-send

def test_skip_blocks_sending_and_cannot_undo_a_started_send(env):
    from backend.services import weekly_recipes

    _subscriber()
    weekly_recipes.build_issue(day=WED, send_test=False)
    issue = _issue()
    assert weekly_recipes.skip_issue(issue["id"]) is True
    assert weekly_recipes.approve_issue(issue["id"], "admin-1") is None
    assert weekly_recipes.process_sends()["sent"] == 0 and env == []
    nxt = weekly_recipes.build_issue(day=WED + timedelta(days=7), send_test=False)
    _approve_and_send(nxt["id"])
    assert weekly_recipes.skip_issue(nxt["id"]) is False  # already sent


def test_auto_send_is_off_by_default_and_waits_for_the_review_window_when_on(env, monkeypatch):
    from backend.services import weekly_recipes
    from database.db import db_connection

    email, _ = _subscriber()
    weekly_recipes.build_issue(day=WED)  # test copy goes to the owner
    env.clear()
    old = datetime.now(timezone.utc) - timedelta(hours=30)
    with db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("UPDATE email_weekly_issues SET test_sent_at = %s", (old,))
    assert weekly_recipes.auto_send_enabled() is False
    assert weekly_recipes.process_sends()["sent"] == 0 and _issue()["status"] == "draft" and env == []

    monkeypatch.setenv("EMAIL_WEEKLY_AUTO_SEND", "true")
    with db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("UPDATE email_weekly_issues SET test_sent_at = now() - interval '2 hours'")
    assert weekly_recipes.process_sends()["auto_approved"] == 0 and _issue()["status"] == "draft"  # still inside 24h

    with db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("UPDATE email_weekly_issues SET test_sent_at = %s", (old,))
    stats = weekly_recipes.process_sends()
    assert stats["auto_approved"] == 1 and stats["sent"] == 1 and _sent_to(env) == [email]
    assert _issue()["approved_by"] == "auto" and _issue()["status"] == "sent"


def test_auto_send_never_approves_an_issue_with_no_test_copy_or_a_skipped_one(env, monkeypatch):
    from backend.services import weekly_recipes

    _subscriber()
    monkeypatch.setenv("EMAIL_WEEKLY_AUTO_SEND", "true")
    monkeypatch.setenv("EMAIL_WEEKLY_AUTO_SEND_DELAY_HOURS", "1")
    weekly_recipes.build_issue(day=WED, send_test=False)  # no test copy was ever sent
    assert weekly_recipes.process_sends()["auto_approved"] == 0 and _issue()["status"] == "draft"


# ---------------------------------------------------------------- unsubscribe and preferences

def test_weekly_unsubscribe_link_removes_an_app_user_and_can_be_undone(env, client):
    from backend.services import weekly_recipes

    uid, email, token = _user()
    other_uid, other_email, _ = _user()
    page = client.get(f"/api/public/email/unsubscribe?token={token}&list=weekly")
    assert page.status_code == 200 and "Unsubscribe" in page.text and weekly_recipes.get_user_opt_in(uid)  # GET never unsubscribes
    r = client.post(f"/api/public/email/unsubscribe?token={token}&list=weekly")
    assert r.status_code == 200 and "unsubscribed" in r.text.lower()
    assert not weekly_recipes.get_user_opt_in(uid) and weekly_recipes.get_user_opt_in(other_uid)
    assert [a["email"] for a in weekly_recipes.audience()] == [other_email]
    back = client.post(f"/api/public/email/unsubscribe?token={token}&list=weekly&action=resubscribe")
    assert back.status_code == 200 and weekly_recipes.get_user_opt_in(uid)
    assert client.post("/api/public/email/unsubscribe?token=nope&list=weekly").status_code == 404


def test_recipe_unsubscribe_removes_a_subscriber_from_the_weekly(env, client):
    from backend.services import weekly_recipes

    email, token = _subscriber()
    assert [a["email"] for a in weekly_recipes.audience()] == [email]
    assert client.post(f"/api/public/email/unsubscribe?token={token}&list=recipes").status_code == 200
    assert weekly_recipes.audience() == []


def test_preferences_api_offers_the_weekly_toggle_only_when_mail_is_on(env, client, auth_headers, monkeypatch):
    data = client.get("/api/email-preferences", headers=auth_headers).json()["data"]
    assert data["weeklyRecipesAvailable"] is True and data["weeklyRecipes"] is False  # never on by default
    r = client.put("/api/email-preferences", json={"weeklyRecipes": True}, headers=auth_headers)
    assert r.status_code == 200 and r.json()["data"]["weeklyRecipes"] is True
    assert client.put("/api/email-preferences", json={"weeklyRecipes": False}, headers=auth_headers).json()["data"]["weeklyRecipes"] is False
    monkeypatch.delenv("EMAIL_JOURNEYS_ENABLED")
    off = client.get("/api/email-preferences", headers=auth_headers).json()["data"]
    assert off["weeklyRecipesAvailable"] is False
    assert client.put("/api/email-preferences", json={"weeklyRecipes": True}, headers=auth_headers).status_code == 409
    # Turning other settings on or off is unaffected.
    assert client.put("/api/email-preferences", json={"lowStockDigest": False}, headers=auth_headers).status_code == 200
    assert client.get("/api/email-preferences").status_code == 401


# ---------------------------------------------------------------- admin

def test_admin_sees_issues_with_real_stats_and_can_approve_or_skip(env, client, auth_headers, monkeypatch):
    from backend.services import weekly_recipes
    from database.db import db_connection

    monkeypatch.setenv("ADMIN_USER_IDS", auth_headers["x-user-id"])
    sub, _ = _subscriber()
    _subscriber()
    weekly_recipes.build_issue(day=WED)
    issue = _issue()

    view = client.get("/api/admin/email-marketing?period=7d", headers=auth_headers).json()["data"]["weekly"]
    assert view["auto_send"] is False and view["test_recipient_set"] is True
    assert view["audience"] == {"subscribers": 2, "app_users": 0, "total": 2}
    row = view["issues"][0]
    assert row["issue_key"] == "2026-W48" and row["status"] == "draft" and row["can_approve"] and row["can_skip"]
    assert row["stats"]["sent"] == 0 and row["test_sent_at"] and len(row["recipes"]) == 3
    assert OWNER not in str(view)  # the owner address is never shown

    url = f"/api/admin/email-marketing/weekly/{issue['id']}/approve"
    assert client.post(url).status_code in (401, 403)
    monkeypatch.delenv("ADMIN_USER_IDS")
    assert client.post(url, headers=auth_headers).status_code == 403
    monkeypatch.setenv("ADMIN_USER_IDS", auth_headers["x-user-id"])
    env.clear()
    ok = client.post(url, headers=auth_headers)
    assert ok.status_code == 200 and ok.json()["data"]["status"] == "approved"
    assert len(env) == 2 and _issue()["status"] == "sent" and _issue()["approved_by"] == auth_headers["x-user-id"]
    assert client.post(url, headers=auth_headers).status_code == 409

    with db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "UPDATE email_sends SET status = 'delivered', opened_at = now(), clicked_at = now() "
                "WHERE journey = 'weekly_recipes' AND journey_step = '2026-W48' AND to_email = %s",
                (sub,),
            )
    stats = client.get("/api/admin/email-marketing?period=7d", headers=auth_headers).json()["data"]["weekly"]["issues"][0]
    assert stats["status"] == "sent" and not stats["can_approve"] and not stats["can_skip"]
    assert stats["stats"]["sent"] == 2 and stats["stats"]["opened"] == 1 and stats["stats"]["clicked"] == 1
    assert stats["stats"]["open_rate"] == 0.5  # the [TEST] copy is not counted

    nxt = weekly_recipes.build_issue(day=WED + timedelta(days=7), send_test=False)
    skip = f"/api/admin/email-marketing/weekly/{nxt['id']}/skip"
    assert client.post(skip).status_code in (401, 403)
    assert client.post(skip, headers=auth_headers).status_code == 200
    assert client.post(skip, headers=auth_headers).status_code == 409
    assert client.get(f"/api/admin/email-marketing?period=7d", headers=auth_headers).json()["data"]["weekly"]["issues"][0]["status"] == "skipped"


def test_job_cli_builds_and_sends_nothing_to_the_list(env, capsys):
    from backend.jobs import weekly_recipes as job

    _subscriber()
    assert job.main(["build", "--date", "2026-11-25"]) == 0
    assert '"created": true' in capsys.readouterr().out
    assert _sent_to(env) == [OWNER]
    assert job.main(["send"]) == 0
    assert '"sent": 0' in capsys.readouterr().out and len(env) == 1
    assert job.main(["test", "2026-W48"]) == 0 and len(env) == 2 and _sent_to(env) == [OWNER, OWNER]
    assert job.main(["test", "2099-W01"]) == 1
    assert job.main([]) == 2
