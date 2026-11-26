import fs from "node:fs";
import path from "node:path";
import { RECIPES, type Recipe } from "./index";

export type RecipeWithImage = Recipe & {
  /** true once frontend/public/recipes/<slug>.webp exists; false renders the placeholder. */
  hasImage: boolean;
};

/**
 * PP-184: images are added later by Pantry Hub Lead as optimized static files.
 * This checks for the file at build time (server pages only) so a recipe
 * switches from the neutral placeholder to its image just by committing the
 * file, with no code change. Never import this from a client component.
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
