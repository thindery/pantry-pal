import type { Recipe as PublicRecipe } from "@/content/recipes/types";
import { calculateRecipeCoverage } from "@/lib/recipe-coverage";
import { scaleIngredients } from "@/lib/recipe-scaling";
import type { PantryItem, Recipe, RecipeCoverage, RecipeIngredient } from "@/types";

export function publicRecipeIngredients(recipe: PublicRecipe): RecipeIngredient[] {
  return scaleIngredients(recipe.ingredients, 1).map((line, i) => ({
    raw: line.text,
    name: recipe.ingredients[i].item,
  }));
}

/** Run the PP-189 pantry matcher against a public library recipe. */
export function calculatePublicRecipeCoverage(
  recipe: PublicRecipe,
  inventory: PantryItem[],
): RecipeCoverage {
  const asRecipe: Recipe = {
    id: recipe.slug,
    userId: "",
    title: recipe.title,
    ingredients: publicRecipeIngredients(recipe),
    instructions: recipe.steps,
    createdAt: recipe.datePublished,
  };
  return calculateRecipeCoverage(asRecipe, inventory);
}

export function pantryMatchLabel(coverage: RecipeCoverage): string {
  const have = coverage.haveCount + coverage.stapleCount;
  return `You have ${have} of ${coverage.totalCount} ingredients`;
}

export function publicRecipeSourceUrl(slug: string, siteUrl: string): string {
  return `${siteUrl.replace(/\/$/, "")}/recipes/${slug}/`;
}

export function isSavedPublicRecipe(
  sourceUrl: string | null | undefined,
  slug: string,
): boolean {
  if (!sourceUrl) return false;
  return sourceUrl.includes(`/recipes/${slug}`);
}
