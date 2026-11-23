import type {
  PantryItem,
  Recipe,
  RecipeCoverage,
  RecipeCoverageStatus,
  RecipeIngredient,
  RecipeIngredientCoverage,
} from "@/types";
import { normalizeItemName } from "@/lib/shopping-list-utils";

export const RECIPE_UNITS = new Set([
  "cup", "cups", "c", "c.", "tbsp", "tbs", "tablespoon", "tablespoons",
  "tsp", "teaspoon", "teaspoons", "oz", "ounce", "ounces", "fl oz", "fluid ounce", "fluid ounces",
  "lb", "lbs", "pound", "pounds", "g", "gram", "grams", "kg", "kilogram", "kilograms",
  "ml", "milliliter", "milliliters", "l", "liter", "liters",
  "pinch", "pinches", "dash", "dashes", "clove", "cloves", "can", "cans",
  "package", "packages", "pkg", "pkgs", "slice", "slices", "bunch", "bunches",
  "head", "heads", "stalk", "stalks", "piece", "pieces", "pt", "pint", "pints",
  "qt", "quart", "quarts", "gal", "gallon", "gallons",
]);

/**
 * Strip leading quantity (numbers, fractions, decimals) and units from raw ingredient text.
 * Returns exact normalized ingredient name (lowercase, trimmed, collapsed whitespace).
 */
export function extractIngredientName(raw: string): string {
  if (!raw) return "";
  let text = raw.trim();

  // Strip leading numbers, mixed numbers, fractions, unicode vulgar fractions
  const qtyMatch = text.match(/^[\d\s./\-\u00BC-\u00BE\u2150-\u215E]+/);
  if (qtyMatch) {
    const rem = text.slice(qtyMatch[0].length).trim();
    if (rem) {
      text = rem;
    }
  }

  const words = text.split(/\s+/);
  if (words.length > 1) {
    const twoWords = `${words[0]} ${words[1]}`.toLowerCase().replace(/[.,]$/, "");
    if (RECIPE_UNITS.has(twoWords)) {
      words.splice(0, 2);
    } else if (RECIPE_UNITS.has(words[0].toLowerCase().replace(/[.,]$/, ""))) {
      words.splice(0, 1);
    }
    text = words.join(" ").trim();
  } else if (words.length === 1 && RECIPE_UNITS.has(words[0].toLowerCase().replace(/[.,]$/, ""))) {
    text = "";
  }

  if (text.toLowerCase().startsWith("of ")) {
    text = text.slice(3).trim();
  }

  // Remove leading/trailing punctuation
  text = text.replace(/^[,;\-\s]+/, "").replace(/[,;\-\s]+$/, "");
  return normalizeItemName(text);
}

/**
 * Match a single ingredient against pantry items using exact normalized name.
 * Statuses:
 * - have: exact normalized name match and total pantry quantity > 0
 * - missing: no exact normalized name match (or total pantry quantity <= 0)
 * - unsure: parsed name is empty or unusable
 */
export function getIngredientCoverage(
  ingredient: RecipeIngredient,
  inventory: PantryItem[]
): RecipeIngredientCoverage {
  const effectiveName = ingredient.name
    ? normalizeItemName(ingredient.name)
    : extractIngredientName(ingredient.raw);

  if (!effectiveName) {
    return {
      ingredient,
      status: "unsure",
      haveQuantity: 0,
    };
  }

  // Exact normalized match only (no substring/fuzzy/contains)
  const matchingItems = inventory.filter(
    (item) => normalizeItemName(item.name) === effectiveName
  );

  const haveQuantity = matchingItems.reduce(
    (sum, item) => sum + (Number(item.quantity) || 0),
    0
  );

  const status: RecipeCoverageStatus =
    matchingItems.length > 0 && haveQuantity > 0 ? "have" : "missing";

  return {
    ingredient,
    status,
    haveQuantity,
  };
}

/**
 * Calculate complete pantry coverage for a recipe.
 */
export function calculateRecipeCoverage(
  recipe: Recipe,
  inventory: PantryItem[]
): RecipeCoverage {
  const items = recipe.ingredients.map((ing) =>
    getIngredientCoverage(ing, inventory)
  );

  const haveCount = items.filter((i) => i.status === "have").length;
  const missingCount = items.filter((i) => i.status === "missing").length;
  const unsureCount = items.filter((i) => i.status === "unsure").length;
  const totalCount = items.length;
  const coveragePercentage =
    totalCount > 0 ? Math.round((haveCount / totalCount) * 100) : 0;

  return {
    recipeId: recipe.id,
    items,
    haveCount,
    missingCount,
    unsureCount,
    totalCount,
    coveragePercentage,
  };
}
