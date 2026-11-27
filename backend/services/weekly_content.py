"""PP-235 / PP-241: what goes in the weekly recipe email. Pure data and selection, no database, no network.

Recipes are loaded from the public library (``frontend/content/recipes``), so every live public
recipe is in the pool, including ones added later. ``tests/test_weekly_recipes.py`` checks that
the catalog matches the recipe files (slug, title, prep + cook time) and that each one has an
email JPG. Tips are plain cooking and kitchen habits. They make no health claims and quote no
statistics; the one food-safety line repeats the guidance already printed on the recipe pages.
"""

from __future__ import annotations

import hashlib
import re
from dataclasses import dataclass
from datetime import date, timedelta
from pathlib import Path
from typing import Optional, Sequence

PICK_COUNT = 3
ROOT = Path(__file__).resolve().parents[2]
RECIPES_DIR = ROOT / "frontend" / "content" / "recipes"

# Meteorological seasons in the northern hemisphere, plus a wrapping holiday window
# (Thanksgiving through New Year's) used to boost recipes tagged "holiday".
HOLIDAY_START = (11, 8)  # month, day
HOLIDAY_END = (1, 7)


@dataclass(frozen=True)
class CatalogRecipe:
    slug: str
    title: str
    blurb: str
    meal: str  # breakfast | lunch | dinner | snack (same values as the recipe files)
    minutes: int  # prep + cook, copied from the recipe file
    time_label: str
    seasons: tuple[str, ...] = ()  # empty = good any time of year
    peak: Optional[tuple[str, str]] = None  # ("MM-DD", "MM-DD") window where it is extra timely
    tags: tuple[str, ...] = ()
    image_alt: str = "AI illustration"


# Hand-written blurbs, time labels, seasons and peak windows for the original 24-recipe
# newsletter set. Everything else is derived from the recipe file (first-sentence blurb,
# holiday tag → fall/winter). Titles, meals and times always come from the file.
_OVERRIDES: dict[str, dict] = {
    "weeknight-chili": {"blurb": "A one-pot beef and bean chili that freezes well.", "time_label": "about 1 hour", "seasons": ("fall", "winter")},
    "black-bean-tacos": {"blurb": "Vegetarian tacos from canned black beans, ready in about 15 minutes.", "time_label": "15 minutes"},
    "baked-oatmeal": {"blurb": "A make-ahead banana baked oatmeal for breakfast.", "time_label": "50 minutes"},
    "pasta-e-fagioli": {"blurb": "Small pasta, cannellini beans and diced tomatoes in one pot.", "time_label": "50 minutes", "seasons": ("fall", "winter")},
    "sheet-pan-chicken-and-vegetables": {"blurb": "Chicken thighs and vegetables roasted on a single pan.", "time_label": "55 minutes"},
    "freezer-breakfast-burritos": {"blurb": "Make a batch, freeze them, and reheat from frozen in about two minutes.", "time_label": "45 minutes"},
    "leftover-rice-fried-rice": {"blurb": "Egg fried rice that uses up yesterday's rice.", "time_label": "25 minutes"},
    "canned-tuna-pasta": {"blurb": "Pasta with canned tuna, diced tomatoes and garlic.", "time_label": "20 minutes"},
    "canned-chickpea-curry": {"blurb": "A creamy vegan curry from canned chickpeas.", "time_label": "30 minutes"},
    "easy-red-lentil-soup": {"blurb": "A vegan lentil soup that needs no soaking.", "time_label": "40 minutes", "seasons": ("fall", "winter")},
    "rice-and-beans-with-canned-beans": {"blurb": "One-pot rice and beans from pantry staples.", "time_label": "40 minutes"},
    "leftover-vegetable-frittata": {"blurb": "A skillet frittata for leftover cooked vegetables.", "time_label": "30 minutes"},
    "leftover-turkey-soup": {"blurb": "An easy soup for the turkey you didn't finish.", "time_label": "about 1 hour", "seasons": ("fall", "winter"), "peak": ("11-24", "12-08")},
    "white-chicken-chili": {"blurb": "A mild, creamy chili with canned white beans and green chiles.", "time_label": "45 minutes", "seasons": ("fall", "winter")},
    "baked-potato-soup": {"blurb": "Creamy potato soup made on the stove.", "time_label": "45 minutes", "seasons": ("fall", "winter")},
    "easy-vegetable-soup": {"blurb": "A simple vegan vegetable soup that freezes well.", "time_label": "40 minutes", "seasons": ("fall", "winter", "spring")},
    "lasagna-soup": {"blurb": "Lasagna flavors in a one-pot soup.", "time_label": "40 minutes", "seasons": ("fall", "winter")},
    "green-bean-casserole": {"blurb": "The classic holiday side dish.", "time_label": "45 minutes", "seasons": ("fall", "winter"), "peak": ("11-08", "11-27")},
    "easy-lasagna": {"blurb": "Meat and cheese lasagna that makes a pan to freeze.", "time_label": "75 minutes", "seasons": ("fall", "winter")},
    "sunday-chicken-and-rice": {"blurb": "One-pan chicken and rice.", "time_label": "about 1 hour", "seasons": ("fall", "winter")},
    "sunday-pot-roast": {"blurb": "Beef pot roast with potatoes and carrots, mostly hands-off in the oven.", "time_label": "about 3 hours", "seasons": ("fall", "winter")},
    "classic-meatloaf": {"blurb": "A glazed meatloaf you can make ahead.", "time_label": "75 minutes", "seasons": ("fall", "winter")},
    "peanut-butter-noodles": {"blurb": "Noodles in a peanut butter and soy sauce, ready in about 15 minutes.", "time_label": "15 minutes"},
    "chickpea-salad-sandwiches": {"blurb": "No-cook chickpea salad sandwiches for lunch.", "time_label": "15 minutes", "seasons": ("spring", "summer")},
}

