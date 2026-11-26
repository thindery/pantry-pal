"""PP-183 AI recipe builder: guardrails fail closed, provider order, PP-138 shape.

Provider HTTP goes through llm_client._post, which every test patches so we can
assert the exact number of provider calls (zero whenever a guard blocks).
The DB is replaced by a fake connection; usage numbers come from a patched
ai_guard.usage_snapshot.
"""

from __future__ import annotations

import json
from contextlib import contextmanager
from datetime import datetime, timedelta, timezone
from unittest.mock import MagicMock, patch

import httpx
import pytest

from backend.services import ai_guard, ai_recipe_builder, llm_client

USER = "test_user_contract_001"
URL = "/api/ai/recipes/suggest"

PANTRY = [
    {"id": "1", "name": "Spinach", "quantity": 1, "unit": "bags", "category": "produce", "lastUpdated": "2026-11-10T00:00:00Z"},
    {"id": "2", "name": "Eggs", "quantity": 12, "unit": "units", "category": "dairy", "lastUpdated": "2026-11-20T00:00:00Z"},
    {"id": "3", "name": "Rice", "quantity": 2, "unit": "bags", "category": "pantry", "lastUpdated": "2026-11-01T00:00:00Z"},
    {"id": "4", "name": "Empty Thing", "quantity": 0, "unit": "units", "category": "pantry", "lastUpdated": "2026-11-01T00:00:00Z"},
]

MODEL_JSON = {
    "recipes": [
        {
            "title": "Spinach Egg Fried Rice",
            "minutes": 20,
            "servings": 2,
            "ingredients": [
                {"name": "rice", "amount": "2 cups cooked"},
                {"name": "eggs", "amount": "3"},
                {"name": "spinach", "amount": "2 cups"},
                {"name": "soy sauce", "amount": "2 tbsp"},
            ],
            "steps": ["Scramble the eggs.", "Add rice and spinach.", "Season with soy sauce."],
        },
        {
            "title": "Spinach Omelet",
            "minutes": 10,
            "servings": 2,
            "ingredients": [{"name": "eggs", "amount": "4"}, {"name": "spinach", "amount": "1 cup"}],
            "steps": ["Whisk eggs.", "Cook with spinach."],
        },
    ]
}


def ollama_ok(data=MODEL_JSON, prompt_tokens=400, completion_tokens=600):
    return httpx.Response(
        200,
        json={"message": {"content": json.dumps(data)}, "prompt_eval_count": prompt_tokens, "eval_count": completion_tokens},
    )


def gemini_ok(data=MODEL_JSON):
    return httpx.Response(
        200,
        json={
            "candidates": [{"content": {"parts": [{"text": json.dumps(data)}]}}],
            "usageMetadata": {"promptTokenCount": 300, "candidatesTokenCount": 500},
        },
    )


class FakeCursor:
    def __init__(self, db):
        self.db = db
        self._last = ""

    def execute(self, sql, params=None):
        self._last = sql
        self.db.executed.append((sql, params))

    def fetchone(self):
        for needle, row in self.db.rows.items():
            if needle in self._last:
                return row
        return None

    def fetchall(self):
        return []

    def __enter__(self):
        return self

    def __exit__(self, *a):
        return False


class FakeDB:
    def __init__(self):
        self.executed: list = []
        self.rows: dict = {}

    @contextmanager
    def connection(self):
        conn = MagicMock()
        conn.cursor = lambda: FakeCursor(self)
        yield conn

    def sql(self, needle):
        return [(s, p) for s, p in self.executed if needle in s]


def snap(user_week=0, global_week=0, hour=0):
    return {"user_week": user_week, "global_week": global_week, "user_hour_requests": hour, "user_resets": None}


