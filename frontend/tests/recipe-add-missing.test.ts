import { describe, expect, it } from "vitest";
import type { RecipeIngredientCoverage, ShoppingListItem } from "@/types";
import { buildMissingRecipeShoppingItems } from "@/lib/recipe-shopping-list";

describe("recipe-shopping-list", () => {
  it("adds only missing lines as manual shopping items", () => {
    const missing: RecipeIngredientCoverage[] = [
      {
        ingredient: { raw: "2 cups all-purpose flour", name: "all-purpose flour" },
        status: "have",
        haveQuantity: 2,
      },
      {
        ingredient: { raw: "1 tsp baking soda", name: "baking soda" },
        status: "missing",
        haveQuantity: 0,
      },
      {
        ingredient: { raw: "1 cup chocolate chips", name: "chocolate chips" },
        status: "missing",
        haveQuantity: 0,
      },
      {
        ingredient: { raw: "", name: "" },
        status: "unsure",
        haveQuantity: 0,
      },
    ];

    const existingList: ShoppingListItem[] = [];
    const result = buildMissingRecipeShoppingItems(missing, existingList);

    expect(result).toHaveLength(2);
    expect(result.map((i) => i.name)).toEqual(["baking soda", "chocolate chips"]);
    expect(result.every((i) => i.isManual === true)).toBe(true);
    expect(result.every((i) => i.suggestedQuantity === 1)).toBe(true);
    expect(result.every((i) => i.category === "other")).toBe(true);
  });

  it("skips items that already exist on the shopping list by normalized name", () => {
    const missing: RecipeIngredientCoverage[] = [
      {
        ingredient: { raw: "1 tsp baking soda", name: "Baking Soda" },
        status: "missing",
        haveQuantity: 0,
      },
      {
        ingredient: { raw: "1 cup chocolate chips", name: "chocolate chips" },
        status: "missing",
        haveQuantity: 0,
      },
    ];

    const existingList: ShoppingListItem[] = [
      {
        id: "manual-1",
        name: "  baking   soda  ",
        category: "baking",
        currentQuantity: 0,
        suggestedQuantity: 1,
        unit: "box",
        isManual: true,
        isChecked: false,
        addedAt: "2026-11-22T00:00:00Z",
        reason: "manual",
      },
    ];

    const result = buildMissingRecipeShoppingItems(missing, existingList);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("chocolate chips");
  });

  it("dedupes within the incoming batch", () => {
    const missing: RecipeIngredientCoverage[] = [
      {
        ingredient: { raw: "1 cup whole milk", name: "whole milk" },
        status: "missing",
        haveQuantity: 0,
      },
      {
        ingredient: { raw: "1/2 cup Whole Milk", name: "Whole Milk" },
        status: "missing",
        haveQuantity: 0,
      },
    ];

    const existingList: ShoppingListItem[] = [];
    const result = buildMissingRecipeShoppingItems(missing, existingList);

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("whole milk");
  });

  it("returns an empty list when there are no missing ingredients", () => {
    expect(buildMissingRecipeShoppingItems([], [])).toEqual([]);
  });
});