_BLURB_LIMIT = 110


def _unquote(raw: str) -> str:
    return raw.replace(r"\"", '"').replace(r"\'", "'").replace(r"\n", "\n")


def _field_str(src: str, name: str) -> str:
    m = re.search(rf'{name}:\s*"((?:\\.|[^"\\])*)"', src)
    if not m:
        raise ValueError(f"recipe file is missing {name}")
    return _unquote(m.group(1))


def _field_int(src: str, name: str) -> int:
    m = re.search(rf"{name}:\s*(\d+)", src)
    if not m:
        raise ValueError(f"recipe file is missing {name}")
    return int(m.group(1))


def _field_tags(src: str) -> tuple[str, ...]:
    m = re.search(r"tags:\s*\[([^\]]*)\]", src, re.S)
    if not m:
        return ()
    return tuple(re.findall(r'"([^"]+)"', m.group(1)))


def _blurb_from_intro(intro: str, limit: int = _BLURB_LIMIT) -> str:
    text = " ".join(intro.split())
    m = re.match(r"(.+?\.)(\s|$)", text)
    sent = m.group(1) if m else text
    if len(sent) <= limit:
        return sent if sent.endswith(".") else f"{sent}."
    cut = sent[: limit - 1]
    if " " in cut:
        cut = cut.rsplit(" ", 1)[0]
    return cut.rstrip(".,;: ") + "."


def _time_label(minutes: int) -> str:
    """A short label that stays within 25 minutes of the real prep+cook time."""
    if minutes < 60:
        return f"{minutes} minutes"
    if minutes <= 70:
        return "about 1 hour"
    hours = minutes / 60
    nearest_half = round(hours * 2) / 2
    if abs(nearest_half * 60 - minutes) <= 25:
        if nearest_half == 1:
            return "about 1 hour"
        if nearest_half == int(nearest_half):
            return f"about {int(nearest_half)} hours"
        return f"about {nearest_half:g} hours"
    return f"{minutes} minutes"


def _parse_recipe(path: Path) -> CatalogRecipe:
    src = path.read_text()
    slug = _field_str(src, "slug")
    if slug != path.stem:
        raise ValueError(f"{path.name} slug {slug!r} does not match the file name")
    title = _field_str(src, "title")
    meal = _field_str(src, "meal")
    minutes = _field_int(src, "prepMin") + _field_int(src, "cookMin")
    tags = _field_tags(src)
    image_alt = _field_str(src, "imageAlt").replace("AI-generated illustration", "AI illustration", 1)
    override = _OVERRIDES.get(slug, {})
    seasons = override.get("seasons")
    if seasons is None:
        seasons = ("fall", "winter") if "holiday" in tags else ()
    return CatalogRecipe(
        slug=slug,
        title=title,
        blurb=override.get("blurb") or _blurb_from_intro(_field_str(src, "intro")),
        meal=meal,
        minutes=minutes,
        time_label=override.get("time_label") or _time_label(minutes),
        seasons=tuple(seasons),
        peak=override.get("peak"),
        tags=tags,
        image_alt=image_alt,
    )


def load_catalog(recipes_dir: Path = RECIPES_DIR) -> tuple[CatalogRecipe, ...]:
    """Every public recipe file, in slug order. Used at import and by tests."""
    rows = [_parse_recipe(path) for path in sorted(recipes_dir.glob("*.ts")) if ": Recipe = {" in path.read_text()]
    if not rows:
        raise RuntimeError(f"no public recipes found in {recipes_dir}")
    return tuple(rows)