@pytest.fixture
def env(monkeypatch):
    monkeypatch.setenv("AI_FEATURES_ENABLED", "1")
    monkeypatch.setenv("OLLAMA_API_KEY", "test-ollama-key-not-real")
    monkeypatch.setenv("OLLAMA_HOST", "https://ollama.com")
    monkeypatch.setenv("GEMINI_API_KEY", "test-gemini-key-not-real")
    monkeypatch.setenv("AI_USER_WEEKLY_TOKENS", "50000")
    monkeypatch.setenv("AI_GLOBAL_WEEKLY_TOKENS", "300000")
    monkeypatch.setenv("AI_USER_HOURLY_REQUESTS", "10")
    monkeypatch.delenv("OLLAMA_TEXT_MODEL", raising=False)
    monkeypatch.delenv("GEMINI_TEXT_MODEL", raising=False)
    llm_client.reset_state()
    ai_guard._in_flight.clear()
    yield
    llm_client.reset_state()
    ai_guard._in_flight.clear()


@pytest.fixture
def world(env):
    """Pro user, fake DB, zero usage, provider HTTP mocked (no default response)."""
    db = FakeDB()
    post = MagicMock(name="provider_post")
    usage = MagicMock(name="usage_snapshot", return_value=snap())
    with patch.object(ai_guard, "db_connection", db.connection), patch.object(
        ai_guard, "usage_snapshot", usage
    ), patch.object(llm_client, "_post", post), patch(
        "backend.routers.ai.subscription_service.get_or_create_user_subscription", return_value={"tier": "pro"}
    ) as sub, patch.object(ai_recipe_builder.pantry_service, "get_all_items", return_value=PANTRY):
        yield {"db": db, "post": post, "usage": usage, "sub": sub}


def urls(post):
    return [c.args[0] for c in post.call_args_list]


# ---------- happy path ----------

def test_pro_gets_recipes_from_ollama_only(client, auth_headers, world):
    world["post"].return_value = ollama_ok()
    r = client.post(URL, headers=auth_headers, json={"servings": 2})
    assert r.status_code == 200, r.text
    data = r.json()["data"]
    assert data["cached"] is False
    assert len(data["recipes"]) == 2
    first = data["recipes"][0]
    # PP-138 recipe shape: ingredients [{raw, name}], instructions [str], servings str
    assert first["ingredients"][0] == {"raw": "2 cups cooked rice", "name": "rice"}
    assert first["instructions"][0] == "Scramble the eggs."
    assert first["servings"] == "2"
    assert "Spinach" in first["usesSoon"]
    assert urls(world["post"]) == ["https://ollama.com/api/chat"]
    # reservation inserted, then real token counts recorded
    assert world["db"].sql("INSERT INTO llm_usage")
    updates = world["db"].sql("UPDATE llm_usage")
    assert updates and updates[0][1][:3] == ("ok", 400, 600)


def test_ollama_request_shape_and_model_alias(client, auth_headers, world):
    world["post"].return_value = ollama_ok()
    client.post(URL, headers=auth_headers, json={"servings": 4, "diet": "vegetarian", "maxMinutes": 30, "mustUse": ["Eggs"]})
    call = world["post"].call_args
    url, headers, payload = call.args[0], call.args[1], call.args[2]
    assert payload["model"] == "gemma4:31b"  # gemma4:cloud mapped for direct Ollama Cloud calls
    assert payload["options"]["num_predict"] == ai_recipe_builder.MAX_OUTPUT_TOKENS
    assert payload["stream"] is False
    assert headers["Authorization"].startswith("Bearer ")
    prompt = payload["messages"][0]["content"]
    assert "Servings: 4." in prompt and "vegetarian" in prompt and "30 minutes" in prompt and "Eggs" in prompt
    assert USER not in prompt
    assert "Empty Thing" not in prompt  # out of stock items are not sent
    # use-soon (perishable) items are listed first
    assert prompt.index("USE SOON:") < prompt.index("Spinach") < prompt.index("ALSO IN THE PANTRY:") < prompt.index("Rice")


# ---------- fail closed: zero provider calls ----------

