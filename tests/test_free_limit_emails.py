"""PP-248: free-limit lifecycle emails (near limit at 45, hit limit at 50)."""

from contextlib import contextmanager
from datetime import datetime, timedelta, timezone

import pytest

from backend.jobs import email_journeys as job
from backend.services import free_limit_emails as fle

SINCE = datetime(2026, 11, 28, tzinfo=timezone.utc)
AFTER = SINCE + timedelta(hours=1)
BEFORE = SINCE - timedelta(days=1)


def _row(uid="u-1", email="cook@gmail.com", items=45, near=AFTER, limit=None, name="Sam Cook"):
    return {"user_id": uid, "email": email, "name": name, "items": items,
            "crossed_near_at": near, "crossed_limit_at": limit}


@pytest.fixture
def env(monkeypatch):
    monkeypatch.setenv("FREE_LIMIT_EMAILS_ENABLED", "1")
    monkeypatch.setenv("FREE_LIMIT_EMAILS_SINCE", SINCE.isoformat())
    monkeypatch.setenv("ADMIN_EMAILS", "boss@gmail.com")
    monkeypatch.delenv("FREE_LIMIT_EMAILS_EXCLUDE", raising=False)
    monkeypatch.delenv("ADMIN_USER_IDS", raising=False)
    sent = []
    state = {"rows": [], "suppressed": set(), "seen_keys": set(), "sql": []}

    class Cur:
        def execute(self, sql, params):
            state["sql"].append((sql, params))

        def fetchall(self):
            return state["rows"]

    @contextmanager
    def fake_conn():
        class Conn:
            @contextmanager
            def cursor(self):
                yield Cur()
        yield Conn()

    def fake_send(**kw):
        if kw["idempotency_key"] in state["seen_keys"]:
            return {"skipped": True, "reason": "already_sent"}
        state["seen_keys"].add(kw["idempotency_key"])
        sent.append(kw)
        return {"skipped": False, "id": "re_1"}

    monkeypatch.setattr(fle, "db_connection", fake_conn)
    monkeypatch.setattr(fle.email_service, "send_email", fake_send)
    monkeypatch.setattr(fle.email_service, "is_suppressed", lambda e: e in state["suppressed"])
    monkeypatch.setattr(fle.email_journeys, "_ensure_unsubscribe_token", lambda uid: ("tok-" + uid, True))
    monkeypatch.setattr(fle.first_month_offer, "is_enabled", lambda: True)
    state["sent"] = sent
    return state


def test_off_by_default(monkeypatch, env):
    monkeypatch.delenv("FREE_LIMIT_EMAILS_ENABLED")
    env["rows"] = [_row()]
    stats = fle.run()
    assert stats["sent"] == 0 and env["sent"] == [] and env["sql"] == []


def test_needs_since_for_forward_only(monkeypatch, env):
    monkeypatch.delenv("FREE_LIMIT_EMAILS_SINCE")
    env["rows"] = [_row()]
    assert fle.run()["sent"] == 0 and env["sent"] == []


def test_near_limit_email_once_with_offer_and_unsubscribe(env):
    env["rows"] = [_row(items=46)]
    assert fle.run()["sent"] == 1
    assert fle.run()["already_sent"] == 1
    assert len(env["sent"]) == 1
    msg = env["sent"][0]
    assert msg["idempotency_key"] == "free_limit:near_limit:u-1"
    assert msg["category"] == "lifecycle"
    assert msg["unsubscribe_url"] and "tok-u-1" in msg["unsubscribe_url"]
    assert "46 of 50" in msg["subject"]
    assert "$1 for the first month" in msg["text"]
    assert "Unsubscribe" in msg["text"] or "Unsubscribe" in msg["html"]
    assert "Hi Sam," in msg["text"]
    assert "[TEST]" not in msg["subject"]


def test_limit_email_only_when_at_50(env):
    env["rows"] = [_row(items=50, near=AFTER, limit=AFTER)]
    fle.run()
    assert [m["idempotency_key"] for m in env["sent"]] == ["free_limit:hit_limit:u-1"]
    assert "hit the 50-item free limit" in env["sent"][0]["subject"]


