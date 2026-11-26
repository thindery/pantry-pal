import { describe, expect, it } from "vitest";
import type { Recipe as PublicRecipe } from "@/content/recipes/types";
import {
  calculatePublicRecipeCoverage,
  isSavedPublicRecipe,
  pantryMatchLabel,
  publicRecipeSourceUrl,
} from "@/lib/public-recipe-coverage";
import type { PantryItem } from "@/types";

function item(id: string, name: string, quantity = 1): PantryItem {
  return {
    id,
    name,
    quantity,
    unit: "ea",
    category: "other",
    lastUpdated: "2026-11-26T00:00:00Z",
  };
}

const fixture: PublicRecipe = {
  slug: "test-pantry-pasta",
  title: "Test Pantry Pasta",
  seoTitle: "Test Pantry Pasta",
  metaSummary: "A fixture for coverage tests",
  intro: "A fixture recipe.",
  meal: "dinner",
  tags: [],
  servings: 2,
  prepMin: 5,
  cookMin: 10,
  datePublished: "2026-11-26",
  updated: "2026-11-26",
  image: "/recipes/test-pantry-pasta.webp",
  imageAlt: "AI-generated illustration of pasta, not a photo of this dish",
  ingredients: [
    { qty: 8, unit: "oz", item: "spaghetti" },
    { qty: 2, item: "garlic clove", plural: "garlic cloves" },
    { qty: 2, unit: "tbsp", item: "olive oil" },
    { qty: null, item: "salt" },
  ],
  steps: ["Boil the pasta.", "Toss with oil and garlic."],
  substitutions: ["Use any long pasta.", "Use butter instead of oil."],
  tips: ["Salt the water.", "Reserve a splash of pasta water."],
  pantryStaples: ["spaghetti", "garlic", "olive oil"],
  related: ["canned-tuna-pasta", "pasta-e-fagioli", "leftover-rice-fried-rice"],
};

describe("public recipe coverage (PP-200)", () => {
  it("labels pantry match as 'You have X of Y ingredients', counting staples as on hand", () => {
    const inventory = [item("1", "spaghetti", 1), item("2", "garlic cloves", 4)];
    const coverage = calculatePublicRecipeCoverage(fixture, inventory);
    expect(coverage.totalCount).toBe(4);
    expect(coverage.haveCount).toBe(2);
    expect(coverage.stapleCount).toBe(2); // olive oil, salt
    expect(pantryMatchLabel(coverage)).toBe("You have 4 of 4 ingredients");
  });

  it("builds a canonical source URL and recognizes a saved public recipe", () => {
    expect(publicRecipeSourceUrl("leftover-rice-fried-rice", "https://www.mypantryhub.com")).toBe(
      "https://www.mypantryhub.com/recipes/leftover-rice-fried-rice/",
    );
    expect(isSavedPublicRecipe("https://www.mypantryhub.com/recipes/leftover-rice-fried-rice/", "leftover-rice-fried-rice")).toBe(true);
    expect(isSavedPublicRecipe("https://mypantryhub.com/recipes/leftover-rice-fried-rice", "leftover-rice-fried-rice")).toBe(true);
    expect(isSavedPublicRecipe("https://www.mypantryhub.com/recipes/easy-lasagna/", "leftover-rice-fried-rice")).toBe(false);
    expect(isSavedPublicRecipe(null, "leftover-rice-fried-rice")).toBe(false);
  });
});
