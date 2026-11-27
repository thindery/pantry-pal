import type { Recipe } from "./types";

export const tunaMelts: Recipe = {
  slug: "tuna-melts",
  title: "Tuna Melts",
  seoTitle: "Open-Faced Tuna Melts with Melted Cheese",
  metaSummary: "Open-faced tuna melts, about 20 minutes",
  intro:
    "These are open-faced tuna melts that take about 20 minutes. Tuna salad with celery is piled on toast, topped with cheese, and broiled until the cheese melts and browns in spots. They are a fast lunch from pantry staples.",
  meal: "lunch",
  tags: ["quick"],
  servings: 4,
  prepMin: 10,
  cookMin: 10,
  datePublished: "2026-11-26",
  updated: "2026-11-26",
  image: "/recipes/tuna-melts.webp",
  imageAlt: "AI-generated illustration of open-faced tuna melts with melted cheese on toast, not a photo of this dish",
  ingredients: [
    { qty: 2, unit: "can", size: "5 oz", item: "tuna", note: "drained" },
    { qty: 8, unit: "slice", item: "sandwich bread" },
    { qty: 0.25, unit: "cup", item: "mayonnaise" },
    { qty: 2, unit: "stalk", item: "celery", note: "finely chopped" },
    { qty: 8, unit: "slice", item: "cheddar", note: "or 1 cup shredded" },
    { qty: 1, unit: "tsp", item: "lemon juice" },
    { qty: 0.25, unit: "tsp", item: "salt" },
    { qty: 0.25, unit: "tsp", item: "black pepper" },
  ],
  steps: [
    "Heat the broiler and toast the bread on a baking sheet until just golden, 1 to 2 minutes per side. Leave the broiler on.",
    "In a bowl, mix the tuna, mayonnaise, celery, lemon juice, salt, and pepper.",
    "Divide the tuna salad among the toast slices and top each with cheese.",
    "Broil until the cheese is melted and browned in spots, 2 to 3 minutes. Watch closely. Serve hot.",
  ],
  substitutions: [
    "Tuna: use 2 cans of salmon, drained, or leftover chopped cooked chicken.",
    "Mayonnaise: use 3 tablespoons Greek yogurt plus 1 tablespoon mayonnaise.",
    "Cheddar: use Swiss, provolone, or mozzarella.",
    "Sandwich bread: use English muffins or a sturdy sourdough.",
  ],
  tips: [
    "Toast the bread first so the melts are crisp, not soggy, under the salad.",
    "Stay by the oven during the broil; the cheese can go from melted to too dark in under a minute.",
  ],
  pantryStaples: ["canned tuna", "bread", "cheese"],
  related: ["canned-tuna-pasta", "chickpea-salad-sandwiches", "leftover-turkey-sandwiches"],
};
