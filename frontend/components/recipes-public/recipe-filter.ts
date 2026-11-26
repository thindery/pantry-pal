import { MEAL_LABELS, totalMinutes, type DietTag, type MealType, type Recipe } from "@/content/recipes";

export interface RecipeFilters {
  meal: MealType | "all";
  diet: DietTag | "all";
  /** true shows only recipes with 30 minutes or less total time. */
  quick: boolean;
  query: string;
}

export const DEFAULT_FILTERS: RecipeFilters = { meal: "all", diet: "all", quick: false, query: "" };
export const QUICK_MINUTES = 30;

function matchesDiet(recipe: Recipe, diet: DietTag | "all"): boolean {
  if (diet === "all") return true;
  if (diet === "vegetarian") return recipe.tags.includes("vegetarian") || recipe.tags.includes("vegan");
  return recipe.tags.includes(diet);
}

function matchesQuery(recipe: Recipe, query: string): boolean {
  const tokens = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return true;
  const haystack = [
    recipe.title,
    recipe.metaSummary,
    MEAL_LABELS[recipe.meal],
    ...recipe.tags,
    ...recipe.ingredients.map((i) => i.item),
  ]
    .join(" ")
    .toLowerCase();
  return tokens.every((t) => haystack.includes(t));
}

export function filterRecipes<T extends Recipe>(recipes: readonly T[], filters: RecipeFilters): T[] {
  return recipes.filter(
    (r) =>
      (filters.meal === "all" || r.meal === filters.meal) &&
      matchesDiet(r, filters.diet) &&
      (!filters.quick || totalMinutes(r) <= QUICK_MINUTES) &&
      matchesQuery(r, filters.query)
  );
}
