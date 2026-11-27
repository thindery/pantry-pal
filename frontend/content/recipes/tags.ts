import { RECIPES, totalMinutes } from "./index";
import type { Recipe } from "./types";

/**
 * PP-184: tag pages at /recipes/tag/<slug>/. They always send noindex,nofollow
 * and are never in the sitemap (see RECIPE_TAG_PAGES_INDEXABLE in config.ts).
 * No "pantry-staples" tag (it would duplicate /recipes/) and nothing about
 * expiry or food waste.
 */
export interface RecipeTagPage {
  slug: string;
  /** Page <title> without the brand and the H1. */
  title: string;
  /** Meta description, 140 to 160 characters. */
  metaDescription: string;
  /** Unique 2 to 3 sentence intro. */
  intro: string;
  matches: (recipe: Recipe) => boolean;
}

export const TAG_PAGES: readonly RecipeTagPage[] = [
  {
    slug: "breakfast",
    metaDescription:
      "Make-ahead breakfast recipes: baked oatmeal, freezer burritos, and a vegetable frittata. Substitutions included. Track the ingredients in Pantry Hub, free.",
    title: "Easy Make-Ahead Breakfast Recipes",
    intro:
      "Breakfasts you can mostly prepare ahead: a pan of baked oatmeal, burritos for the freezer, and a frittata that uses up leftover vegetables. Each one is built from pantry and freezer staples and scales to the number of servings you need.",
    matches: (r) => r.meal === "breakfast",
  },
  {
    slug: "dinner",
    metaDescription:
      "Easy pantry dinner recipes built from canned beans, tomatoes, pasta, and rice. Times and substitutions included. Track the ingredients in Pantry Hub, free.",
    title: "Easy Pantry Dinner Recipes",
    intro:
      "Weeknight dinners built around canned beans, canned tomatoes, pasta, rice, and spices. Most are one pot or one pan, with the prep and cook times listed up front and substitutions for anything you are missing.",
    matches: (r) => r.meal === "dinner",
  },
  {
    slug: "vegetarian",
    metaDescription:
      "Vegetarian and vegan pantry recipes made with beans, lentils, chickpeas, rice, and eggs. Substitutions included. Track the ingredients in Pantry Hub, free.",
    title: "Vegetarian and Vegan Pantry Recipes",
    intro:
      "Meatless meals made from beans, lentils, chickpeas, rice, and eggs. Several are vegan as written. Each recipe lists substitutions in case your pantry looks a little different.",
    matches: (r) => r.tags.includes("vegetarian") || r.tags.includes("vegan"),
  },
  {
    slug: "30-min",
    metaDescription:
      "Pantry recipes ready in 30 minutes or less, built from canned goods, frozen vegetables, and staples. Substitutions included. Track them in Pantry Hub, free.",
    title: "Pantry Recipes in 30 Minutes or Less",
    intro:
      "Recipes with a combined prep and cook time of 30 minutes or less. They lean on canned goods, frozen vegetables, and ingredients that keep well, so you can cook without a shopping trip.",
    matches: (r) => totalMinutes(r) <= 30,
  },
  {
    slug: "leftovers",
    metaDescription:
      "Leftover turkey soup, pot pie, and sandwiches, plus fried rice and a vegetable frittata. Substitutions included. Track the ingredients in Pantry Hub, free.",
    title: "Recipes for Leftover Turkey, Rice, and Vegetables",
    intro:
      "Ways to turn what is already in the fridge into a new meal: leftover turkey soup, pot pie, and sandwiches, egg fried rice from cold cooked rice, and a frittata for leftover vegetables. Cool and store leftovers promptly, and reheat them until steaming hot.",
    matches: (r) => r.tags.includes("leftovers"),
  },
];

export function getTagPage(slug: string): RecipeTagPage | undefined {
  return TAG_PAGES.find((t) => t.slug === slug);
}

export function recipesForTag(tag: RecipeTagPage): Recipe[] {
  return RECIPES.filter(tag.matches);
}

/** Tag pages that have at least one recipe. */
export function activeTagPages(): RecipeTagPage[] {
  return TAG_PAGES.filter((t) => recipesForTag(t).length > 0);
}