def test_no_backfill_for_thresholds_crossed_before_since(env):
    env["rows"] = [_row(items=47, near=BEFORE), _row(uid="u-2", items=55, near=BEFORE, limit=BEFORE)]
    stats = fle.run()
    assert env["sent"] == [] and stats["not_due"] == 2


def test_limit_crossed_after_since_still_sends_when_near_was_before(env):
    env["rows"] = [_row(items=50, near=BEFORE, limit=AFTER)]
    fle.run()
    assert [m["idempotency_key"] for m in env["sent"]] == ["free_limit:hit_limit:u-1"]


@pytest.mark.parametrize("email", [
    "thindery@gmail.com", "tylor.thindery@outlook.com", "hello@mypantryhub.com", "boss@gmail.com",
    "test@gmail.com", "cook+test@gmail.com", "x@example.com", "qa.bot@gmail.com", "e2e-user@gmail.com", "",
])
def test_internal_and_test_accounts_skipped(env, email):
    env["rows"] = [_row(email=email)]
    stats = fle.run()
    assert env["sent"] == [] and stats["skipped_internal"] == 1


def test_excluded_by_env_and_admin_ids(monkeypatch, env):
    monkeypatch.setenv("FREE_LIMIT_EMAILS_EXCLUDE", "friend@gmail.com")
    monkeypatch.setenv("ADMIN_USER_IDS", "u-9")
    env["rows"] = [_row(email="friend@gmail.com"), _row(uid="u-9", email="real@gmail.com")]
    assert fle.run()["skipped_internal"] == 2 and env["sent"] == []


def test_suppressed_skipped(env):
    env["suppressed"] = {"cook@gmail.com"}
    env["rows"] = [_row()]
    assert fle.run()["skipped_suppressed"] == 1 and env["sent"] == []


def test_query_filters_free_tier_and_opted_out():
    sql = fle._CANDIDATES_SQL
    assert "COALESCE(s.tier, 'free') = 'free'" in sql
    assert "COALESCE(ep.onboarding_tips, TRUE)" in sql


def test_unsubscribed_user_not_sent(monkeypatch, env):
    monkeypatch.setattr(fle.email_journeys, "_ensure_unsubscribe_token", lambda uid: ("tok", False))
    env["rows"] = [_row()]
    fle.run()
    assert env["sent"] == []


def test_dry_run_sends_nothing(env):
    env["rows"] = [_row()]
    assert fle.run(dry_run=True)["sent"] == 1
    assert env["sent"] == []


def test_offer_line_falls_back_when_offer_off(monkeypatch, env):
    monkeypatch.setattr(fle.first_month_offer, "is_enabled", lambda: False)
    env["rows"] = [_row()]
    fle.run()
    assert "$1" not in env["sent"][0]["text"]
    assert "$39.99/year" in env["sent"][0]["text"]


def test_copy_uses_honest_pro_list_and_no_model_names(env):
    env["rows"] = [_row(items=50, limit=AFTER)]
    fle.run()
    text = env["sent"][0]["text"]
    for bad in ("Cloud sync", "Priority support", "CSV export", "Grok", "GPT", "Claude", "Gemini", "guarantee"):
        assert bad not in text
    assert "Unlimited pantry items" in text


def test_send_test_marks_both_test(env):
    results = fle.send_test("thindery@gmail.com")
    assert len(results) == 2
    subjects = [m["subject"] for m in env["sent"]]
    assert all(s.startswith("[TEST] ") for s in subjects)
    assert all(m["to"] == "thindery@gmail.com" for m in env["sent"])
    assert {m["journey_step"] for m in env["sent"]} == {"near_limit_test", "hit_limit_test"}


def test_job_runs_free_limit_after_journeys(monkeypatch, capsys):
    calls = []
    monkeypatch.setattr(job.email_journeys, "run", lambda dry_run=False: calls.append("journeys") or {})
    monkeypatch.setattr(job.free_limit_emails, "run", lambda dry_run=False: calls.append("free_limit") or {"sent": 0})
    assert job.main(["--dry-run"]) == 0
    assert calls == ["journeys", "free_limit"]


def test_job_survives_free_limit_failure(monkeypatch):
    monkeypatch.setattr(job.email_journeys, "run", lambda dry_run=False: {})

    def boom(dry_run=False):
        raise RuntimeError("db down")

    monkeypatch.setattr(job.free_limit_emails, "run", boom)
    assert job.main([]) == 0