def test_kill_switch_off_hides_and_blocks(client, auth_headers, world, monkeypatch):
    monkeypatch.setenv("AI_FEATURES_ENABLED", "0")
    assert client.get("/api/ai/recipes/status", headers=auth_headers).json()["data"] == {"enabled": False}
    r = client.post(URL, headers=auth_headers, json={})
    assert r.status_code == 404
    assert world["post"].call_count == 0


def test_free_user_gets_402_and_no_call(client, auth_headers, world):
    world["sub"].return_value = {"tier": "free"}
    r = client.post(URL, headers=auth_headers, json={})
    assert r.status_code == 402
    assert r.json()["error"]["code"] == "PRO_REQUIRED"
    assert world["post"].call_count == 0


def test_over_user_cap_blocks(client, auth_headers, world):
    world["usage"].return_value = snap(user_week=50_000)
    r = client.post(URL, headers=auth_headers, json={})
    assert r.status_code == 429
    body = r.json()["error"]
    assert body["code"] == "AI_WEEKLY_LIMIT"
    assert world["post"].call_count == 0
    assert not world["db"].sql("INSERT INTO llm_usage")


def test_estimate_would_cross_user_cap_blocks(client, auth_headers, world):
    world["usage"].return_value = snap(user_week=50_000 - 100)  # below cap, but estimate pushes it over
    r = client.post(URL, headers=auth_headers, json={})
    assert r.status_code == 429
    assert world["post"].call_count == 0


def test_over_global_cap_blocks(client, auth_headers, world):
    world["usage"].return_value = snap(global_week=299_000)
    r = client.post(URL, headers=auth_headers, json={})
    assert r.status_code == 503
    assert r.json()["error"]["code"] == "AI_PAUSED"
    assert world["post"].call_count == 0


def test_usage_read_failure_blocks(client, auth_headers, world):
    world["usage"].side_effect = RuntimeError("db down")
    r = client.post(URL, headers=auth_headers, json={})
    assert r.status_code == 503
    assert r.json()["error"]["code"] == "AI_UNAVAILABLE"
    assert world["post"].call_count == 0


def test_db_connection_failure_blocks(client, auth_headers, world):
    @contextmanager
    def broken():
        raise RuntimeError("no db")
        yield  # pragma: no cover

    with patch.object(ai_guard, "db_connection", broken):
        r = client.post(URL, headers=auth_headers, json={})
    assert r.status_code == 503
    assert world["post"].call_count == 0


def test_auto_trip_pause_blocks(client, auth_headers, world):
    future = (datetime.now(timezone.utc) + timedelta(days=2)).isoformat()
    world["db"].rows["FROM ai_guard_state"] = {"value": future}
    r = client.post(URL, headers=auth_headers, json={})
    assert r.status_code == 503
    assert r.json()["error"]["code"] == "AI_PAUSED"
    assert world["post"].call_count == 0


def test_hourly_rate_limit_blocks(client, auth_headers, world):
    world["usage"].return_value = snap(hour=10)
    r = client.post(URL, headers=auth_headers, json={})
    assert r.status_code == 429
    assert r.json()["error"]["code"] == "AI_RATE_LIMITED"
    assert world["post"].call_count == 0


def test_one_in_flight_per_user(client, auth_headers, world):
    ai_guard._in_flight.add(USER)
    r = client.post(URL, headers=auth_headers, json={})
    assert r.status_code == 409
    assert world["post"].call_count == 0


def test_cache_hit_costs_nothing(client, auth_headers, world):
    cached = [{"title": "Cached", "ingredients": [{"raw": "x", "name": "x"}], "instructions": ["y"], "servings": "2"}]
    world["db"].rows["FROM ai_response_cache"] = {"response": json.dumps(cached)}
    r = client.post(URL, headers=auth_headers, json={})
    assert r.status_code == 200
    assert r.json()["data"]["cached"] is True
    assert r.json()["data"]["recipes"][0]["title"] == "Cached"
    assert world["post"].call_count == 0


