import type { Recipe } from "./types";

export const stuffedMushrooms: Recipe = {
  slug: "stuffed-mushrooms",
  title: "Stuffed Mushrooms",
  seoTitle: "Easy Stuffed Mushrooms for a Holiday Party",
  metaSummary: "Baked stuffed mushrooms, about 40 minutes",
  intro:
    "These are baked stuffed mushrooms that take about 40 minutes. Button mushroom caps are filled with a mix of the chopped stems, cream cheese, breadcrumbs, garlic, and Parmesan, then baked until the tops brown. They are a vegetarian party appetizer you can assemble ahead and bake just before guests arrive.",
  meal: "snack",
  tags: ["holiday", "vegetarian"],
  servings: 8,
  prepMin: 20,
  cookMin: 20,
  datePublished: "2026-11-26",
  updated: "2026-11-26",
  image: "/recipes/stuffed-mushrooms.webp",
  imageAlt: "AI-generated illustration of baked stuffed mushrooms on a platter, not a photo of this dish",
  ingredients: [
    { qty: 24, item: "white button mushroom", plural: "white button mushrooms" },
    { qty: 4, unit: "oz", item: "cream cheese", note: "softened" },
    { qty: 0.5, unit: "cup", item: "plain breadcrumbs" },
    { qty: 0.25, unit: "cup", item: "grated Parmesan" },
    { qty: 2, unit: "clove", item: "garlic", plural: "garlic cloves", note: "minced" },
    { qty: 2, unit: "tbsp", item: "olive oil" },
    { qty: 0.25, unit: "tsp", item: "salt" },
    { qty: 0.25, unit: "tsp", item: "black pepper" },
  ],
  steps: [
    "Heat the oven to 400°F (200°C). Wipe the mushrooms clean, pop out the stems, and chop the stems finely. Brush the caps with 1 tablespoon of the oil and set them cavity side up on a baking sheet.",
    "In a skillet over medium heat, cook the chopped stems in the remaining 1 tablespoon oil for 4 to 5 minutes, until the liquid cooks off. Stir in the garlic for 30 seconds, then take the pan off the heat.",
    "Stir in the cream cheese, breadcrumbs, Parmesan, salt, and pepper. Spoon the filling into the caps, mounding it slightly.",
    "Bake for 15 to 18 minutes, until the mushrooms are tender and the tops are browned in spots.",
    "Rest for 5 minutes, then transfer to a platter and serve warm.",
  ],
  substitutions: [
    "White button mushrooms: use cremini mushrooms of similar size.",
    "Cream cheese: use ½ cup ricotta, drained if it is very wet.",
    "Plain breadcrumbs: use panko, or crushed crackers in the same amount.",
    "Parmesan: use grated pecorino, or an extra 2 tablespoons breadcrumbs plus a pinch of salt.",
  ],
  tips: [
    "If the caps hold a lot of water, bake them empty for 5 minutes, drain the sheet, then fill and finish baking.",
    "You can fill the caps a few hours ahead and refrigerate; bake just before serving.",
  ],
  pantryStaples: ["mushrooms", "cream cheese", "breadcrumbs", "Parmesan"],
  related: ["spinach-artichoke-dip", "sausage-cheese-balls", "pigs-in-a-blanket"],
};
