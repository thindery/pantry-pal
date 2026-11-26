"""PP-199: email copy and image rules (no database, no network)."""

from __future__ import annotations

import re
from pathlib import Path

import pytest
from PIL import Image

from backend.services import journey_emails as j

EMAIL_DIR = Path(__file__).resolve().parent.parent / "frontend" / "public" / "email"
RECIPES_DIR = Path(__file__).resolve().parent.parent / "frontend" / "content" / "recipes"
SID, UNSUB = "send-1", "https://www.mypantryhub.com/api/public/email/unsubscribe?token=t&list=recipes"

RENDERS = [
    lambda: j.render_confirm(send_id=SID, confirm_url="https://www.mypantryhub.com/api/public/email/confirm?token=t"),
    lambda: j.render_recipe_welcome(send_id=SID, unsubscribe_url=UNSUB),
    lambda: j.render_recipe_cupboard_dinners(send_id=SID, unsubscribe_url=UNSUB),
    lambda: j.render_recipe_know_your_pantry(send_id=SID, unsubscribe_url=UNSUB),
    lambda: j.render_onboarding_scan(send_id=SID, unsubscribe_url=UNSUB, name="Sam"),
    lambda: j.render_onboarding_recipes(send_id=SID, unsubscribe_url=UNSUB, name=None),
    lambda: j.render_onboarding_pro(send_id=SID, unsubscribe_url=UNSUB, name="Sam"),
]


@pytest.mark.parametrize("name", sorted(j.AVAILABLE_IMAGES))
def test_every_listed_image_exists_and_is_email_safe(name):
    path = EMAIL_DIR / f"{name}.jpg"
    assert path.exists(), f"{path} listed in AVAILABLE_IMAGES but missing"
    assert path.stat().st_size < 200_000
    with Image.open(path) as img:
        assert img.format == "JPEG" and img.width == j.IMAGE_W and img.height == j.IMAGE_H
    assert name in j.ALT and j.ALT[name].startswith("AI illustration")
    if name in j.RECIPE_TITLES or (RECIPES_DIR / f"{name}.ts").exists():
        assert (RECIPES_DIR / f"{name}.ts").exists()


def test_credits_file_lists_every_image():
    credits = (EMAIL_DIR / "CREDITS.md").read_text()
    for name in j.AVAILABLE_IMAGES:
        assert f"{name}.jpg" in credits


@pytest.mark.parametrize("render", RENDERS)
def test_images_are_absolute_https_with_dimensions_and_alt(render):
    html = render().html
    for tag in re.findall(r"<img [^>]*>", html):
        assert 'src="https://www.mypantryhub.com/email/' in tag and ".webp" not in tag
        assert re.search(r'width="\d+"', tag) and re.search(r'height="\d+"', tag)
        assert re.search(r'alt="[^"]{8,}"', tag)


@pytest.mark.parametrize("render", RENDERS[1:])
def test_marketing_and_lifecycle_have_hero_unsubscribe_and_address_line(render):
    r = render()
    assert "<img " in r.html, "each journey email gets a hero image"
    assert "Unsubscribe" in r.html and "Unsubscribe:" in r.text
    assert "Pantry Hub, " in r.text
    assert "/api/public/email/click?s=send-1" in r.html


def test_site_links_are_tracked_and_never_open_redirects():
    with pytest.raises(ValueError):
        j.tracked(SID, "x", "https://evil.example")
    with pytest.raises(ValueError):
        j.tracked(SID, "x", "//evil.example")


def test_no_vendor_or_model_names_and_no_invented_numbers():
    banned = re.compile(r"gpt|openai|gemini|claude|ollama|llama|grok|testimonial|\d+,\d{3}\+? (users|cooks|people)", re.I)
    for render in RENDERS:
        r = render()
        assert not banned.search(r.html + r.text)


def test_recipe_links_point_at_real_recipes():
    for render in RENDERS:
        for slug in re.findall(r"p=/recipes/([a-z0-9-]+)/", render().text):
            assert (RECIPES_DIR / f"{slug}.ts").exists(), slug
