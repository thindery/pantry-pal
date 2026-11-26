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

/** Culinary adjectives and prep words that should not drive a pantry match. */
const DESCRIPTORS = new Set([
  "very", "extra", "finely", "fine", "coarse", "coarsely", "freshly", "fresh",
  "grated", "shredded", "chopped", "minced", "diced", "sliced", "crushed",
  "ground", "whole", "large", "small", "medium", "soft", "softened",
  "unsalted", "salted", "dry", "dried", "unoaked", "melted", "cold", "warm",
  "hot", "room", "temperature", "packed", "divided", "optional", "ripe",
  "peeled", "trimmed", "thinly", "thickly", "roughly", "lightly",
  "boneless", "skinless", "lean", "neutral", "kosher", "cracked",
  "leaves", "leaf", "sprigs", "sprig", "plus", "more", "serving", "garnish",
]);

const STOPWORDS = new Set([
  "a", "an", "the", "and", "or", "with", "of", "to", "for", "as", "in", "on",
  "at", "into", "from", "choice", "see", "recipe", "notes", "note",
]);

/**
 * Tokens that refine a product without changing what it is
 * (e.g. "whipping" in "heavy whipping cream").
 */
const VARIANT_TOKENS = new Set([
  "whipping", "whipped", "heavy", "light", "whole", "skim", "lowfat",
  "reduced", "fat", "nonfat", "organic", "pure", "natural", "cultured",
  "european", "clarified", "sweet", "unsalted", "salted", "stick", "sticks",
  "dijon", "yellow", "spicy", "stone", "grain", "virgin", "extra",
  "sea", "table", "kosher", "black", "white", "fresh",
]);

const STAPLE_HEADS = new Set(["salt", "pepper", "oil"]);
const STAPLE_ALLOWED = new Set([
  "salt", "pepper", "oil", "black", "white", "kosher", "sea", "table",
  "olive", "vegetable", "canola", "cooking", "neutral", "and", "or",
  "cracked", "ground",
]);

const IRREGULAR_SINGULARS: Record<string, string> = {
  leaves: "leaf",
  loaves: "loaf",
  potatoes: "potato",
  tomatoes: "tomato",
  cloves: "clove",
  bunches: "bunch",
  halves: "half",
  shelves: "shelf",
  knives: "knife",
};

function singularize(word: string): string {
  if (IRREGULAR_SINGULARS[word]) return IRREGULAR_SINGULARS[word];
  if (word.endsWith("ies") && word.length > 4) return `${word.slice(0, -3)}y`;
  if (word.endsWith("oes") && word.length > 4) return word.slice(0, -2);
  if (/(shes|ches|xes|sses|zes)$/.test(word) && word.length > 4) {
    return word.slice(0, -2);
  }
  if (
    word.endsWith("s") &&
    !word.endsWith("ss") &&
    !word.endsWith("us") &&
    !word.endsWith("is") &&
    word.length > 3
  ) {
    return word.slice(0, -1);
  }
  return word;
}

function stripDecorations(raw: string): string {
  let text = raw.trim();
  // Parentheticals: "(about 3 pounds total before trimming, see Recipe Notes)"
  text = text.replace(/\([^)]*\)/g, " ");
  text = text.replace(/\[[^\]]*\]/g, " ");
  text = text.replace(/\boptional:\s*/gi, " ");
  text = text.replace(/\bsuch as\b.*$/gi, " ");
  text = text.replace(/\bto (season|taste)\b/gi, " ");
  text = text.replace(/\bof choice\b/gi, " ");
  text = text.replace(/\bfor (serving|garnish)\b/gi, " ");
  text = text.replace(/\bplus more\b/gi, " ");
  text = text.replace(/\broom temperature\b/gi, " ");
  return text.replace(/\s+/g, " ").trim();
}

function stripLeadingQuantityAndUnit(raw: string): string {
  let text = raw.trim();
  const qtyMatch = text.match(/^[\d\s./\-\u00BC-\u00BE\u2150-\u215E]+/);
  if (qtyMatch) {
    const rem = text.slice(qtyMatch[0].length).trim();
    if (rem) text = rem;
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
  } else if (
    words.length === 1 &&
    RECIPE_UNITS.has(words[0].toLowerCase().replace(/[.,]$/, ""))
  ) {
    text = "";
  }

  if (text.toLowerCase().startsWith("of ")) {
    text = text.slice(3).trim();
  }

  return text.replace(/^[,;\-\s]+/, "").replace(/[,;\-\s]+$/, "");
}

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

export function tokenizeForMatch(raw: string): string[] {
  if (!raw) return [];
  let text = stripDecorations(raw);
  text = stripLeadingQuantityAndUnit(text);
  text = text.toLowerCase().replace(/[&/+,;:]+/g, " ").replace(/[-_]+/g, " ");
  text = text.replace(/[^\p{L}\p{N}\s]/gu, " ").replace(/\s+/g, " ").trim();
  if (!text) return [];

  const tokens: string[] = [];
  const seen = new Set<string>();
  for (const part of text.split(" ")) {
    if (!part) continue;
    if (RECIPE_UNITS.has(part)) continue;
    if (DESCRIPTORS.has(part) || STOPWORDS.has(part)) continue;
    const token = singularize(part);
    if (!token || DESCRIPTORS.has(token) || STOPWORDS.has(token)) continue;
    if (seen.has(token)) continue;
    seen.add(token);
    tokens.push(token);
  }
  return tokens;
}

