import type { Recipe } from "./types";

export const airFryerChickenThighs: Recipe = {
  slug: "air-fryer-chicken-thighs",
  title: "Air-Fryer Chicken Thighs",
  seoTitle: "Crispy Air-Fryer Chicken Thighs for Dinner",
  metaSummary: "Air-fryer chicken thighs, about 30 minutes",
  intro:
    "These are air-fryer chicken thighs that take about 30 minutes. Bone-in, skin-on thighs are seasoned and cooked until the skin is crisp and the meat is cooked through. They are a weeknight dinner with almost no cleanup.",
  meal: "dinner",
  tags: ["air-fryer"],
  servings: 4,
  prepMin: 10,
  cookMin: 22,
  datePublished: "2026-11-26",
  updated: "2026-11-26",
  image: "/recipes/air-fryer-chicken-thighs.webp",
  imageAlt: "AI-generated illustration of crispy seasoned chicken thighs on a platter with lemon wedges, not a photo of this dish",
  ingredients: [
    { qty: 2, unit: "lb", item: "bone-in chicken thighs", note: "skin-on, about 4 to 5 thighs" },
    { qty: 1, unit: "tbsp", item: "olive oil" },
    { qty: 1, unit: "tsp", item: "paprika" },
    { qty: 1, unit: "tsp", item: "garlic powder" },
    { qty: 0.75, unit: "tsp", item: "salt" },
    { qty: 0.5, unit: "tsp", item: "black pepper" },
  ],
  steps: [
    "Pat the thighs dry. Toss them with the olive oil, paprika, garlic powder, salt, and black pepper.",
    "Heat the air fryer to 400°F (200°C). Arrange the thighs skin side up in a single layer, leaving a little space between them. Cook in batches if your basket is small.",
    "Air-fry for 18 to 22 minutes, until the skin is browned and crisp and the thickest part of the meat reaches 165°F (74°C) on a thermometer.",
    "Rest for 5 minutes, then serve. A lemon wedge on the side is optional.",
  ],
  substitutions: [
    "Bone-in thighs: use boneless skin-on thighs and start checking at 14 minutes.",
    "Paprika: use smoked paprika or ½ teaspoon chili powder for a little heat.",
    "Olive oil: use another neutral oil.",
  ],
  tips: [
    "Drying the skin well is what helps it crisp in the air fryer.",
    "Do not crowd the basket; overlapping thighs steam instead of browning.",
  ],
  pantryStaples: ["chicken thighs", "paprika", "garlic powder"],
  related: ["rosemary-roast-chicken", "sunday-chicken-and-rice", "sheet-pan-chicken-and-vegetables"],
};
