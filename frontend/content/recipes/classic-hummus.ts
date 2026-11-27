import type { Recipe } from "./types";

export const classicHummus: Recipe = {
  slug: "classic-hummus",
  title: "Classic Hummus",
  seoTitle: "Classic Chickpea Hummus with Olive Oil",
  metaSummary: "Classic chickpea hummus, about 15 minutes",
  intro:
    "This is classic hummus that takes about 15 minutes. Canned chickpeas are blended with tahini, lemon, garlic, and olive oil until smooth. Serve it with pita or raw vegetables as a snack or a starter.",
  meal: "snack",
  tags: ["vegetarian", "vegan"],
  servings: 6,
  prepMin: 10,
  cookMin: 5,
  datePublished: "2026-11-26",
  updated: "2026-11-26",
  image: "/recipes/classic-hummus.webp",
  imageAlt: "AI-generated illustration of a bowl of hummus swirled with olive oil and paprika, pita on the side, not a photo of this dish",
  ingredients: [
    { qty: 1, unit: "can", size: "15 oz", item: "chickpeas", note: "drained and rinsed, liquid reserved" },
    { qty: 0.25, unit: "cup", item: "tahini" },
    { qty: 3, unit: "tbsp", item: "lemon juice" },
    { qty: 2, unit: "tbsp", item: "olive oil", note: "plus more for serving" },
    { qty: 1, unit: "clove", item: "garlic", plural: "garlic cloves", note: "minced" },
    { qty: 0.5, unit: "tsp", item: "salt" },
    { qty: 0.5, unit: "tsp", item: "ground cumin" },
    { qty: 0.25, unit: "tsp", item: "paprika", note: "for serving" },
  ],
  steps: [
    "Add the chickpeas, tahini, lemon juice, olive oil, garlic, salt, and cumin to a food processor or blender.",
    "Blend until smooth, adding reserved chickpea liquid 1 tablespoon at a time until the hummus is as creamy as you like, usually 2 to 4 tablespoons.",
    "Taste for salt and lemon. If the garlic tastes sharp, let the hummus sit for 10 minutes and taste again.",
    "Spoon into a bowl, swirl the top, and finish with a little olive oil and paprika. Serve with pita or vegetables.",
  ],
  substitutions: [
    "Tahini: use 3 tablespoons more olive oil plus 1 tablespoon peanut butter in a pinch; the flavor will be different but still creamy.",
    "Canned chickpeas: use 1½ cups cooked chickpeas.",
    "Lemon juice: use bottled lemon juice if that is what you have.",
  ],
  tips: [
    "A splash of the chickpea can liquid (aquafaba) is better than water for a silky texture.",
    "Hummus keeps in the fridge, covered, for about 4 days. Stir and add a little lemon or oil if it tightens up.",
  ],
  pantryStaples: ["chickpeas", "tahini", "lemon"],
  related: ["canned-chickpea-curry", "spinach-artichoke-dip", "chickpea-salad-sandwiches"],
};