def test_no_provider_configured_blocks(client, auth_headers, world, monkeypatch):
    monkeypatch.delenv("OLLAMA_API_KEY")
    monkeypatch.delenv("GEMINI_API_KEY")
    r = client.post(URL, headers=auth_headers, json={})
    assert r.status_code == 503
    assert world["post"].call_count == 0


def test_empty_pantry_no_call(client, auth_headers, world):
    with patch.object(ai_recipe_builder.pantry_service, "get_all_items", return_value=[]):
        r = client.post(URL, headers=auth_headers, json={})
    assert r.status_code == 400
    assert world["post"].call_count == 0


# ---------- fallback ----------

def test_ollama_quota_falls_back_to_gemini_once_and_never_retries(client, auth_headers, world):
    world["post"].side_effect = [httpx.Response(429, text="weekly usage limit reached"), gemini_ok()]
    r = client.post(URL, headers=auth_headers, json={})
    assert r.status_code == 200
    calls = urls(world["post"])
    assert calls[0] == "https://ollama.com/api/chat"
    assert "generativelanguage.googleapis.com" in calls[1] and "gemini-3.1-flash-lite" in calls[1]
    assert len(calls) == 2
    # Gemini key in a header, never in the URL
    assert "key=" not in calls[1]
    assert world["post"].call_args_list[1].args[1]["x-goog-api-key"]
    # both attempts reserved against the caps
    assert len(world["db"].sql("INSERT INTO llm_usage")) == 2
    # Ollama now in cooldown: next (uncached) request skips it
    world["post"].side_effect = [gemini_ok()]
    r2 = client.post(URL, headers=auth_headers, json={"servings": 3})
    assert r2.status_code == 200
    assert "ollama.com" not in urls(world["post"])[2]


def test_fallback_skipped_when_capped(client, auth_headers, world):
    # check_request_allowed read, Ollama reserve OK, then the Gemini reserve sees the global cap.
    world["usage"].side_effect = [snap(), snap(), snap(global_week=299_500)]
    world["post"].side_effect = [httpx.Response(500, text="boom")]
    r = client.post(URL, headers=auth_headers, json={})
    assert r.status_code == 503
    assert world["post"].call_count == 1  # Gemini never called


def test_ollama_error_and_bad_json_fall_back(client, auth_headers, world):
    world["post"].side_effect = [httpx.Response(200, json={"message": {"content": "not json"}, "eval_count": 5}), gemini_ok()]
    r = client.post(URL, headers=auth_headers, json={})
    assert r.status_code == 200
    assert world["post"].call_count == 2
    # failed attempt still records the tokens it returned
    assert world["db"].sql("UPDATE llm_usage")[0][1][0] == "failed"


def test_ollama_timeout_falls_back(client, auth_headers, world):
    world["post"].side_effect = [httpx.ReadTimeout("slow"), gemini_ok()]
    r = client.post(URL, headers=auth_headers, json={})
    assert r.status_code == 200
    assert world["post"].call_count == 2


def test_both_fail_friendly_503(client, auth_headers, world):
    world["post"].side_effect = [httpx.Response(500, text="x"), httpx.Response(503, text="overloaded")]
    r = client.post(URL, headers=auth_headers, json={})
    assert r.status_code == 503
    msg = r.json()["error"]["message"]
    assert "AI" in msg
    assert world["post"].call_count == 2


def test_auto_trip_at_90_percent(client, auth_headers, world):
    world["post"].return_value = ollama_ok()
    world["db"].rows["AS used FROM llm_usage"] = {"used": 270_000}
    r = client.post(URL, headers=auth_headers, json={})
    assert r.status_code == 200
    assert world["db"].sql("INSERT INTO ai_guard_state")


def test_no_auto_trip_below_90_percent(client, auth_headers, world):
    world["post"].return_value = ollama_ok()
    world["db"].rows["AS used FROM llm_usage"] = {"used": 100_000}
    client.post(URL, headers=auth_headers, json={})
    assert not world["db"].sql("INSERT INTO ai_guard_state")