CATALOG: tuple[CatalogRecipe, ...] = load_catalog()
BY_SLUG = {r.slug: r for r in CATALOG}

@dataclass(frozen=True)
class Tip:
    id: str
    title: str
    body: str


TIPS: tuple[Tip, ...] = (
    Tip("date-it", "Put a date on it", "When you open a can or a bag, or put leftovers in a container, write the date on a piece of tape. A glance later tells you what to use first."),
    Tip("look-first", "Look before you shop", "Spend two minutes looking through the cupboard and fridge before you write the shopping list. If you plan a couple of meals around what's already there, the list gets shorter."),
    Tip("oldest-front", "Oldest in front", "When you put groceries away, slide the older cans and boxes to the front and put the new ones behind them. You'll reach for the oldest first without thinking about it."),
    Tip("rinse-beans", "Rinse canned beans", "Drain canned beans and rinse them under cold water before you cook with them. It washes off the thick canning liquid. Skip the rinse when a recipe wants that liquid, like some soups."),
    Tip("taste-before-salt", "Taste before you salt", "Canned beans, broth and tomatoes often already contain salt. Taste the dish near the end, then add salt a pinch at a time."),
    Tip("pasta-water", "Save some pasta water", "Scoop out about ½ cup of the cooking water before you drain the pasta. A splash in the sauce helps it cling to the noodles."),
    Tip("empty-fridge-night", "Pick an empty-the-fridge night", "Once a week, make dinner from what's left. Fried rice, a frittata and a pot of soup all take odds and ends, and Pantry Hub has a recipe for each."),
    Tip("cool-leftovers", "Refrigerate leftovers promptly", "Put leftovers in the fridge within 2 hours of cooking and plan to eat them within 3 to 4 days. Shallow containers cool faster than a deep pot."),
    Tip("freeze-flat", "Freeze soup flat", "Let soup or chili cool, pour it into a zip-top freezer bag, press the bag flat and freeze it on a tray. Flat bags stack neatly and thaw faster than a block in a tub."),
    Tip("freeze-bread", "Freeze the extra bread", "If you won't finish a loaf or a pack of tortillas in a few days, freeze half right away instead of waiting. You can warm slices or tortillas straight from the freezer."),
    Tip("extra-rice", "Cook extra rice", "Make a bigger pot of rice or another grain, cool it quickly and keep it in the fridge for the next few meals. It's the start of fried rice, rice and beans, or a quick burrito bowl."),
    Tip("short-staples-list", "Keep a short staples list", "Write down the handful of staples you cook with most, like rice, pasta, canned tomatoes, beans, onions and garlic. When one runs low, add it to the shopping list right then."),
    Tip("add-it-now", "Add it when it runs out", "The moment you finish the last of something, put it on the shopping list. The shopping list in Pantry Hub works for this, and so does a note on your phone."),
    Tip("read-recipe-first", "Read the whole recipe first", "Before you turn on the stove, read the recipe from top to bottom. You'll catch the step that needs the oven preheated or the beans drained, and nothing will surprise you halfway through."),
    Tip("check-swaps", "Check the substitutions", "If you're missing one ingredient, look at the substitutions on the recipe page before you go to the store. There's often a swap that works with what you have."),
    Tip("finish-with-acid", "Finish with a little acid", "If a soup or a pot of beans tastes flat, a squeeze of lemon or a splash of vinegar at the end often helps."),
    Tip("label-freezer", "Label what you freeze", "Write what it is and the date on the bag before it goes in the freezer. Unlabeled bags turn into mystery dinners."),
)
TIPS_BY_ID = {t.id: t for t in TIPS}


SEASONS = {12: "winter", 1: "winter", 2: "winter", 3: "spring", 4: "spring", 5: "spring",
           6: "summer", 7: "summer", 8: "summer", 9: "fall", 10: "fall", 11: "fall"}


def season_for(day: date) -> str:
    """Meteorological season in the northern hemisphere."""
    return SEASONS[day.month]


def in_holiday_season(day: date) -> bool:
    """Thanksgiving through New Year's (Nov 8 to Jan 7), wrapping the year."""
    md = (day.month, day.day)
    return md >= HOLIDAY_START or md <= HOLIDAY_END


def issue_key_for(day: date) -> str:
    year, week, _ = day.isocalendar()
    return f"{year}-W{week:02d}"


def _in_window(day: date, window: Optional[tuple[str, str]]) -> bool:
    if not window:
        return False
    md = f"{day.month:02d}-{day.day:02d}"
    return window[0] <= md <= window[1]


