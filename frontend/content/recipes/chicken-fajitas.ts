import type { Recipe } from "./types";

export const chickenFajitas: Recipe = {
  slug: "chicken-fajitas",
  title: "Chicken Fajitas",
  seoTitle: "Weeknight Chicken Fajitas with Peppers",
  metaSummary: "Chicken fajitas with peppers, about 30 minutes",
  intro:
    "These are chicken fajitas that take about 30 minutes. Strips of chicken sear with bell peppers and onion in a skillet, then you pile them into warm tortillas. Lime and a little chili powder keep the flavor bright.",
  meal: "dinner",
  tags: [],
  servings: 4,
  prepMin: 15,
  cookMin: 15,
  datePublished: "2026-11-26",
  updated: "2026-11-26",
  image: "/recipes/chicken-fajitas.webp",
  imageAlt: "AI-generated illustration of chicken fajitas with peppers and onions on a platter, tortillas on the side, not a photo of this dish",
  ingredients: [
    { qty: 1.5, unit: "lb", item: "boneless chicken breast", note: "cut into strips" },
    { qty: 3, item: "bell pepper", plural: "bell peppers", note: "mixed colors, sliced" },
    { qty: 1, item: "yellow onion", plural: "yellow onions", note: "sliced" },
    { qty: 8, item: "flour tortilla", plural: "flour tortillas", note: "fajita or taco size" },
    { qty: 2, unit: "tbsp", item: "olive oil" },
    { qty: 1, unit: "tsp", item: "chili powder" },
    { qty: 1, unit: "tsp", item: "ground cumin" },
    { qty: 0.75, unit: "tsp", item: "salt" },
    { qty: 1, item: "lime", plural: "limes", note: "cut into wedges" },
  ],
  steps: [
    "Toss the chicken with 1 tablespoon of the oil, the chili powder, cumin, and salt.",
    "Heat a large skillet over medium-high heat. Cook the chicken, stirring, until browned and cooked through, 6 to 8 minutes. Transfer to a plate.",
    "Add the remaining 1 tablespoon oil to the skillet. Cook the peppers and onion, stirring, until they are tender and a little charred at the edges, about 6 minutes. Return the chicken and toss to combine.",
    "Warm the tortillas. Serve the fajita filling with lime wedges.",
  ],
  substitutions: [
    "Chicken breast: use boneless chicken thighs, or leftover cooked chicken warmed in the skillet at the end.",
    "Flour tortillas: use corn tortillas, warmed so they are pliable.",
    "Chili powder: use ½ teaspoon paprika plus a pinch of cayenne.",
  ],
  tips: [
    "A very hot skillet gives the peppers a little char without going soft and watery.",
    "Warm tortillas in a dry skillet or wrapped in a damp towel in the microwave so they do not crack.",
  ],
  pantryStaples: ["chicken", "bell peppers", "tortillas"],
  related: ["black-bean-tacos", "chicken-enchiladas", "freezer-breakfast-burritos"],
};
