import type { Recipe } from "./types";

export const honeyGarlicShrimp: Recipe = {
  slug: "honey-garlic-shrimp",
  title: "Honey Garlic Shrimp",
  seoTitle: "Honey Garlic Shrimp in a Skillet, 20 Minutes",
  metaSummary: "Honey garlic shrimp in a skillet, about 20 minutes",
  intro:
    "This is honey garlic shrimp that takes about 20 minutes. Shrimp cook quickly in a skillet, then a honey, garlic, and soy sauce glaze coats them. Serve the shrimp over rice for a fast weeknight dinner.",
  meal: "dinner",
  tags: ["quick"],
  servings: 4,
  prepMin: 10,
  cookMin: 10,
  datePublished: "2026-11-26",
  updated: "2026-11-26",
  image: "/recipes/honey-garlic-shrimp.webp",
  imageAlt: "AI-generated illustration of honey garlic shrimp in a skillet over rice, not a photo of this dish",
  ingredients: [
    { qty: 1.5, unit: "lb", item: "large shrimp", note: "peeled and deveined" },
    { qty: 3, unit: "tbsp", item: "honey" },
    { qty: 3, unit: "tbsp", item: "soy sauce" },
    { qty: 4, unit: "clove", item: "garlic", plural: "garlic cloves", note: "minced" },
    { qty: 1, unit: "tbsp", item: "olive oil" },
    { qty: 1, unit: "tbsp", item: "lemon juice" },
    { qty: 0.25, unit: "tsp", item: "black pepper" },
    { qty: 3, unit: "cup", item: "cooked rice", note: "for serving" },
  ],
  steps: [
    "Pat the shrimp dry and season with the pepper. Stir the honey, soy sauce, garlic, and lemon juice together in a small bowl.",
    "Heat the oil in a large skillet over medium-high heat. Add the shrimp in a single layer and cook until they just turn pink, about 1 to 2 minutes per side. Transfer to a plate.",
    "Pour the sauce into the same skillet and simmer for 1 to 2 minutes, until it thickens slightly. Return the shrimp and toss to coat, about 30 seconds more. Do not overcook.",
    "Serve over the rice.",
  ],
  substitutions: [
    "Large shrimp: use a 1½-pound bag of frozen shrimp, thawed and patted dry.",
    "Honey: use 3 tablespoons brown sugar dissolved in the soy sauce.",
    "Soy sauce: use tamari if you need the dish to be gluten-free.",
    "Cooked rice: use leftover rice, or serve the shrimp on their own.",
  ],
  tips: [
    "Shrimp cook in minutes; pull them as soon as they are opaque and curled so they stay tender.",
    "Have the rice ready before you start the skillet, because the glaze comes together fast.",
  ],
  pantryStaples: ["shrimp", "honey", "soy sauce", "garlic"],
  related: ["sheet-pan-lemon-salmon", "vegetable-stir-fry", "leftover-rice-fried-rice"],
};
