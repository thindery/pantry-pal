import { RECIPES, type Recipe } from "./index";

/**
 * PP-238: first-party holiday collection at /recipes/holiday/.
 * Indexable on the same flag as the recipe library (not the tag-page flag).
 * Recipes are included when they carry the "holiday" tag.
 */
export const HOLIDAY_COLLECTION = {
  slug: "holiday",
  path: "/recipes/holiday/" as const,
  title: "Holiday Recipes",
  /** Page <title> without the brand. */
  seoTitle: "Holiday Recipes for Thanksgiving and Christmas",
  metaDescription:
    "Thanksgiving leftovers, Christmas baking, holiday sides, and New Year's dishes. Times and substitutions included. Track the ingredients in Pantry Hub, free.",
  intro:
    "These are recipes for the stretch from Thanksgiving through New Year's: leftover turkey, holiday sides, Christmas baking, a party appetizer, a breakfast casserole, and a New Year's pot of Hoppin' John. Times and substitutions are listed on every page, and you can scale the yield to the number of people at the table.",
  updated: "2026-11-26",
};

export function holidayRecipes(): Recipe[] {
  return RECIPES.filter((recipe) => recipe.tags.includes("holiday"));
}

export function holidayCollectionLastModified(): string {
  const dates = [HOLIDAY_COLLECTION.updated, ...holidayRecipes().map((r) => r.updated)];
  return dates.sort().at(-1) ?? HOLIDAY_COLLECTION.updated;
}
