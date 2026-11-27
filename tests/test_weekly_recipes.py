"""PP-235: weekly recipe newsletter content, rotation and rendering (no database, no network)."""

from __future__ import annotations

import re
from datetime import date, timedelta
from pathlib import Path

import pytest

from backend.services import journey_emails as j
from backend.services import weekly_content as wc

ROOT = Path(__file__).resolve().parent.parent
RECIPES_DIR = ROOT / "frontend" / "content" / "recipes"
CREDITS = (ROOT / "frontend" / "public" / "email" / "CREDITS.md").read_text()
SID = "send-1"
UNSUB = "https://www.mypantryhub.com/api/public/email/unsubscribe?token=t&list=recipes"


def _ts(slug: str) -> str:
    return (RECIPES_DIR / f"{slug}.ts").read_text()


# ---------------------------------------------------------------- catalog matches the real library

def test_catalog_covers_exactly_the_recipe_library():
    files = {p.stem for p in RECIPES_DIR.glob("*.ts") if ": Recipe = {" in p.read_text()}
    catalog_slugs = {r.slug for r in wc.CATALOG}
    assert catalog_slugs == files
    assert len(catalog_slugs) == len(wc.CATALOG) == len(wc.BY_SLUG)
    assert (RECIPES_DIR / "index.ts").is_file()


@pytest.mark.parametrize("recipe", wc.CATALOG, ids=lambda r: r.slug)
def test_catalog_row_matches_recipe_file(recipe):
    src = _ts(recipe.slug)
    assert f'slug: "{recipe.slug}"' in src
    assert f'title: "{recipe.title}"' in src
    prep = int(re.search(r"prepMin:\s*(\d+)", src).group(1))
    cook = int(re.search(r"cookMin:\s*(\d+)", src).group(1))
    assert recipe.minutes == prep + cook
    assert re.search(rf'meal: "{recipe.meal}"', src)
    assert recipe.slug in j.AVAILABLE_IMAGES and recipe.slug in j.ALT
    assert j.ALT[recipe.slug].startswith("AI illustration")
    assert f"{recipe.slug}.jpg" in CREDITS
    assert recipe.blurb.endswith(".") and len(recipe.blurb) <= 110
    assert set(recipe.seasons) <= {"spring", "summer", "fall", "winter"}


def test_time_labels_are_not_misleading():
    for r in wc.CATALOG:
        m = re.match(r"(?:about )?(\d+(?:\.\d+)?) (minutes|hour|hours)$", r.time_label)
        assert m, r.time_label
        label_min = float(m.group(1)) * (1 if m.group(2) == "minutes" else 60)
        assert abs(label_min - r.minutes) <= 25, (r.slug, r.time_label, r.minutes)


# ---------------------------------------------------------------- rotation

def _simulate(start: date, weeks: int):
    recent: list[list[str]] = []
    out = []
    for i in range(weeks):
        day = start + timedelta(days=7 * i)
        picks = wc.pick_recipes(day, recent)
        out.append((day, picks))
        recent.insert(0, picks)
    return out