# ---------- validation, auth, wording ----------

def test_requires_auth(client):
    assert client.post(URL, json={}).status_code == 401
    assert client.get("/api/ai/recipes/status").status_code == 401


def test_validation(client, auth_headers, world):
    assert client.post(URL, headers=auth_headers, json={"servings": 0}).status_code == 422
    assert client.post(URL, headers=auth_headers, json={"diet": "carnivore-ish"}).status_code == 422
    assert client.post(URL, headers=auth_headers, json={"mustUse": ["a", "b", "c", "d", "e", "f"]}).status_code == 422
    assert world["post"].call_count == 0


def test_status_for_pro(client, auth_headers, world):
    world["usage"].return_value = snap(user_week=1234)
    data = client.get("/api/ai/recipes/status", headers=auth_headers).json()["data"]
    assert data["enabled"] is True and data["eligible"] is True
    assert data["usage"]["usedTokens"] == 1234 and data["usage"]["limitTokens"] == 50000


def test_admin_endpoints_need_admin(client, auth_headers, world):
    assert client.get("/api/ai/admin/usage", headers=auth_headers).status_code == 403
    assert client.post("/api/ai/admin/resume", headers=auth_headers).status_code == 403


def test_user_facing_messages_name_no_model_or_vendor():
    now = datetime.now(timezone.utc)
    texts = [
        ai_guard.msg_user_cap(now),
        ai_guard.msg_user_cap(None),
        ai_guard.msg_global_pause(now),
        ai_guard.MSG_UNAVAILABLE,
        ai_guard.MSG_RATE,
        ai_guard.MSG_IN_FLIGHT,
        ai_guard.MSG_PRO_ONLY,
    ]
    for t in texts:
        low = t.lower()
        for banned in ("gemini", "ollama", "gemma", "google", "openai", "gpt", "llama"):
            assert banned not in low, (banned, t)


def test_evaluate_budget_pure():
    ai_guard.evaluate_budget(user_used=0, global_used=0, estimate=100, user_cap=1000, global_cap=1000)
    with pytest.raises(ai_guard.GuardBlocked):
        ai_guard.evaluate_budget(user_used=950, global_used=0, estimate=100, user_cap=1000, global_cap=10_000)
    with pytest.raises(ai_guard.GuardBlocked):
        ai_guard.evaluate_budget(user_used=0, global_used=950, estimate=100, user_cap=10_000, global_cap=1000)
    with pytest.raises(ai_guard.GuardBlocked):
        ai_guard.evaluate_budget(user_used=0, global_used=0, estimate=1, user_cap=0, global_cap=1000)


def test_window_start_aligns_to_reset_day(monkeypatch):
    monkeypatch.setenv("AI_WEEK_RESET_DOW", "0")
    wed = datetime(2026, 11, 25, 15, 0, tzinfo=timezone.utc)
    assert ai_guard.window_start(wed) == datetime(2026, 11, 23, 0, 0, tzinfo=timezone.utc)
    assert ai_guard.next_window_start(wed) == datetime(2026, 11, 30, 0, 0, tzinfo=timezone.utc)
    monkeypatch.setenv("AI_WEEK_RESET_DOW", "2")
    assert ai_guard.window_start(wed) == datetime(2026, 11, 25, 0, 0, tzinfo=timezone.utc)


def test_free_tier_cap_is_zero(env):
    assert ai_guard.user_weekly_cap("free") == 0
    assert ai_guard.user_weekly_cap("pro") == 50000


def test_normalize_drops_junk():
    pantry = ai_recipe_builder.select_pantry(PANTRY, [])
    with pytest.raises(ValueError):
        ai_recipe_builder.normalize_recipes({"recipes": [{"title": "", "ingredients": [], "steps": []}]}, pantry, 2)
    with pytest.raises(ValueError):
        ai_recipe_builder.normalize_recipes(["nope"], pantry, 2)


# ---------- regenerate / exclude titles ----------

