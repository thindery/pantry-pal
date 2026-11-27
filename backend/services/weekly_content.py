"""PP-235: what goes in the weekly recipe email. Pure data and selection, no database, no network.

Recipes come from the public library (``frontend/content/recipes``). ``tests/test_weekly_recipes.py`` checks
that every catalog row matches the recipe file (slug, title, prep + cook time) and has an email JPG, so the
two cannot drift apart. Tips are plain cooking and kitchen habits. They make no health claims and quote no
statistics; the one food-safety line repeats the guidance already printed on the recipe pages.
"""

from __future__ import annotations

import hashlib
from dataclasses import dataclass
from datetime import date, timedelta
from typing import Optional, Sequence

PICK_COUNT = 3


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


CATALOG: tuple[CatalogRecipe, ...] = (
    CatalogRecipe("weeknight-chili", "Weeknight Chili", "A one-pot beef and bean chili that freezes well.", "dinner", 60, "about 1 hour", ("fall", "winter")),
    CatalogRecipe("black-bean-tacos", "Black Bean Tacos", "Vegetarian tacos from canned black beans, ready in about 15 minutes.", "dinner", 15, "15 minutes"),
    CatalogRecipe("baked-oatmeal", "Baked Oatmeal with Bananas", "A make-ahead banana baked oatmeal for breakfast.", "breakfast", 50, "50 minutes"),
    CatalogRecipe("pasta-e-fagioli", "Pasta e Fagioli", "Small pasta, cannellini beans and diced tomatoes in one pot.", "dinner", 50, "50 minutes", ("fall", "winter")),
    CatalogRecipe("sheet-pan-chicken-and-vegetables", "Sheet Pan Chicken and Vegetables", "Chicken thighs and vegetables roasted on a single pan.", "dinner", 55, "55 minutes"),
    CatalogRecipe("freezer-breakfast-burritos", "Freezer Breakfast Burritos", "Make a batch, freeze them, and reheat from frozen in about two minutes.", "breakfast", 45, "45 minutes"),
    CatalogRecipe("leftover-rice-fried-rice", "Fried Rice with Leftover Rice", "Egg fried rice that uses up yesterday's rice.", "dinner", 25, "25 minutes"),
    CatalogRecipe("canned-tuna-pasta", "Canned Tuna Pasta", "Pasta with canned tuna, diced tomatoes and garlic.", "dinner", 20, "20 minutes"),
    CatalogRecipe("canned-chickpea-curry", "Canned Chickpea Curry", "A creamy vegan curry from canned chickpeas.", "dinner", 30, "30 minutes"),
    CatalogRecipe("easy-red-lentil-soup", "Easy Red Lentil Soup", "A vegan lentil soup that needs no soaking.", "lunch", 40, "40 minutes", ("fall", "winter")),
    CatalogRecipe("rice-and-beans-with-canned-beans", "Rice and Beans with Canned Beans", "One-pot rice and beans from pantry staples.", "dinner", 40, "40 minutes"),
    CatalogRecipe("leftover-vegetable-frittata", "Leftover Vegetable Frittata", "A skillet frittata for leftover cooked vegetables.", "breakfast", 30, "30 minutes"),
    CatalogRecipe("leftover-turkey-soup", "Leftover Turkey Soup", "An easy soup for the turkey you didn't finish.", "dinner", 60, "about 1 hour", ("fall", "winter"), ("11-24", "12-08")),
    CatalogRecipe("white-chicken-chili", "White Chicken Chili", "A mild, creamy chili with canned white beans and green chiles.", "dinner", 45, "45 minutes", ("fall", "winter")),
    CatalogRecipe("baked-potato-soup", "Baked Potato Soup", "Creamy potato soup made on the stove.", "dinner", 45, "45 minutes", ("fall", "winter")),
    CatalogRecipe("easy-vegetable-soup", "Easy Vegetable Soup", "A simple vegan vegetable soup that freezes well.", "lunch", 40, "40 minutes", ("fall", "winter", "spring")),
    CatalogRecipe("lasagna-soup", "Lasagna Soup", "Lasagna flavors in a one-pot soup.", "dinner", 40, "40 minutes", ("fall", "winter")),
    CatalogRecipe("green-bean-casserole", "Green Bean Casserole", "The classic holiday side dish.", "dinner", 45, "45 minutes", ("fall", "winter"), ("11-08", "11-27")),
    CatalogRecipe("easy-lasagna", "Easy Lasagna", "Meat and cheese lasagna that makes a pan to freeze.", "dinner", 75, "75 minutes", ("fall", "winter")),
    CatalogRecipe("sunday-chicken-and-rice", "Sunday Chicken and Rice", "One-pan chicken and rice.", "dinner", 65, "about 1 hour", ("fall", "winter")),
    CatalogRecipe("sunday-pot-roast", "Sunday Pot Roast", "Beef pot roast with potatoes and carrots, mostly hands-off in the oven.", "dinner", 200, "about 3 hours", ("fall", "winter")),
    CatalogRecipe("classic-meatloaf", "Classic Meatloaf", "A glazed meatloaf you can make ahead.", "dinner", 75, "75 minutes", ("fall", "winter")),
    CatalogRecipe("peanut-butter-noodles", "Peanut Butter Noodles", "Noodles in a peanut butter and soy sauce, ready in about 15 minutes.", "dinner", 15, "15 minutes"),
    CatalogRecipe("chickpea-salad-sandwiches", "Chickpea Salad Sandwiches", "No-cook chickpea salad sandwiches for lunch.", "lunch", 15, "15 minutes", ("spring", "summer")),
)
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


def issue_key_for(day: date) -> str:
    year, week, _ = day.isocalendar()
    return f"{year}-W{week:02d}"


def _in_window(day: date, window: Optional[tuple[str, str]]) -> bool:
    if not window:
        return False
    md = f"{day.month:02d}-{day.day:02d}"
    return window[0] <= md <= window[1]


def season_score(recipe: CatalogRecipe, day: date) -> int:
    """2 = in season (or in its timely window), 1 = any time of year, 0 = out of season."""
    base = 1 if not recipe.seasons else (2 if season_for(day) in recipe.seasons else 0)
    return base + (2 if _in_window(day, recipe.peak) else 0)


def _tiebreak(issue_key: str, slug: str) -> str:
    return hashlib.sha1(f"{issue_key}:{slug}".encode()).hexdigest()


def cooldown_issues(pool_size: int, count: int = PICK_COUNT) -> int:
    """How many past issues are kept out of the next pick. With 24 recipes and 3 per week that is 7 weeks."""
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