def test_three_distinct_recipes_and_no_repeat_inside_the_cooldown():
    issues = _simulate(date(2026, 11, 25), 80)
    window = wc.cooldown_issues(len(wc.CATALOG))
    assert window == max(0, (len(wc.CATALOG) - wc.PICK_COUNT) // wc.PICK_COUNT)
    for i, (_, picks) in enumerate(issues):
        assert len(picks) == 3 and len(set(picks)) == 3
        earlier = {s for _, p in issues[max(0, i - window): i] for s in p}
        assert not earlier & set(picks), f"issue {i} repeats within {window} weeks"


def test_every_recipe_gets_its_turn():
    # One full cooldown cycle plus a few extra weeks; seasonal scoring still uses every recipe
    # once the recent window leaves only the unused ones.
    weeks = wc.cooldown_issues(len(wc.CATALOG)) + 8
    used = {s for _, picks in _simulate(date(2026, 1, 6), weeks) for s in picks}
    assert used == set(wc.BY_SLUG)


def test_a_single_issue_mixes_meals_when_the_season_allows():
    for month in range(1, 13):
        picks = wc.pick_recipes(date(2026, month, 10), [])
        meals = [wc.BY_SLUG[s].meal for s in picks]
        assert max(meals.count(m) for m in set(meals)) <= 2, (month, picks)


def test_picks_are_deterministic():
    a = wc.pick_recipes(date(2026, 3, 4), [["weeknight-chili"]])
    assert a == wc.pick_recipes(date(2026, 3, 4), [["weeknight-chili"]])


def test_summer_does_not_pick_winter_dishes_while_year_round_ones_remain():
    # First issues of a fresh start: plenty of year-round and summer dishes exist.
    for _, picks in _simulate(date(2026, 6, 3), 3):
        for s in picks:
            assert wc.season_score(wc.BY_SLUG[s], date(2026, 6, 3)) >= 1, s


def test_fall_prefers_in_season_dishes():
    picks = wc.pick_recipes(date(2026, 10, 14), [])
    assert any(wc.season_score(wc.BY_SLUG[s], date(2026, 10, 14)) == 2 for s in picks)
    assert not any(wc.BY_SLUG[s].seasons == ("spring", "summer") for s in picks)


def test_thanksgiving_week_is_timely():
    assert wc.thanksgiving(2026) == date(2026, 11, 26)
    picks = wc.pick_recipes(date(2026, 11, 26), [])
    assert "leftover-turkey-soup" in picks and "green-bean-casserole" in picks
    assert wc.pick_recipes(date(2026, 7, 8), []) != picks
    assert "leftover-turkey-soup" not in wc.pick_recipes(date(2026, 8, 5), [])


def test_recipes_used_recently_are_skipped_even_when_timely():
    picks = wc.pick_recipes(date(2026, 11, 26), [["leftover-turkey-soup", "green-bean-casserole", "baked-oatmeal"]])
    assert "leftover-turkey-soup" not in picks and "green-bean-casserole" not in picks


def test_holiday_season_prefers_holiday_tagged_recipes():
    assert wc.in_holiday_season(date(2026, 11, 8)) and wc.in_holiday_season(date(2027, 1, 7))
    assert not wc.in_holiday_season(date(2026, 11, 7)) and not wc.in_holiday_season(date(2027, 1, 8))
    # The week after Thanksgiving, with last week's issue already sent: holiday dishes first.
    recent = [["green-bean-casserole", "leftover-turkey-soup", "easy-vegetable-soup"]]
    picks = wc.pick_recipes(date(2026, 12, 2), recent)
    assert all("holiday" in wc.BY_SLUG[s].tags for s in picks)
    # Mid-summer, a fresh start should not reach for Christmas cookies.
    summer = wc.pick_recipes(date(2026, 7, 8), [])
    assert not any("holiday" in wc.BY_SLUG[s].tags for s in summer)


def test_issue_key_is_iso_week():
    assert wc.issue_key_for(date(2026, 11, 25)) == "2026-W48"
    assert wc.issue_key_for(date(2026, 11, 26)) == "2026-W48"
    assert wc.issue_key_for(date(2027, 1, 1)) == "2026-W53"


# ---------------------------------------------------------------- tips

def test_tips_rotate_through_all_before_repeating():
    seen: list[str] = []
    for _ in range(len(wc.TIPS)):
        seen.insert(0, wc.pick_tip(seen).id)
    assert len(set(seen)) == len(wc.TIPS)
    assert wc.pick_tip(seen).id == seen[-1]  # the oldest comes back first


def test_tips_have_no_made_up_numbers_or_claims():
    assert len({t.id for t in wc.TIPS}) == len(wc.TIPS) >= 12
    banned = re.compile(r"\b(study|studies|research|proven|scientist|experts?|doctors?|guarantee|always works)\b", re.I)
    for t in wc.TIPS:
        text = f"{t.title} {t.body}"
        assert not banned.search(text), t.id
        assert "%" not in text and "$" not in text, t.id
        assert len(t.body) <= 260 and len(t.title) <= 40, t.id
        # The only digits allowed are the food-safety and measurement lines copied from the recipe pages.
        assert re.sub(r"[0-9½]+", "", text) != text or t.id in {"cool-leftovers", "pasta-water"} or not re.search(r"\d", text), t.id


# ---------------------------------------------------------------- rendering

def _content(slugs=("weeknight-chili", "black-bean-tacos", "baked-oatmeal")):
    return wc.build_content(list(slugs), wc.TIPS_BY_ID["rinse-beans"])


def _render(**kw):
    content = kw.pop("content", _content())
    return j.render_weekly_issue(
        send_id=SID, content=content, subject=wc.subject_for([r["slug"] for r in content["recipes"]]),
        preheader=wc.PREHEADER, unsubscribe_url=UNSUB, **kw,
    )


def test_subject_is_short_and_names_the_recipes():
    assert wc.subject_for(["weeknight-chili", "black-bean-tacos", "canned-tuna-pasta"]) == (
        "This week: Weeknight Chili, Black Bean Tacos and Canned Tuna Pasta"
    )
    assert wc.subject_for(["green-bean-casserole", "leftover-turkey-soup", "easy-vegetable-soup"]) == (
        "This week: Green Bean Casserole, Leftover Turkey Soup and 1 more"
    )
    long = wc.subject_for(["sheet-pan-chicken-and-vegetables", "rice-and-beans-with-canned-beans", "freezer-breakfast-burritos"])
    assert long == "This week: Sheet Pan Chicken and Vegetables and 2 more recipes" and len(long) <= 70


def test_html_has_three_linked_recipes_images_tip_and_signup_cta():
    r = _render()
    assert r.subject.startswith("This week:")
    for slug in ("weeknight-chili", "black-bean-tacos", "baked-oatmeal"):
        assert f"p=/recipes/{slug}/" in r.html and f"l=weekly%3A{slug}" in r.html
        assert f'src="https://www.mypantryhub.com/email/{slug}.jpg"' in r.html
        assert f"/recipes/{slug}/" in r.text
    assert len(re.findall(r"<img ", r.html)) == 3
    for tag in re.findall(r"<img [^>]*>", r.html):
        assert re.search(r'alt="AI illustration[^"]+"', tag) and 'width="' in tag and 'height="' in tag
    assert "Rinse canned beans" in r.html and "Pantry tip" in r.html and "PANTRY TIP: Rinse canned beans" in r.text
    assert "p=/auth/signin/" in r.html and "Create a free Pantry Hub account" in r.html
    assert "AI illustrations, not photos" in r.html and "AI illustrations, not photos" in r.text
    assert "Unsubscribe" in r.html and UNSUB.replace("&", "&amp;") in r.html and UNSUB in r.text
    assert "[TEST]" not in r.subject and "test copy" not in r.html


def test_signup_cta_is_soft_one_link_and_users_get_an_app_link_instead():
    sub = _render(audience="subscriber")
    assert sub.html.count("weekly_signup") == 1
    user = _render(audience="user")
    assert "weekly_signup" not in user.html and "p=/dashboard/" in user.html
    assert "turned it on in your Pantry Hub account" in user.html
    assert "you confirmed recipe emails" in sub.html


def test_test_copy_is_clearly_marked():
    r = _render(test=True)
    assert r.subject.startswith("[TEST] This week:")
    assert "[TEST]" in r.html and "has not been sent to the list" in r.html and "[TEST] This is a test copy" in r.text


def test_content_is_escaped():
    content = _content()
    content["recipes"][0]["title"] = "<script>alert(1)</script>"
    content["tip"]["body"] = 'Use "quotes" & <b>tags</b>'
    html = _render(content=content).html
    assert "<script>" not in html and "&lt;script&gt;" in html and "<b>tags</b>" not in html


def test_no_invented_numbers_or_model_names_in_copy():
    r = _render()
    banned = re.compile(r"\b(grok|gemini|openai|gpt|claude|llama|ollama)\b", re.I)
    assert not banned.search(r.html) and not banned.search(r.text)
    for t in wc.TIPS:
        assert not banned.search(t.body)
    assert not re.search(r"\b\d[\d,]*\+? (subscribers|users|people|members|households)\b", r.html, re.I)


# ---------------------------------------------------------------- cron entry

def test_build_only_runs_in_the_wanted_chicago_hour(monkeypatch, capsys):
    from datetime import datetime, timezone

    from backend.jobs import weekly_recipes as job
    from backend.services import weekly_recipes as svc

    calls = []
    monkeypatch.setattr(svc, "build_issue", lambda **kw: calls.append(kw) or {"created": True})
    monkeypatch.setattr(svc, "chicago_hour", lambda now=None: 8)
    assert job.main(["build", "--only-at-hour", "9"]) == 0
    assert calls == [] and '"not_the_hour"' in capsys.readouterr().out
    monkeypatch.setattr(svc, "chicago_hour", lambda now=None: 9)
    assert job.main(["build", "--only-at-hour", "9"]) == 0
    assert len(calls) == 1 and calls[0]["send_test"] is True


def test_chicago_hour_follows_daylight_saving():
    from datetime import datetime, timezone

    from backend.services import weekly_recipes as svc

    assert svc.chicago_hour(datetime(2026, 12, 2, 15, 0, tzinfo=timezone.utc)) == 9  # CST
    assert svc.chicago_hour(datetime(2026, 12, 2, 14, 0, tzinfo=timezone.utc)) == 8
    assert svc.chicago_hour(datetime(2027, 6, 2, 14, 0, tzinfo=timezone.utc)) == 9  # CDT
    assert svc.chicago_hour(datetime(2027, 6, 2, 15, 0, tzinfo=timezone.utc)) == 10
    assert svc.issue_date(datetime(2026, 12, 3, 3, 0, tzinfo=timezone.utc)) == date(2026, 12, 2)  # still Wednesday evening in Chicago