def test_regenerate_bypasses_cache_and_excludes_titles(client, auth_headers, world):
    cached = [
        {
            "title": "Spinach Egg Fried Rice",
            "ingredients": [{"raw": "rice", "name": "rice"}],
            "instructions": ["cook"],
            "servings": "2",
            "usesSoon": [],
        }
    ]
    world["db"].rows["FROM ai_response_cache"] = {"response": json.dumps(cached)}
    world["post"].return_value = ollama_ok()
    r = client.post(
        URL,
        headers=auth_headers,
        json={"regenerate": True, "excludeTitles": ["Spinach Egg Fried Rice"]},
    )
    assert r.status_code == 200, r.text
    data = r.json()["data"]
    assert data["cached"] is False
    titles = [recipe["title"] for recipe in data["recipes"]]
    assert "Spinach Egg Fried Rice" not in titles
    assert "Spinach Omelet" in titles
    assert world["post"].call_count == 1
    payload = world["post"].call_args.args[2]
    prompt = payload["messages"][0]["content"]
    assert "Do not repeat these recipes: Spinach Egg Fried Rice" in prompt
    assert payload["options"]["temperature"] == 0.9
    # still wrote a cache row (write is allowed on regenerate)
    assert world["db"].sql("INSERT INTO ai_response_cache") or world["db"].sql("ON CONFLICT (cache_key)")


def test_all_excluded_returns_note_without_fallback(client, auth_headers, world):
    world["post"].return_value = ollama_ok()
    r = client.post(
        URL,
        headers=auth_headers,
        json={
            "regenerate": True,
            "excludeTitles": ["Spinach Egg Fried Rice", "Spinach Omelet"],
        },
    )
    assert r.status_code == 200, r.text
    data = r.json()["data"]
    assert data["recipes"] == []
    assert data["note"]
    assert "already saw" in data["note"].lower() or "similar" in data["note"].lower()
    assert world["post"].call_count == 1  # no Gemini fallback, no retry
    for banned in ("gemini", "ollama", "gemma"):
        assert banned not in data["note"].lower()


def test_regenerate_when_capped_makes_zero_calls(client, auth_headers, world):
    world["usage"].return_value = snap(user_week=50_000)
    r = client.post(
        URL,
        headers=auth_headers,
        json={"regenerate": True, "excludeTitles": ["Spinach Omelet"]},
    )
    assert r.status_code == 429
    assert world["post"].call_count == 0


def test_first_request_still_hits_cache_without_excludes(client, auth_headers, world):
    cached = [{"title": "Cached", "ingredients": [{"raw": "x", "name": "x"}], "instructions": ["y"], "servings": "2"}]
    world["db"].rows["FROM ai_response_cache"] = {"response": json.dumps(cached)}
    r = client.post(URL, headers=auth_headers, json={"servings": 2})
    assert r.status_code == 200
    assert r.json()["data"]["cached"] is True
    assert r.json()["data"]["recipes"][0]["title"] == "Cached"
    assert world["post"].call_count == 0


def test_snake_case_exclude_titles_accepted(client, auth_headers, world):
    world["post"].return_value = ollama_ok()
    r = client.post(
        URL,
        headers=auth_headers,
        json={"regenerate": True, "exclude_titles": ["Spinach Egg Fried Rice"]},
    )
    assert r.status_code == 200
    prompt = world["post"].call_args.args[2]["messages"][0]["content"]
    assert "Do not repeat these recipes: Spinach Egg Fried Rice" in prompt


def test_exclude_titles_cap(client, auth_headers, world):
    assert client.post(
        URL,
        headers=auth_headers,
        json={"excludeTitles": [f"Recipe {i}" for i in range(16)]},
    ).status_code == 422
    assert world["post"].call_count == 0


def test_default_temperature_on_first_request(client, auth_headers, world):
    world["post"].return_value = ollama_ok()
    client.post(URL, headers=auth_headers, json={"servings": 2})
    assert world["post"].call_args.args[2]["options"]["temperature"] == 0.6
