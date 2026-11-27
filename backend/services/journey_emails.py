"""PP-195/PP-196/PP-199: copy and layout for every journey email.

Pure functions: no database, no network. Every link back to the site goes through the
first-party click redirect so the dashboard can count clicks, and every image is an absolute
https URL under /email/ (JPG, 600px wide) with width/height and meaningful alt text.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Optional
from urllib.parse import quote

from backend.services import email_gate
from backend.services import weekly_content as weekly_content
from backend.services.email_service import (
    COLOR_ACCENT,
    COLOR_MUTED,
    COLOR_TEXT,
    COLOR_WASH,
    PRO_FEATURES,
    FREE_FEATURES,
    _app_url,
    _html_escape,
    _wrap,
)

# Files that exist in frontend/public/email/. Hero names are listed here; every
# catalog recipe is included automatically once its JPG is committed (tests check).
HERO_IMAGES = frozenset(
    {
        "hero-pantry-welcome",
        "hero-pantry-shelf",
        "hero-scan-first-item",
        "hero-household-pantry",
    }
)
HERO_ALT = {
    "hero-pantry-welcome": "AI illustration of a tidy kitchen counter with jars of rice, beans, pasta and canned tomatoes",
    "hero-pantry-shelf": "Wooden kitchen shelf of glass jars filled with pasta, flour, and oats",
    "hero-scan-first-item": "Hands putting glass jars of pasta, walnuts, and oats on a kitchen counter",
    "hero-household-pantry": "A person placing glass jars of dry goods on a white kitchen shelf",
}
AVAILABLE_IMAGES = frozenset(r.slug for r in weekly_content.CATALOG) | HERO_IMAGES
IMAGE_W, IMAGE_H = 600, 450
SHOWN_W = 464  # card width (520) minus padding (56)

ALT = {**HERO_ALT, **{r.slug: r.image_alt for r in weekly_content.CATALOG}}
RECIPE_TITLES = {
    "canned-tuna-pasta": "Canned Tuna Pasta",
    "black-bean-tacos": "Black Bean Tacos",
    "easy-red-lentil-soup": "Easy Red Lentil Soup",
    "rice-and-beans-with-canned-beans": "Rice and Beans with Canned Beans",
    "leftover-rice-fried-rice": "Fried Rice with Leftover Rice",
    "pasta-e-fagioli": "Pasta e Fagioli",
}
# Preferred hero first, then a recipe-illustration stand-in if the dedicated file is missing.
HEROES = {
    "recipe_welcome": ["hero-pantry-welcome", "canned-tuna-pasta"],
    "recipe_cupboard_dinners": ["rice-and-beans-with-canned-beans"],
    "recipe_know_your_pantry": ["hero-pantry-shelf", "easy-lasagna"],
    "onboarding_scan_first_item": ["hero-scan-first-item", "baked-potato-soup"],
    "onboarding_recipes": ["sheet-pan-chicken-and-vegetables"],
    "onboarding_pro": ["hero-household-pantry", "sunday-pot-roast"],
}
SIGN_UP_PATH = "/auth/signin/"


@dataclass
class Rendered:
    subject: str
    html: str
    text: str


def image_url(name: str) -> str:
    return f"{_app_url()}/email/{name}.jpg"


def pick_hero(template: str) -> Optional[str]:
    for name in HEROES.get(template, []):
        if name in AVAILABLE_IMAGES:
            return name
    return None


def tracked(send_id: str, label: str, path: str) -> str:
    """First-party click redirect. ``path`` is a site path, never a full URL (no open redirect)."""
    if not path.startswith("/") or path.startswith("//"):
        raise ValueError("tracked path must be a site path")
    return f"{_app_url()}/api/public/email/click?s={quote(send_id)}&l={quote(label)}&p={quote(path, safe='/')}"


def _img(name: str, *, width: int = SHOWN_W) -> str:
    height = round(width * IMAGE_H / IMAGE_W)
    return (
        f'<img src="{_html_escape(image_url(name))}" width="{width}" height="{height}" '
        f'alt="{_html_escape(ALT.get(name, "Pantry Hub"))}" '
        f'style="display:block;width:100%;max-width:{width}px;height:auto;border:0;border-radius:8px;">'
    )


def _hero_row(template: str) -> str:
    name = pick_hero(template)
    if not name:
        return ""
    return f'<tr><td style="padding:0 28px 8px 28px;">{_img(name)}</td></tr>'


def _recipe_card(send_id: str, slug: str, label_prefix: str) -> tuple[str, str]:
    title = RECIPE_TITLES[slug]
    url = tracked(send_id, f"{label_prefix}:{slug}", f"/recipes/{slug}/")
    half = 218
    html = f"""
