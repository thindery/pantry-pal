import fs from "node:fs";
import path from "node:path";
import { RECIPES, type Recipe } from "./index";

export type RecipeWithImage = Recipe & {
  /** true once frontend/public/recipes/<slug>.webp exists; false renders the placeholder. */
  hasImage: boolean;
};

/**
 * PP-184: optimized WebP files at frontend/public/recipes/<slug>.webp.
 * This checks for the file at build time (server pages only). Standing rule:
 * every recipe ships with its image; no placeholders may go live.
 * Never import this from a client component.
 */
export function recipeHasImage(recipe: Pick<Recipe, "image">): boolean {
  const file = path.join(process.cwd(), "public", recipe.image.replace(/^\//, ""));
  return fs.existsSync(file);
}

export function withImageState(recipe: Recipe): RecipeWithImage {
  return { ...recipe, hasImage: recipeHasImage(recipe) };
}

export function allRecipesWithImageState(): RecipeWithImage[] {
  return RECIPES.map(withImageState);
}
