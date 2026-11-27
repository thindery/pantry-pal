import type { Recipe } from "./types";

export const greekLemonChicken: Recipe = {
  slug: "greek-lemon-chicken",
  title: "Greek Lemon Chicken",
  seoTitle: "Greek Lemon Chicken with Potatoes and Oregano",
  metaSummary: "Greek lemon chicken with potatoes, about 55 minutes",
  intro:
    "This is Greek lemon chicken that takes about 55 minutes. Chicken thighs roast with potatoes, lemon, garlic, and oregano until the skin is browned and the potatoes are tender. It is a sheet-pan dinner with bright, simple flavors.",
  meal: "dinner",
  tags: ["sheet-pan"],
  servings: 4,
  prepMin: 15,
  cookMin: 40,
  datePublished: "2026-11-26",
  updated: "2026-11-26",
  image: "/recipes/greek-lemon-chicken.webp",
  imageAlt: "AI-generated illustration of roasted lemon chicken thighs with potato wedges and lemon, not a photo of this dish",
  ingredients: [
    { qty: 2.5, unit: "lb", item: "bone-in chicken thighs", note: "skin-on, about 5 thighs" },
    { qty: 1.5, unit: "lb", item: "Yukon Gold potatoes", note: "cut into wedges" },
    { qty: 1, item: "lemon", plural: "lemons", note: "sliced, plus extra wedges for serving" },
    { qty: 4, unit: "clove", item: "garlic", plural: "garlic cloves", note: "smashed" },
    { qty: 3, unit: "tbsp", item: "olive oil" },
    { qty: 2, unit: "tsp", item: "dried oregano" },
    { qty: 1, unit: "tsp", item: "salt" },
    { qty: 0.5, unit: "tsp", item: "black pepper" },
  ],
  steps: [
    "Heat the oven to 425°F (220°C). Toss the potatoes with 2 tablespoons of the oil, 1 teaspoon of the oregano, ½ teaspoon of the salt, and ¼ teaspoon of the pepper. Spread them on a rimmed sheet pan.",
    "Pat the thighs dry. Rub with the remaining 1 tablespoon oil, 1 teaspoon oregano, ½ teaspoon salt, and ¼ teaspoon pepper. Nestle the chicken, garlic, and lemon slices among the potatoes.",
    "Roast for 35 to 40 minutes, until the chicken skin is browned, the thickest part of the meat reaches 165°F (74°C), and the potatoes are tender.",
    "Rest 5 minutes, then serve with extra lemon wedges.",
  ],
  substitutions: [
    "Chicken thighs: use bone-in chicken drumsticks, and keep the same temperature check.",
    "Dried oregano: use 1 tablespoon chopped fresh oregano, added in the last 10 minutes, or Italian seasoning.",
    "Yukon Gold: use russet potatoes, cut into similar wedges.",
  ],
  tips: [
    "If the potatoes need more time after the chicken is done, transfer the chicken to a plate and roast the potatoes 5 minutes more.",
    "Leftovers keep in the fridge for about 3 days; reheat until steaming hot.",
  ],
  pantryStaples: ["chicken thighs", "potatoes", "lemon"],
  related: ["air-fryer-chicken-thighs", "rosemary-roast-chicken", "sheet-pan-lemon-salmon"],
};
