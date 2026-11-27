import type { Recipe } from "./types";

export const airFryerRoastedPotatoes: Recipe = {
  slug: "air-fryer-roasted-potatoes",
  title: "Air-Fryer Roasted Potatoes",
  seoTitle: "Crispy Air-Fryer Roasted Potatoes Side Dish",
  metaSummary: "Crispy air-fryer roasted potatoes, about 30 minutes",
  intro:
    "These are crispy air-fryer roasted potatoes that take about 30 minutes. Potato chunks toss with oil, salt, and a little rosemary, then cook until the edges are browned. They are a side for chicken, eggs, or a weeknight roast.",
  meal: "dinner",
  tags: ["air-fryer", "vegetarian"],
  servings: 4,
  prepMin: 10,
  cookMin: 20,
  datePublished: "2026-11-26",
  updated: "2026-11-26",
  image: "/recipes/air-fryer-roasted-potatoes.webp",
  imageAlt: "AI-generated illustration of crispy roasted potato chunks in a bowl, not a photo of this dish",
  ingredients: [
    { qty: 2, unit: "lb", item: "Yukon Gold potatoes", note: "cut into 1-inch chunks" },
    { qty: 2, unit: "tbsp", item: "olive oil" },
    { qty: 1, unit: "tsp", item: "dried rosemary", note: "or 1 tablespoon chopped fresh" },
    { qty: 0.75, unit: "tsp", item: "salt" },
    { qty: 0.5, unit: "tsp", item: "garlic powder" },
    { qty: 0.25, unit: "tsp", item: "black pepper" },
  ],
  steps: [
    "Pat the potato chunks dry. Toss them with the olive oil, rosemary, salt, garlic powder, and pepper.",
    "Heat the air fryer to 400°F (200°C). Arrange the potatoes in a single layer; cook in batches if your basket is crowded.",
    "Air-fry for 16 to 20 minutes, shaking the basket halfway, until the potatoes are tender inside and browned at the edges.",
    "Taste for salt and serve hot.",
  ],
  substitutions: [
    "Yukon Gold: use russet potatoes, cut the same size; they crisp a little more.",
    "Dried rosemary: use dried thyme or Italian seasoning.",
    "Olive oil: use another neutral oil.",
  ],
  tips: [
    "Drying the potatoes and leaving space in the basket are what help them brown instead of steam.",
    "Leftovers reheat well in the air fryer for a few minutes until hot and crisp again.",
  ],
  pantryStaples: ["potatoes", "olive oil", "rosemary"],
  related: ["garlic-mashed-potatoes", "air-fryer-chicken-thighs", "sheet-pan-lemon-salmon"],
};
