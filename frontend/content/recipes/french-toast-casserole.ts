import type { Recipe } from "./types";

export const frenchToastCasserole: Recipe = {
  slug: "french-toast-casserole",
  title: "French Toast Casserole",
  seoTitle: "Make-Ahead French Toast Casserole for Breakfast",
  metaSummary: "Baked French toast casserole, about 55 minutes",
  intro:
    "This is a baked French toast casserole that takes about 55 minutes, plus an optional overnight rest. Cubes of bread soak in a cinnamon custard, then bake until the top is golden and the center is set. It is a breakfast you can assemble the night before.",
  meal: "breakfast",
  tags: ["vegetarian", "make-ahead"],
  servings: 8,
  prepMin: 15,
  cookMin: 40,
  datePublished: "2026-11-26",
  updated: "2026-11-26",
  image: "/recipes/french-toast-casserole.webp",
  imageAlt: "AI-generated illustration of baked French toast casserole with golden bread cubes in custard, not a photo of this dish",
  ingredients: [
    { qty: 1, unit: "lb", item: "day-old bread", note: "cut into 1-inch cubes, about 10 cups" },
    { qty: 6, item: "large egg", plural: "large eggs" },
    { qty: 2, unit: "cup", item: "whole milk" },
    { qty: 0.25, unit: "cup", item: "sugar" },
    { qty: 2, unit: "tsp", item: "vanilla extract" },
    { qty: 1, unit: "tsp", item: "ground cinnamon" },
    { qty: 0.25, unit: "tsp", item: "salt" },
    { qty: 2, unit: "tbsp", item: "butter", note: "for the dish, plus more for serving" },
  ],
  steps: [
    "Heat the oven to 350°F (175°C). Butter a 9×13-inch baking dish and spread the bread cubes in it.",
    "Whisk the eggs, milk, sugar, vanilla, cinnamon, and salt. Pour the custard evenly over the bread and press the cubes down so they soak. If you have time, cover and refrigerate for 8 hours or overnight; otherwise let it stand 15 minutes.",
    "Bake, uncovered, for 35 to 40 minutes, until the top is golden and the center is set (it should not jiggle like liquid).",
    "Rest for 10 minutes, then serve with butter and maple syrup.",
  ],
  substitutions: [
    "Day-old bread: use a rustic loaf, brioche, or challah; very fresh bread works if you toast the cubes for 8 minutes first.",
    "Whole milk: use 2 cups half-and-half for a richer custard, or a plain unsweetened milk alternative.",
    "Sugar: use 3 tablespoons maple syrup in the custard instead.",
  ],
  tips: [
    "The overnight rest is optional but gives a more even, custardy center.",
    "Leftover squares reheat in a 325°F (165°C) oven until hot, or in a skillet with a little butter.",
  ],
  pantryStaples: ["bread", "eggs", "milk", "cinnamon"],
  related: ["buttermilk-pancakes", "breakfast-casserole", "bread-pudding"],
};
