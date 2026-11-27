import type { Recipe } from "./types";

export const buttermilkPancakes: Recipe = {
  slug: "buttermilk-pancakes",
  title: "Buttermilk Pancakes",
  seoTitle: "Fluffy Buttermilk Pancakes for Breakfast",
  metaSummary: "Fluffy buttermilk pancakes, about 25 minutes",
  intro:
    "These are fluffy buttermilk pancakes that take about 25 minutes. A simple batter of flour, buttermilk, eggs, and a little sugar cooks on a griddle until the tops bubble and the undersides are golden. Serve them with butter and maple syrup.",
  meal: "breakfast",
  tags: ["vegetarian"],
  servings: 4,
  prepMin: 10,
  cookMin: 15,
  datePublished: "2026-11-26",
  updated: "2026-11-26",
  image: "/recipes/buttermilk-pancakes.webp",
  imageAlt: "AI-generated illustration of a stack of buttermilk pancakes with butter and syrup, not a photo of this dish",
  ingredients: [
    { qty: 2, unit: "cup", item: "all-purpose flour" },
    { qty: 2, unit: "cup", item: "buttermilk" },
    { qty: 2, item: "large egg", plural: "large eggs" },
    { qty: 2, unit: "tbsp", item: "sugar" },
    { qty: 2, unit: "tsp", item: "baking powder" },
    { qty: 1, unit: "tsp", item: "baking soda" },
    { qty: 0.5, unit: "tsp", item: "salt" },
    { qty: 3, unit: "tbsp", item: "butter", note: "melted, plus more for the pan" },
  ],
  steps: [
    "Whisk the flour, sugar, baking powder, baking soda, and salt in a bowl. In another bowl, whisk the buttermilk, eggs, and melted butter.",
    "Pour the wet ingredients into the dry ones and stir just until combined. A few lumps are fine; do not overmix.",
    "Heat a griddle or skillet over medium heat and butter it lightly. Scoop about ¼ cup batter per pancake. Cook until bubbles form on the surface and the edges look set, 2 to 3 minutes, then flip and cook until golden, 1 to 2 minutes more.",
    "Serve warm with butter and maple syrup, or keep the finished pancakes on a plate in a 200°F (95°C) oven while you cook the rest.",
  ],
  substitutions: [
    "Buttermilk: use 2 cups milk mixed with 2 tablespoons lemon juice or white vinegar, and let it stand for 5 minutes.",
    "Butter: use a neutral oil in the batter, the same amount.",
    "All-purpose flour: use a 1-to-1 gluten-free baking blend if you need to.",
  ],
  tips: [
    "If the first pancake browns too fast, turn the heat down slightly before you continue.",
    "Leftover pancakes cool, then freeze well; reheat in a toaster or a 350°F (175°C) oven until hot.",
  ],
  pantryStaples: ["flour", "buttermilk", "eggs"],
  related: ["baked-oatmeal", "breakfast-casserole", "banana-bread"],
};
