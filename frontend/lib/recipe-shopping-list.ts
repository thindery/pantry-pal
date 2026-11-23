import type {
  RecipeIngredientCoverage,
  ShoppingListItem,
} from "@/types";
import { normalizeItemName } from "@/lib/shopping-list-utils";
import { extractIngredientName } from "@/lib/recipe-coverage";

/**
 * Pure helper to build manual shopping-list rows for missing recipe ingredients:
 * - Adds only missing lines.
 * - Skips names already on the list (using normalizeItemName).
 * - Dedupes the incoming batch.
 * - Default quantity 1, category "other", unit "pieces".
 */
export function buildMissingRecipeShoppingItems(
  missingItems: RecipeIngredientCoverage[],
  existingShoppingList: ShoppingListItem[]
): ShoppingListItem[] {
  const existingNormNames = new Set(
    existingShoppingList.map((item) => normalizeItemName(item.name))
  );

  const seenBatch = new Set<string>();
  const toAdd: ShoppingListItem[] = [];

  for (const cov of missingItems) {
    if (cov.status !== "missing") continue;

    const norm =
      normalizeItemName(cov.ingredient.name) ||
      extractIngredientName(cov.ingredient.raw);
    if (!norm) continue;

    // Skip if already in shopping list
    if (existingNormNames.has(norm)) continue;

    // Dedupe within incoming batch
    if (seenBatch.has(norm)) continue;
    seenBatch.add(norm);

    const displayName = cov.ingredient.name?.trim() || cov.ingredient.raw?.trim() || norm;

    toAdd.push({
      id: `manual-recipe-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      name: displayName,
      category: "other",
      currentQuantity: 0,
      suggestedQuantity: 1,
      unit: "pieces",
      isManual: true,
      isChecked: false,
      addedAt: new Date().toISOString(),
      reason: "manual",
    });
  }

  return toAdd;
}
