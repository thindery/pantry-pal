import type { Recipe } from "./types";

export const roastedBroccoli: Recipe = {
  slug: "roasted-broccoli",
  title: "Roasted Broccoli",
  seoTitle: "Garlic Roasted Broccoli, a Simple Side Dish",
  metaSummary: "Garlic roasted broccoli, about 25 minutes",
  intro:
    "This is garlic roasted broccoli that takes about 25 minutes. Broccoli florets roast on a sheet pan with olive oil and garlic until the edges brown. It is a simple side for chicken, salmon, or pasta.",
  meal: "dinner",
  tags: ["vegetarian", "vegan", "sheet-pan"],
  servings: 4,
  prepMin: 10,
  cookMin: 15,
  datePublished: "2026-11-26",
  updated: "2026-11-26",
  image: "/recipes/roasted-broccoli.webp",
  imageAlt: "AI-generated illustration of roasted broccoli florets with garlic on a sheet pan, not a photo of this dish",
  ingredients: [
    { qty: 1.5, unit: "lb", item: "broccoli florets" },
    { qty: 3, unit: "tbsp", item: "olive oil" },
    { qty: 3, unit: "clove", item: "garlic", plural: "garlic cloves", note: "minced" },
    { qty: 0.75, unit: "tsp", item: "salt" },
    { qty: 0.25, unit: "tsp", item: "black pepper" },
    { qty: 1, unit: "tbsp", item: "lemon juice", note: "optional, for serving" },
  ],
  steps: [
    "Heat the oven to 425°F (220°C). Toss the broccoli with the olive oil, garlic, salt, and pepper. Spread in a single layer on a rimmed sheet pan.",
    "Roast for 12 to 16 minutes, until the stems are tender and the edges are browned in spots.",
    "Taste for salt.",
    "Finish with lemon juice if you like, and serve hot.",
  ],
  substitutions: [
    "Fresh broccoli: use a 16-ounce bag of frozen broccoli florets, tossed with the oil and garlic while still frozen, and roast a few minutes longer so the extra moisture cooks off.",
    "Garlic: use ½ teaspoon garlic powder tossed with the oil.",
    "Lemon juice: use a pinch of red pepper flakes instead, or leave the broccoli plain.",
  ],
  tips: [
    "Give the florets space on the pan so they roast instead of steam.",
    "The minced garlic can brown quickly; if it looks dark at 10 minutes, stir the pan once and finish roasting.",
  ],
  pantryStaples: ["broccoli", "garlic", "olive oil"],
  related: ["vegetable-stir-fry", "sheet-pan-chicken-and-vegetables", "garlic-mashed-potatoes"],
};