/** Normalized core phrase used for pantry matching (descriptors and quantities removed). */
export function normalizeIngredientForMatch(raw: string): string {
  return tokenizeForMatch(raw).join(" ");
}

export function isPantryStaple(raw: string): boolean {
  const tokens = tokenizeForMatch(raw);
  if (tokens.length === 0) return false;
  return tokens.some((t) => STAPLE_HEADS.has(t)) && tokens.every((t) => STAPLE_ALLOWED.has(t));
}

function isIdentityChanging(token: string): boolean {
  return !VARIANT_TOKENS.has(token) && !DESCRIPTORS.has(token) && !STOPWORDS.has(token);
}

export function scoreTokenMatch(ingredientTokens: string[], pantryTokens: string[]): number {
  if (ingredientTokens.length === 0 || pantryTokens.length === 0) return 0;

  const same =
    ingredientTokens.length === pantryTokens.length &&
    ingredientTokens.every((t, i) => t === pantryTokens[i]);
  if (same) return 100;

  const ingSet = new Set(ingredientTokens);
  const panSet = new Set(pantryTokens);
  const ingInPan = ingredientTokens.every((t) => panSet.has(t));
  const panInIng = pantryTokens.every((t) => ingSet.has(t));

  if (ingInPan) {
    const extra = pantryTokens.filter((t) => !ingSet.has(t));
    if (extra.some(isIdentityChanging)) return 0;
    return 80 - extra.length;
  }

  if (panInIng) {
    const extra = ingredientTokens.filter((t) => !panSet.has(t));
    if (extra.some(isIdentityChanging)) return 0;
    return 60 - extra.length;
  }

  return 0;
}

/**
 * Match a single ingredient against pantry items.
 * Statuses:
 * - have: closest pantry name match and total quantity of those closest rows > 0
 * - staple: salt, pepper, or oil (and simple combinations), treated as on hand
 * - missing: no acceptable match (or total pantry quantity <= 0)
 * - unsure: parsed name is empty or unusable
 *
 * Coverage is always computed at read time from the current pantry; recipes
 * do not store a match status.
 */
export function getIngredientCoverage(
  ingredient: RecipeIngredient,
  inventory: PantryItem[]
): RecipeIngredientCoverage {
  const source = ingredient.raw?.trim() || ingredient.name?.trim() || "";
  const tokens = tokenizeForMatch(source);
  // If raw was empty, try the stored name alone
  const matchTokens = tokens.length > 0 ? tokens : tokenizeForMatch(ingredient.name || "");

  if (matchTokens.length === 0) {
    return {
      ingredient,
      status: "unsure",
      haveQuantity: 0,
    };
  }

  if (isPantryStaple(source) || isPantryStaple(matchTokens.join(" "))) {
    return {
      ingredient,
      status: "staple",
      haveQuantity: 0,
    };
  }

  let bestScore = 0;
  const scored: { item: PantryItem; score: number }[] = [];

  for (const item of inventory) {
    const qty = Number(item.quantity) || 0;
    if (qty <= 0) continue;
    const pantryTokens = tokenizeForMatch(item.name);
    const score = scoreTokenMatch(matchTokens, pantryTokens);
    if (score > 0) {
      scored.push({ item, score });
      if (score > bestScore) bestScore = score;
    }
  }

  const closest = scored.filter((s) => s.score === bestScore);
  const haveQuantity = closest.reduce(
    (sum, s) => sum + (Number(s.item.quantity) || 0),
    0
  );

  const status: RecipeCoverageStatus =
    closest.length > 0 && haveQuantity > 0 ? "have" : "missing";

  return {
    ingredient,
    status,
    haveQuantity,
  };
}

/**
 * Calculate complete pantry coverage for a recipe.
 * Always recomputed from the current inventory; nothing is read from a stored match field.
 */
export function calculateRecipeCoverage(
  recipe: Recipe,
  inventory: PantryItem[]
): RecipeCoverage {
  const items = recipe.ingredients.map((ing) =>
    getIngredientCoverage(ing, inventory)
  );

  const haveCount = items.filter((i) => i.status === "have").length;
  const stapleCount = items.filter((i) => i.status === "staple").length;
  const missingCount = items.filter((i) => i.status === "missing").length;
  const unsureCount = items.filter((i) => i.status === "unsure").length;
  const totalCount = items.length;
  const coveragePercentage =
    totalCount > 0 ? Math.round(((haveCount + stapleCount) / totalCount) * 100) : 0;

  return {
    recipeId: recipe.id,
    items,
    haveCount,
    stapleCount,
    missingCount,
    unsureCount,
    totalCount,
    coveragePercentage,
  };
}
