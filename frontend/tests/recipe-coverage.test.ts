import { describe, expect, it } from "vitest";
import type { PantryItem, Recipe } from "@/types";
import {
  calculateRecipeCoverage,
  extractIngredientName,
  getIngredientCoverage,
  isPantryStaple,
  normalizeIngredientForMatch,
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

  it("treats black pepper as a pantry staple, not a match against bell pepper", () => {
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

    expect(result.status).toBe("staple");
    expect(result.haveQuantity).toBe(0);
  });

  it("does not match green beans to black beans, or milk to coconut milk", () => {
    const beans = getIngredientCoverage(
      { raw: "1 cup green beans", name: "green beans" },
      [
        {
          id: "p1",
          name: "black beans",
          quantity: 2,
          unit: "cans",
          category: "canned",
          lastUpdated: "2026-11-22T00:00:00Z",
        },
      ]
    );
    expect(beans.status).toBe("missing");

    const milk = getIngredientCoverage(
      { raw: "1 cup milk", name: "milk" },
      [
        {
          id: "p2",
          name: "Coconut Milk",
          quantity: 1,
          unit: "can",
          category: "canned",
          lastUpdated: "2026-11-22T00:00:00Z",
        },
      ]
    );
    expect(milk.status).toBe("missing");
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


function pantryItem(name: string, quantity = 1, category = "other"): PantryItem {
  return {
    id: name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    name,
    quantity,
    unit: "units",
    category,
    lastUpdated: "2026-11-26T00:00:00Z",
  };
}

/** Tylor's live pantry from the 2026-11-26 bug report. */
const tylorPantry: PantryItem[] = [
  pantryItem("Butter", 2, "dairy"),
  pantryItem("Butter cake"),
  pantryItem("Butter Golden Cake Mix"),
  pantryItem("Buttermilk Pancake & Waffle Mix"),
  pantryItem("Buttery Golden Selects Mashed Potatoes"),
  pantryItem("Peanut Butter Spread"),
  pantryItem("Heavy Whipping Cream", 1, "Dairy"),
  pantryItem("Cream Cheese"),
  pantryItem("Cream of chicken"),
  pantryItem("Cream of Chicken condensed soup"),
  pantryItem("Bake house pie crust"),
  pantryItem("Pie Crust"),
];

describe("PP-189 robust pantry matching", () => {
  it("normalizes quantities, units, descriptors, parentheticals, and 'such as' / optional lines", () => {
    expect(normalizeIngredientForMatch("1-2 tablespoons very soft unsalted butter")).toBe("butter");
    expect(normalizeIngredientForMatch("¾ cup heavy cream")).toBe("heavy cream");
    expect(normalizeIngredientForMatch("optional: ¼ cup finely grated parmesan")).toBe("parmesan");
    expect(normalizeIngredientForMatch("½ cup dry, unoaked white wine such as Pinot Grigio")).toBe("white wine");
    expect(normalizeIngredientForMatch("2 large leeks (about 3 pounds total before trimming, see Recipe Notes)")).toBe("leek");
    expect(normalizeIngredientForMatch("1 tablespoon fresh thyme leaves")).toBe("thyme");
  });

  it("matches butter to Butter, not peanut butter, butter cake, buttermilk, or buttery potatoes", () => {
    const result = getIngredientCoverage(
      { raw: "1-2 tablespoons very soft unsalted butter", name: "very soft unsalted butter" },
      tylorPantry
    );
    expect(result.status).toBe("have");
    expect(result.haveQuantity).toBe(2);

    const onlyLookalikes = getIngredientCoverage(
      { raw: "1-2 tablespoons very soft unsalted butter", name: "very soft unsalted butter" },
      [
        pantryItem("Butter cake"),
        pantryItem("Butter Golden Cake Mix"),
        pantryItem("Buttermilk Pancake & Waffle Mix"),
        pantryItem("Buttery Golden Selects Mashed Potatoes"),
        pantryItem("Peanut Butter Spread"),
        pantryItem("Bake house pie crust"),
        pantryItem("Pie Crust"),
      ]
    );
    expect(onlyLookalikes.status).toBe("missing");
    expect(onlyLookalikes.haveQuantity).toBe(0);
  });

  it("matches heavy cream to Heavy Whipping Cream, not cream cheese or cream of chicken", () => {
    const result = getIngredientCoverage(
      { raw: "¾ cup heavy cream", name: "heavy cream" },
      tylorPantry
    );
    expect(result.status).toBe("have");
    expect(result.haveQuantity).toBe(1);

    const onlyLookalikes = getIngredientCoverage(
      { raw: "¾ cup heavy cream", name: "heavy cream" },
      [
        pantryItem("Cream Cheese"),
        pantryItem("Cream of chicken"),
        pantryItem("Cream of Chicken condensed soup"),
      ]
    );
    expect(onlyLookalikes.status).toBe("missing");
    expect(onlyLookalikes.haveQuantity).toBe(0);
  });

  it("labels salt, pepper, and oil as pantry staples", () => {
    expect(isPantryStaple("kosher salt and ground black pepper, to season")).toBe(true);
    expect(isPantryStaple("1-2 tablespoons neutral oil of choice")).toBe(true);
    expect(isPantryStaple("1/2 tsp salt")).toBe(true);

    const saltPepper = getIngredientCoverage(
      { raw: "kosher salt and ground black pepper, to season", name: "kosher salt and ground black pepper, to season" },
      tylorPantry
    );
    expect(saltPepper.status).toBe("staple");

    const oil = getIngredientCoverage(
      { raw: "1-2 tablespoons neutral oil of choice", name: "neutral oil of choice" },
      tylorPantry
    );
    expect(oil.status).toBe("staple");
  });

  it("matches Tylor's 9-ingredient recipe against his pantry at read time", () => {
    const recipe: Recipe = {
      id: "r-tylor",
      userId: "u1",
      title: "Imported leek recipe",
      sourceUrl: null,
      imageUrl: null,
      servings: "4",
      ingredients: [
        { raw: "2 large leeks (about 3 pounds total before trimming, see Recipe Notes)", name: "large leeks (about 3 pounds total before trimming, see Recipe Notes)" },
        { raw: "1-2 tablespoons very soft unsalted butter", name: "very soft unsalted butter" },
        { raw: "kosher salt and ground black pepper, to season", name: "kosher salt and ground black pepper, to season" },
        { raw: "1-2 tablespoons neutral oil of choice", name: "neutral oil of choice" },
        { raw: "½ cup dry, unoaked white wine such as Pinot Grigio", name: "dry, unoaked white wine such as Pinot Grigio" },
        { raw: "¾ cup heavy cream", name: "heavy cream" },
        { raw: "1 teaspoon Dijon mustard", name: "Dijon mustard" },
        { raw: "1 tablespoon fresh thyme leaves", name: "fresh thyme leaves" },
        { raw: "optional: ¼ cup finely grated parmesan", name: "optional: finely grated parmesan" },
      ],
      instructions: ["Cook the leeks"],
      createdAt: "2026-11-26T00:00:00Z",
    };

    const coverage = calculateRecipeCoverage(recipe, tylorPantry);
    const byRaw = Object.fromEntries(
      coverage.items.map((item) => [item.ingredient.raw, item.status])
    );

    expect(byRaw["2 large leeks (about 3 pounds total before trimming, see Recipe Notes)"]).toBe("missing");
    expect(byRaw["1-2 tablespoons very soft unsalted butter"]).toBe("have");
    expect(byRaw["kosher salt and ground black pepper, to season"]).toBe("staple");
    expect(byRaw["1-2 tablespoons neutral oil of choice"]).toBe("staple");
    expect(byRaw["½ cup dry, unoaked white wine such as Pinot Grigio"]).toBe("missing");
    expect(byRaw["¾ cup heavy cream"]).toBe("have");
    expect(byRaw["1 teaspoon Dijon mustard"]).toBe("missing");
    expect(byRaw["1 tablespoon fresh thyme leaves"]).toBe("missing");
    expect(byRaw["optional: ¼ cup finely grated parmesan"]).toBe("missing");

    expect(coverage.haveCount).toBe(2);
    expect(coverage.stapleCount).toBe(2);
    expect(coverage.missingCount).toBe(5);
    expect(coverage.unsureCount).toBe(0);
    expect(coverage.totalCount).toBe(9);
    expect(coverage.coveragePercentage).toBe(44);

    // Recipes store no match status; recomputing with an empty pantry drops the 'have' rows.
    const empty = calculateRecipeCoverage(recipe, []);
    expect(empty.items.find((i) => i.ingredient.name === "heavy cream")?.status).toBe("missing");
    expect(empty.items.find((i) => i.ingredient.name === "very soft unsalted butter")?.status).toBe("missing");
    expect(empty.haveCount).toBe(0);
    expect(empty.stapleCount).toBe(2);
  });
});
