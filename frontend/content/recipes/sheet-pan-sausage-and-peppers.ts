import type { Recipe } from "./types";

export const sheetPanSausageAndPeppers: Recipe = {
  slug: "sheet-pan-sausage-and-peppers",
  title: "Sheet-Pan Sausage and Peppers",
  seoTitle: "Sheet-Pan Sausage and Peppers for Dinner",
  metaSummary: "Sheet-pan sausage and peppers, 40 minutes",
  intro:
    "These are sheet-pan sausage and peppers that take about 40 minutes. Italian sausage roasts with strips of bell peppers and onion on one pan until the sausage is browned and the peppers are soft. Serve them in rolls or over rice for an easy weeknight dinner.",
  meal: "dinner",
  tags: ["sheet-pan"],
  servings: 4,
  prepMin: 15,
  cookMin: 25,
  datePublished: "2026-11-26",
  updated: "2026-11-26",
  image: "/recipes/sheet-pan-sausage-and-peppers.webp",
  imageAlt: "AI-generated illustration of roasted Italian sausage with red and yellow peppers and onions on a sheet pan, not a photo of this dish",
  ingredients: [
    { qty: 1.5, unit: "lb", item: "Italian sausage links" },
    { qty: 3, item: "bell pepper", plural: "bell peppers", note: "red and yellow, sliced" },
    { qty: 1, item: "yellow onion", plural: "yellow onions", note: "sliced" },
    { qty: 2, unit: "tbsp", item: "olive oil" },
    { qty: 1, unit: "tsp", item: "dried oregano" },
    { qty: 0.5, unit: "tsp", item: "salt" },
    { qty: 0.25, unit: "tsp", item: "black pepper" },
  ],
  steps: [
    "Heat the oven to 425°F (220°C). Line a rimmed sheet pan with foil for easier cleanup, if you like.",
    "Toss the peppers and onion with the olive oil, oregano, salt, and black pepper. Spread them on the pan and nestle the sausage links on top.",
    "Roast for 20 to 25 minutes, turning the sausages once, until they are browned and cooked through and the peppers are tender.",
    "Rest for a few minutes, then slice the sausages if you want, and serve with the peppers and onions.",
  ],
  substitutions: [
    "Italian sausage: use chicken or turkey sausage; add a few extra minutes if the links are thick.",
    "Bell peppers: use any color you have, or a mix of peppers and sliced zucchini.",
    "Dried oregano: use Italian seasoning or 1 teaspoon dried basil.",
  ],
  tips: [
    "If the sausages are very thick, prick them once or twice so they cook through without bursting.",
    "Leftover sausage and peppers keep in the fridge for about 3 days; reheat until steaming hot.",
  ],
  pantryStaples: ["Italian sausage", "bell peppers", "onion"],
  related: ["sheet-pan-chicken-and-vegetables", "pigs-in-a-blanket", "rosemary-roast-chicken"],
};