def season_score(recipe: CatalogRecipe, day: date) -> int:
    """2 = in season, 1 = any time of year, 0 = out of season.

    A timely peak window adds 2 (for example leftover turkey soup around Thanksgiving).
    A "holiday" tag adds 1 during the Thanksgiving-through-New-Year window, so holiday
    dishes rank above other in-season recipes but below a peak-window dish.
    """
    base = 1 if not recipe.seasons else (2 if season_for(day) in recipe.seasons else 0)
    score = base + (2 if _in_window(day, recipe.peak) else 0)
    if "holiday" in recipe.tags and in_holiday_season(day):
        score += 1
    return score


def _tiebreak(issue_key: str, slug: str) -> str:
    return hashlib.sha1(f"{issue_key}:{slug}".encode()).hexdigest()


def cooldown_issues(pool_size: int, count: int = PICK_COUNT) -> int:
    """How many past issues are kept out of the next pick. With 3 a week this is (pool - 3) // 3."""
    return max(0, (pool_size - count) // count)


def pick_recipes(day: date, recent: Sequence[Sequence[str]], count: int = PICK_COUNT) -> list[str]:
    """Choose ``count`` slugs: nothing used in the last few issues, in season first, mixed meals.

    ``recent`` is the recipe slugs of earlier issues (skipped ones excluded), newest first.
    """
    pool = [r for r in CATALOG]
    key = issue_key_for(day)
    avoid: set[str] = set()
    for slugs in list(recent)[: cooldown_issues(len(pool), count)]:
        avoid.update(slugs)
    last_used: dict[str, int] = {}
    for idx, slugs in enumerate(recent):
        for slug in slugs:
            last_used.setdefault(slug, idx)

    def rank(r: CatalogRecipe, per_meal: dict[str, int]):
        # Season decides first. Then a third dish of the same meal is pushed back, then never-used first,
        # then the longest ago, then a stable hash so the same week always gives the same answer.
        age = last_used.get(r.slug)
        return (-season_score(r, day), 1 if per_meal.get(r.meal, 0) >= 2 else 0, 0 if age is None else 1, -(age or 0), _tiebreak(key, r.slug))

    eligible = [r for r in pool if r.slug not in avoid]
    if len(eligible) < count:  # catalog too small for the cooldown: fall back to the longest ago
        eligible = sorted(pool, key=lambda r: (-(last_used.get(r.slug, 10**6)), _tiebreak(key, r.slug)))
    chosen: list[CatalogRecipe] = []
    per_meal: dict[str, int] = {}
    while len(chosen) < count and len(chosen) < len(eligible):
        best = min((r for r in eligible if r not in chosen), key=lambda r: rank(r, per_meal))
        chosen.append(best)
        per_meal[best.meal] = per_meal.get(best.meal, 0) + 1
    return [r.slug for r in chosen]


def pick_tip(recent_tip_ids: Sequence[str]) -> Tip:
    """The tip used longest ago (never used first, in list order)."""
    last_used: dict[str, int] = {}
    for idx, tid in enumerate(recent_tip_ids):
        last_used.setdefault(tid, idx)
    ranked = sorted(
        enumerate(TIPS),
        key=lambda pair: (0 if pair[1].id not in last_used else 1, -last_used.get(pair[1].id, 0), pair[0]),
    )
    return ranked[0][1]


def subject_for(slugs: Sequence[str]) -> str:
    titles = [BY_SLUG[s].title for s in slugs]
    full = f"This week: {', '.join(titles[:-1])} and {titles[-1]}" if len(titles) > 1 else f"This week: {titles[0]}"
    if len(full) <= 70 or len(titles) < 3:
        return full
    two = f"This week: {titles[0]}, {titles[1]} and {len(titles) - 2} more"
    if len(two) <= 70:
        return two
    return f"This week: {titles[0]} and {len(titles) - 1} more recipes"


PREHEADER = "Three recipes from the cupboard and one small kitchen tip."


def build_content(slugs: Sequence[str], tip: Tip) -> dict:
    """The stored, reviewable copy of an issue."""
    return {
        "recipes": [
            {"slug": s, "title": BY_SLUG[s].title, "blurb": BY_SLUG[s].blurb, "time": BY_SLUG[s].time_label}
            for s in slugs
        ],
        "tip": {"id": tip.id, "title": tip.title, "body": tip.body},
    }


def thanksgiving(year: int) -> date:
    """Fourth Thursday of November (kept for tests of the timely window)."""
    first = date(year, 11, 1)
    return first + timedelta(days=(3 - first.weekday()) % 7 + 21)
