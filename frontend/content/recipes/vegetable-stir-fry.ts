import type { Recipe } from "./types";

export const vegetableStirFry: Recipe = {
  slug: "vegetable-stir-fry",
  title: "Vegetable Stir-Fry",
  seoTitle: "Easy Vegetable Stir-Fry for Weeknights",
  metaSummary: "Vegetable stir-fry in a skillet, about 25 minutes",
  intro:
    "This is a vegetable stir-fry that takes about 25 minutes. Broccoli, peppers, carrots, and snap peas cook quickly in a skillet with a simple soy-garlic sauce. Serve it over rice for a meatless weeknight dinner.",
  meal: "dinner",
  tags: ["vegetarian", "vegan"],
  servings: 4,
  prepMin: 15,
  cookMin: 10,
  datePublished: "2026-11-26",
  updated: "2026-11-26",
  image: "/recipes/vegetable-stir-fry.webp",
  imageAlt: "AI-generated illustration of a colorful vegetable stir-fry with broccoli, peppers, and carrots in a skillet, not a photo of this dish",
  ingredients: [
    { qty: 3, unit: "cup", item: "broccoli florets" },
    { qty: 2, item: "bell pepper", plural: "bell peppers", note: "sliced" },
    { qty: 2, item: "carrot", plural: "carrots", note: "sliced on a bias" },
    { qty: 1, unit: "cup", item: "snap peas" },
    { qty: 3, unit: "tbsp", item: "soy sauce" },
    { qty: 2, unit: "clove", item: "garlic", plural: "garlic cloves", note: "minced" },
    { qty: 1, unit: "tbsp", item: "vegetable oil" },
    { qty: 1, unit: "tsp", item: "sugar" },
    { qty: 0.25, unit: "cup", item: "water" },
  ],
  steps: [
    "Stir the soy sauce, water, sugar, and garlic together in a small bowl.",
    "Heat the oil in a large skillet or wok over high heat. Add the carrots and broccoli and stir-fry for 3 minutes. Add the peppers and snap peas and cook 2 to 3 minutes more, until the vegetables are crisp-tender.",
    "Pour in the sauce and toss until it coats the vegetables and thickens slightly, about 1 minute.",
    "Serve hot over rice, if you like.",
  ],
  substitutions: [
    "Snap peas: use snow peas or a handful of sliced cabbage.",
    "Soy sauce: use tamari if you need the stir-fry to be gluten-free.",
    "Broccoli: use a 12-ounce bag of frozen mixed stir-fry vegetables, added straight to the hot skillet; cook until hot and crisp-tender.",
    "Sugar: use a teaspoon of honey if you do not need the recipe to stay vegan.",
  ],
  tips: [
    "Have every vegetable cut and the sauce mixed before you turn on the heat; stir-frying goes quickly.",
    "If the pan looks dry, add a spoonful of water rather than more oil so the vegetables steam and stay bright.",
  ],
  pantryStaples: ["broccoli", "soy sauce", "bell peppers"],
  related: ["leftover-rice-fried-rice", "peanut-butter-noodles", "canned-chickpea-curry"],
};
