import { describe, expect, it } from "vitest";
import type { PantryItem, Recipe } from "@/types";
import {
  calculateRecipeCoverage,
  extractIngredientName,
  getIngredientCoverage,
} from "@/lib/recipe-coverage";

describe("recipe-coverage", () => {
  it("extracts conservative ingredient name by stripping leading quantity and unit", () => {
    expect(extractIngredientName("2 cups all-purpose flour")).toBe("all-purpose flour");
    expect(extractIngredientName("1 1/2 tbsp olive oil")).toBe("olive oil");
    expect(extractIngredientName("1/2 tsp salt")).toBe("salt");
    expect(extractIngredientName("3 large eggs")).toBe("large eggs");
    expect(extractIngredientName("black pepper")).toBe("black pepper");
    expect(extractIngredientName("1 bell pepper")).toBe("bell pepper");
    expect(extractIngredientName("1 can whole peeled tomatoes")).toBe("whole peeled tomatoes");
  });

  it("matches exact normalized item name and marks status 'have'", () => {
    const inventory: PantryItem[] = [
      {
        id: "p1",
        name: "All-Purpose Flour",
        quantity: 2,
        unit: "cups",
        category: "baking",
        lastUpdated: "2026-11-22T00:00:00Z",
      },
    ];

    const result = getIngredientCoverage(
      { raw: "2 cups all-purpose flour", name: "all-purpose flour" },
      inventory
    );

    expect(result.status).toBe("have");
    expect(result.haveQuantity).toBe(2);
  });

  it("sums have across multiple pantry rows sharing the exact normalized name", () => {
    const inventory: PantryItem[] = [
      {
        id: "p1",
        name: "all-purpose flour",
        quantity: 2,
        unit: "cups",
        category: "baking",
        lastUpdated: "2026-11-22T00:00:00Z",
      },
      {
        id: "p2",
        name: "All-Purpose Flour ",
        quantity: 1.5,
        unit: "cups",
        category: "baking",
        lastUpdated: "2026-11-22T00:00:00Z",
      },
    ];

    const result = getIngredientCoverage(
      { raw: "3 cups all-purpose flour", name: "all-purpose flour" },
      inventory
    );

    expect(result.status).toBe("have");
    expect(result.haveQuantity).toBe(3.5);
  });

  it("does NOT perform substring/fuzzy match: 'black pepper' must not match 'bell pepper'", () => {
    const inventory: PantryItem[] = [
      {
        id: "p1",
        name: "bell pepper",
        quantity: 3,
        unit: "pieces",
        category: "produce",
        lastUpdated: "2026-11-22T00:00:00Z",
      },
    ];

    const result = getIngredientCoverage(
      { raw: "1 tsp black pepper", name: "black pepper" },
      inventory
    );

    expect(result.status).toBe("missing");
    expect(result.haveQuantity).toBe(0);
  });

  it("marks status 'unsure' if ingredient name is empty or unusable", () => {
    const inventory: PantryItem[] = [
      {
        id: "p1",
        name: "salt",
        quantity: 1,
        unit: "tsp",
        category: "spices",
        lastUpdated: "2026-11-22T00:00:00Z",
      },
    ];

    const result = getIngredientCoverage(
      { raw: "   ", name: "" },
      inventory
    );

    expect(result.status).toBe("unsure");
    expect(result.haveQuantity).toBe(0);
  });

  it("calculates overall recipe coverage percentages accurately", () => {
    const recipe: Recipe = {
      id: "r1",
      userId: "u1",
      title: "Simple Pasta",
      sourceUrl: null,
      imageUrl: null,
      servings: "2",
      ingredients: [
        { raw: "8 oz pasta", name: "pasta" },
        { raw: "2 tbsp butter", name: "butter" },
        { raw: "1/4 cup parmesan cheese", name: "parmesan cheese" },
        { raw: "", name: "" },
      ],
      instructions: ["Boil pasta", "Mix with butter and parmesan"],
      createdAt: "2026-11-22T00:00:00Z",
    };

    const inventory: PantryItem[] = [
      {
        id: "p1",
        name: "pasta",
        quantity: 1,
        unit: "box",
        category: "pasta",
        lastUpdated: "2026-11-22T00:00:00Z",
      },
      {
        id: "p2",
        name: "butter",
        quantity: 2,
        unit: "sticks",
        category: "dairy",
        lastUpdated: "2026-11-22T00:00:00Z",
      },
    ];

    const coverage = calculateRecipeCoverage(recipe, inventory);
    expect(coverage.haveCount).toBe(2);
    expect(coverage.missingCount).toBe(1);
    expect(coverage.unsureCount).toBe(1);
    expect(coverage.totalCount).toBe(4);
    expect(coverage.coveragePercentage).toBe(50);
  });

  it("handles a recipe with no ingredients without treating anything as missing", () => {
    const recipe: Recipe = {
      id: "r-empty",
      userId: "u1",
      title: "Neiman Marcus Cake II",
      sourceUrl: "https://www.allrecipes.com/recipe/7869/neiman-marcus-cake-ii/",
      ingredients: [],
      instructions: [],
      isComplete: false,
      createdAt: "2026-11-23T00:00:00Z",
    };
    const coverage = calculateRecipeCoverage(recipe, [
      {
        id: "p1",
        name: "Milk",
        quantity: 1,
        unit: "count",
        category: "dairy",
        lastUpdated: "2026-11-23T00:00:00Z",
      },
    ]);
    expect(coverage.totalCount).toBe(0);
    expect(coverage.haveCount).toBe(0);
    expect(coverage.missingCount).toBe(0);
    expect(coverage.unsureCount).toBe(0);
    expect(coverage.coveragePercentage).toBe(0);
    expect(coverage.items).toEqual([]);
  });
});
