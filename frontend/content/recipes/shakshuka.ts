import type { Recipe } from "./types";

export const shakshuka: Recipe = {
  slug: "shakshuka",
  title: "Shakshuka",
  seoTitle: "Skillet Shakshuka with Eggs and Tomatoes",
  metaSummary: "Shakshuka with eggs in tomato sauce, about 30 minutes",
  intro:
    "This is skillet shakshuka that takes about 30 minutes. Eggs poach in a spiced tomato and pepper sauce until the whites are set and the yolks are still a little soft. It is a breakfast or brunch you can also eat for dinner, with bread for scooping.",
  meal: "breakfast",
  tags: ["vegetarian", "one-pot"],
  servings: 4,
  prepMin: 10,
  cookMin: 20,
  datePublished: "2026-11-26",
  updated: "2026-11-26",
  image: "/recipes/shakshuka.webp",
  imageAlt: "AI-generated illustration of shakshuka with eggs poached in a tomato and pepper sauce in a skillet, not a photo of this dish",
  ingredients: [
    { qty: 6, item: "large egg", plural: "large eggs" },
    { qty: 1, unit: "can", size: "28 oz", item: "crushed tomatoes" },
    { qty: 1, item: "bell pepper", plural: "bell peppers", note: "sliced" },
    { qty: 1, item: "yellow onion", plural: "yellow onions", note: "chopped" },
    { qty: 3, unit: "clove", item: "garlic", plural: "garlic cloves", note: "minced" },
    { qty: 2, unit: "tbsp", item: "olive oil" },
    { qty: 1, unit: "tsp", item: "ground cumin" },
    { qty: 1, unit: "tsp", item: "paprika" },
    { qty: 0.75, unit: "tsp", item: "salt" },
  ],
  steps: [
    "Heat the olive oil in a wide skillet over medium heat. Cook the onion and pepper until soft, about 6 minutes. Stir in the garlic, cumin, paprika, and salt for 30 seconds.",
    "Pour in the crushed tomatoes. Simmer for 8 to 10 minutes, until the sauce thickens slightly.",
    "Make six small wells in the sauce and crack an egg into each one. Cover and cook until the whites are set and the yolks are as done as you like, 5 to 8 minutes.",
    "Serve hot, with bread if you have it.",
  ],
  substitutions: [
    "Crushed tomatoes: use a 28-ounce can of diced tomatoes, simmered a few minutes longer to thicken.",
    "Bell pepper: use two, or add a handful of spinach at the end.",
    "Paprika: use smoked paprika, or a pinch of cayenne for heat.",
  ],
  tips: [
    "Keep the heat at a gentle simmer after the eggs go in so the bottoms do not scorch.",
    "If you prefer firmer yolks, uncover the skillet for the last couple of minutes.",
  ],
  pantryStaples: ["eggs", "canned tomatoes", "bell pepper"],
  related: ["leftover-vegetable-frittata", "breakfast-casserole", "baked-oatmeal"],
};