<td width="50%" valign="top" style="padding:0 6px 12px 6px;">
  <a href="{_html_escape(url)}" style="text-decoration:none;color:{COLOR_TEXT};">
    {_img(slug, width=half) if slug in AVAILABLE_IMAGES else ""}
    <span style="display:block;padding-top:6px;font-size:15px;font-weight:700;line-height:1.3;color:{COLOR_TEXT};">{_html_escape(title)}</span>
  </a>
</td>"""
    return html, f"- {title}: {url}"


def _recipe_cards(send_id: str, slugs: list[str], label_prefix: str) -> tuple[str, str]:
    cells, lines = [], []
    for slug in slugs:
        cell, line = _recipe_card(send_id, slug, label_prefix)
        cells.append(cell)
        lines.append(line)
    html = (
        '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 8px 0;">'
        f"<tr>{''.join(cells)}</tr></table>"
    )
    return html, "\n".join(lines)


def _footer(reason: str, unsubscribe_url: Optional[str], *, address_required: bool = True) -> tuple[str, str]:
    address = email_gate.mailing_address() or ("[mailing address added at launch]" if address_required else "")
    parts_html = [f"<br><br>{_html_escape(reason)}"]
    parts_text = [f"\n\n{reason}"]
    if unsubscribe_url:
        parts_html.append(
            f' <a href="{_html_escape(unsubscribe_url)}" style="color:{COLOR_MUTED};text-decoration:underline;">Unsubscribe</a>.'
        )
        parts_text.append(f"\nUnsubscribe: {unsubscribe_url}")
    if address:
        parts_html.append(f"<br>Pantry Hub, {_html_escape(address)}")
        parts_text.append(f"\nPantry Hub, {address}")
    return "".join(parts_html), "".join(parts_text)


def _p(text: str) -> str:
    return f'<p style="margin:0 0 16px 0;">{text}</p>'


def render_confirm(*, send_id: str, confirm_url: str) -> Rendered:
    body_html = _p(
        "Someone, hopefully you, asked for new pantry recipes by email at mypantryhub.com. "
        "Tap the button to say yes."
    ) + _p("If it wasn't you, ignore this email and we won't write again.")
    body_text = (
        "Someone, hopefully you, asked for new pantry recipes by email at mypantryhub.com. "
        "Tap the link to say yes.\n\nIf it wasn't you, ignore this email and we won't write again."
    )
    footer_html, footer_text = _footer(
        "You got this one email because this address was entered on mypantryhub.com.", None, address_required=False
    )
    html, text = _wrap(
        title="One tap to confirm",
        preheader="Confirm and we'll send a few easy pantry recipes to start.",
        body_html=body_html,
        body_text=body_text,
        cta_label="Yes, send me recipes",
        cta_url=confirm_url,
        footer_html=footer_html,
        footer_text=footer_text,
    )
    return Rendered("Confirm your Pantry Hub recipe emails", html, text)


def _signup_promo(send_id: str, label: str) -> tuple[str, str]:
    url = tracked(send_id, label, SIGN_UP_PATH)
    html = _p(
        "Want to see which recipes you can make from what you already have? "
        f'<a href="{_html_escape(url)}" style="color:{COLOR_TEXT};font-weight:700;">Create a free Pantry Hub account.</a>'
    )
    return html, f"Want to see which recipes you can make from what you already have? Create a free Pantry Hub account: {url}"


def render_recipe_welcome(*, send_id: str, unsubscribe_url: str) -> Rendered:
    cards_html, cards_text = _recipe_cards(send_id, ["canned-tuna-pasta", "black-bean-tacos"], "welcome")
    cards2_html, cards2_text = _recipe_cards(send_id, ["easy-red-lentil-soup"], "welcome")
    promo_html, promo_text = _signup_promo(send_id, "welcome_signup")
    browse = tracked(send_id, "welcome_browse", "/recipes/")
    body_html = (
        _p("Thanks for confirming. Every recipe in our library is built around ingredients most kitchens already have. Three to start with:")
        + cards_html
        + cards2_html
        + _p('<span style="font-size:13px;color:#64748b;">The pictures are AI illustrations, not photos of the dishes.</span>')
        + promo_html
    )
    body_text = (
        "Thanks for confirming. Every recipe in our library is built around ingredients most kitchens already have. "
        f"Three to start with:\n\n{cards_text}\n{cards2_text}\n\n(The pictures are AI illustrations, not photos of the dishes.)\n\n{promo_text}"
    )
    footer_html, footer_text = _footer("You're getting this because you confirmed recipe emails from Pantry Hub.", unsubscribe_url)
    html, text = _wrap(
        title="Welcome to Pantry Hub recipes",
        preheader="Three easy recipes to start, all from the cupboard.",
        body_html=body_html,
        body_text=body_text,
        cta_label="Browse all recipes",
        cta_url=browse,
        hero_html=_hero_row("recipe_welcome"),
        footer_html=footer_html,
        footer_text=footer_text,
    )
    return Rendered("You're in: 3 easy pantry recipes to start", html, text)


def render_recipe_cupboard_dinners(*, send_id: str, unsubscribe_url: str) -> Rendered:
    cards_html, cards_text = _recipe_cards(send_id, ["leftover-rice-fried-rice", "pasta-e-fagioli"], "cupboard")
    first_url = tracked(send_id, "cupboard:rice-and-beans-with-canned-beans", "/recipes/rice-and-beans-with-canned-beans/")
    body_html = (
        _p(
            f'Start with <a href="{_html_escape(first_url)}" style="color:{COLOR_TEXT};font-weight:700;">Rice and Beans with Canned Beans</a> '
            "(pictured), then try these two. All three lean on rice, beans, pasta and other things that keep."
        )
        + cards_html
    )
    body_text = (
        f"Start with Rice and Beans with Canned Beans (pictured): {first_url}\nThen try these two. "
        f"All three lean on rice, beans, pasta and other things that keep.\n\n{cards_text}"
    )
    footer_html, footer_text = _footer("You're getting this because you confirmed recipe emails from Pantry Hub.", unsubscribe_url)
    html, text = _wrap(
        title="Three dinners from the cupboard",
        preheader="Rice, beans and pasta, done three ways.",
        body_html=body_html,
        body_text=body_text,
        cta_label="See all recipes",
        cta_url=tracked(send_id, "cupboard_browse", "/recipes/"),
        hero_html=_hero_row("recipe_cupboard_dinners"),
        footer_html=footer_html,
        footer_text=footer_text,
    )
    return Rendered("Three dinners from the cupboard", html, text)


def render_recipe_know_your_pantry(*, send_id: str, unsubscribe_url: str) -> Rendered:
    limit = FREE_FEATURES[0]  # "Up to 50 pantry items", copied from the pricing page
    body_html = _p(
        "Pantry Hub keeps a list of what you have, so you can see what's running low and what to buy before you shop."
    ) + _p(f"The Free plan includes {limit[0].lower() + limit[1:]} and a shopping list.")
    body_text = (
        "Pantry Hub keeps a list of what you have, so you can see what's running low and what to buy before you shop.\n\n"
        f"The Free plan includes {limit[0].lower() + limit[1:]} and a shopping list."
    )
    footer_html, footer_text = _footer("You're getting this because you confirmed recipe emails from Pantry Hub.", unsubscribe_url)
    html, text = _wrap(
        title="Know what's in your pantry before you shop",
        preheader="A free account keeps your pantry list and shopping list in one place.",
        body_html=body_html,
        body_text=body_text,
        cta_label="Create a free account",
        cta_url=tracked(send_id, "know_signup", SIGN_UP_PATH),
        hero_html=_hero_row("recipe_know_your_pantry"),
        footer_html=footer_html,
        footer_text=footer_text,
    )
    return Rendered("Know what's in your pantry before you shop", html, text)


def _greeting(name: Optional[str]) -> tuple[str, str]:
    if name:
        return f"Hi {_html_escape(name)},", f"Hi {name},"
    return "Hi,", "Hi,"


def render_onboarding_scan(*, send_id: str, unsubscribe_url: str, name: Optional[str] = None) -> Rendered:
    g_html, g_text = _greeting(name)
    body_html = _p(g_html) + _p(
        "Your pantry is empty so far. Pick one thing from the cupboard and add it with Scan Barcode or Quick Scan. "
        "It takes a few seconds, and you can add the rest whenever you like."
    )
    body_text = (
        f"{g_text}\n\nYour pantry is empty so far. Pick one thing from the cupboard and add it with Scan Barcode or Quick Scan. "
        "It takes a few seconds, and you can add the rest whenever you like."
    )
    footer_html, footer_text = _footer("You're getting these getting-started tips because you made a Pantry Hub account.", unsubscribe_url)
    html, text = _wrap(
        title="Scan one thing to get started",
        preheader="One item is enough to start your pantry.",
        body_html=body_html,
        body_text=body_text,
        cta_label="Add your first item",
        cta_url=tracked(send_id, "scan_open", "/dashboard/"),
        hero_html=_hero_row("onboarding_scan_first_item"),
        footer_html=footer_html,
        footer_text=footer_text,
    )
    return Rendered("Scan one thing to get your pantry started", html, text)


def render_onboarding_recipes(*, send_id: str, unsubscribe_url: str, name: Optional[str] = None) -> Rendered:
    g_html, g_text = _greeting(name)
    body_html = _p(g_html) + _p(
        "Save a recipe in Pantry Hub and it shows which ingredients you already have and which you're missing. "
        "The free recipe library is a good place to start."
    )
    body_text = (
        f"{g_text}\n\nSave a recipe in Pantry Hub and it shows which ingredients you already have and which you're missing. "
        "The free recipe library is a good place to start."
    )
    footer_html, footer_text = _footer("You're getting these getting-started tips because you made a Pantry Hub account.", unsubscribe_url)
    html, text = _wrap(
        title="Turn what you have into dinner",
        preheader="Save a recipe and see what you're missing.",
        body_html=body_html,
        body_text=body_text,
        cta_label="Browse recipes",
        cta_url=tracked(send_id, "recipes_browse", "/recipes/"),
        hero_html=_hero_row("onboarding_recipes"),
        footer_html=footer_html,
        footer_text=footer_text,
    )
    return Rendered("Turn what you have into dinner", html, text)


def render_onboarding_pro(*, send_id: str, unsubscribe_url: str, name: Optional[str] = None) -> Rendered:
    g_html, g_text = _greeting(name)
    items = "".join(f'<li style="margin:0 0 6px 0;">{_html_escape(f)}</li>' for f in PRO_FEATURES)
    body_html = _p(g_html) + _p("If you're getting value from Pantry Hub, here is what Pro adds:") + (
        f'<ul style="margin:0 0 16px 18px;padding:0;">{items}</ul>'
    ) + _p("The Free plan stays free. Upgrade only if you want these.")
    body_text = (
        f"{g_text}\n\nIf you're getting value from Pantry Hub, here is what Pro adds:\n\n"
        + "\n".join(f"- {f}" for f in PRO_FEATURES)
        + "\n\nThe Free plan stays free. Upgrade only if you want these."
    )
    footer_html, footer_text = _footer("You're getting these getting-started tips because you made a Pantry Hub account.", unsubscribe_url)
    html, text = _wrap(
        title="What Pro adds",
        preheader="Unlimited items, unlimited AI receipt scans and more.",
        body_html=body_html,
        body_text=body_text,
        cta_label="See plans",
        cta_url=tracked(send_id, "pro_pricing", "/pricing/"),
        hero_html=_hero_row("onboarding_pro"),
        footer_html=footer_html,
        footer_text=footer_text,
    )
    return Rendered("What Pro adds to Pantry Hub", html, text)


WEEKLY_JOURNEY = "weekly_recipes"


def render_weekly_issue(
    *,
    send_id: str,
    content: dict,
    subject: str,
    preheader: str,
    unsubscribe_url: str,
    audience: str = "subscriber",
    test: bool = False,
) -> Rendered:
    """PP-235: the weekly recipe email, rendered from the stored issue content.

    ``audience`` is ``subscriber`` (confirmed recipe newsletter) or ``user`` (app user opted in).
    ``test`` adds a banner and a [TEST] subject so a review copy can't be mistaken for the real one.
    """
    recipes = content["recipes"]
    tip = content["tip"]
    blocks_html, blocks_text = [], []
    for r in recipes:
        url = tracked(send_id, f"weekly:{r['slug']}", f"/recipes/{r['slug']}/")
        image = f'<a href="{_html_escape(url)}">{_img(r["slug"])}</a>' if r["slug"] in AVAILABLE_IMAGES else ""
        blocks_html.append(
            '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 22px 0;"><tr><td>'
            f"{image}"
            f'<p style="margin:10px 0 2px 0;font-size:18px;font-weight:700;line-height:1.3;">'
            f'<a href="{_html_escape(url)}" style="color:{COLOR_TEXT};text-decoration:none;">{_html_escape(r["title"])}</a></p>'
            f'<p style="margin:0 0 6px 0;font-size:13px;color:{COLOR_MUTED};">{_html_escape(r["time"])}</p>'
            f'<p style="margin:0;">{_html_escape(r["blurb"])} '
            f'<a href="{_html_escape(url)}" style="color:{COLOR_TEXT};font-weight:700;">Get the recipe</a></p>'
            "</td></tr></table>"
        )
        blocks_text.append(f"{r['title']} ({r['time']})\n{r['blurb']}\n{url}")
    tip_html = (
        f'<div style="margin:0 0 18px 0;padding:14px 16px;background-color:{COLOR_WASH};border-left:4px solid {COLOR_ACCENT};border-radius:4px;">'
        f'<p style="margin:0 0 4px 0;font-size:13px;font-weight:700;color:{COLOR_MUTED};text-transform:uppercase;letter-spacing:0.04em;">Pantry tip</p>'
        f'<p style="margin:0 0 4px 0;font-weight:700;">{_html_escape(tip["title"])}</p>'
        f'<p style="margin:0;">{_html_escape(tip["body"])}</p></div>'
    )
    tip_text = f"PANTRY TIP: {tip['title']}\n{tip['body']}"
    if audience == "user":
        cta_url = tracked(send_id, "weekly_open_app", "/dashboard/")
        soft_html = _p(
            "Open Pantry Hub to check these against what's in your pantry. "
            f'<a href="{_html_escape(cta_url)}" style="color:{COLOR_TEXT};font-weight:700;">Open Pantry Hub</a>'
        )
        soft_text = f"Open Pantry Hub to check these against what's in your pantry: {cta_url}"
        cta_label, reason = "Open Pantry Hub", "You're getting this weekly recipe email because you turned it on in your Pantry Hub account."
    else:
        soft_html, soft_text = _signup_promo(send_id, "weekly_signup")
        cta_label, cta_url = "Browse all recipes", tracked(send_id, "weekly_browse", "/recipes/")
        reason = "You're getting this weekly recipe email because you confirmed recipe emails from Pantry Hub."
    banner_html = banner_text = ""
    if test:
        msg = "This is a test copy for review. It has not been sent to the list."
        banner_html = (
            f'<p style="margin:0 0 16px 0;padding:10px 12px;background-color:#fef3c7;color:#92400e;border-radius:6px;font-size:14px;"><strong>[TEST]</strong> {msg}</p>'
        )
        banner_text = f"[TEST] {msg}\n\n"
        subject = f"[TEST] {subject}"
    body_html = (
        banner_html
        + _p("Three recipes from the Pantry Hub library this week, plus one small kitchen tip.")
        + "".join(blocks_html)
        + tip_html
        + _p('<span style="font-size:13px;color:#64748b;">The pictures are AI illustrations, not photos of the dishes.</span>')
        + soft_html
    )
    body_text = (
        banner_text
        + "Three recipes from the Pantry Hub library this week, plus one small kitchen tip.\n\n"
        + "\n\n".join(blocks_text)
        + f"\n\n{tip_text}\n\n(The pictures are AI illustrations, not photos of the dishes.)\n\n{soft_text}"
    )
    footer_html, footer_text = _footer(reason, unsubscribe_url)
    html, text = _wrap(
        title="This week from the pantry",
        preheader=preheader,
        body_html=body_html,
        body_text=body_text,
        cta_label=cta_label,
        cta_url=cta_url,
        footer_html=footer_html,
        footer_text=footer_text,
    )
    return Rendered(subject, html, text)
