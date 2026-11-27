import type { Recipe } from "./types";

export const chickenEnchiladas: Recipe = {
  slug: "chicken-enchiladas",
  title: "Chicken Enchiladas",
  seoTitle: "Easy Baked Chicken Enchiladas with Red Sauce",
  metaSummary: "Baked chicken enchiladas, about 45 minutes",
  intro:
    "These are baked chicken enchiladas that take about 45 minutes. Flour or corn tortillas are filled with shredded chicken and cheese, rolled, and baked under red enchilada sauce until the cheese melts. They are a weeknight dinner you can assemble ahead and bake just before you eat.",
  meal: "dinner",
  tags: [],
  servings: 6,
  prepMin: 20,
  cookMin: 25,
  datePublished: "2026-11-26",
  updated: "2026-11-26",
  image: "/recipes/chicken-enchiladas.webp",
  imageAlt: "AI-generated illustration of baked chicken enchiladas in a dish, not a photo of this dish",
  ingredients: [
    { qty: 2, unit: "cup", item: "cooked shredded chicken" },
    { qty: 8, item: "flour tortilla", plural: "flour tortillas", note: "8-inch" },
    { qty: 2, unit: "cup", item: "shredded Monterey Jack", note: "or Mexican blend" },
    { qty: 2, unit: "cup", item: "red enchilada sauce" },
    { qty: 0.5, unit: "cup", item: "sour cream" },
    { qty: 0.5, unit: "tsp", item: "ground cumin" },
    { qty: 0.25, unit: "tsp", item: "salt" },
  ],
  steps: [
    "Heat the oven to 375°F (190°C). Grease a 9×13-inch baking dish and spread ½ cup of the enchilada sauce in the bottom.",
    "In a bowl, mix the chicken, 1 cup of the cheese, the sour cream, cumin, and salt.",
    "Warm the tortillas so they are pliable. Spoon the filling down the center of each tortilla, roll them up, and set them seam side down in the dish.",
    "Pour the remaining sauce over the enchiladas and sprinkle on the remaining 1 cup cheese.",
    "Bake for 20 to 25 minutes, until the sauce is bubbling and the cheese is melted. Rest for 5 minutes, then serve.",
  ],
  substitutions: [
    "Flour tortillas: use 8 corn tortillas, warmed so they do not crack when you roll them.",
    "Red enchilada sauce: use a 15-ounce can, or 2 cups salsa thinned with a little broth; the flavor will be brighter.",
    "Cooked chicken: use leftover turkey, or a can of black beans, rinsed, for a vegetarian filling.",
    "Monterey Jack: use cheddar or a Mexican blend.",
  ],
  tips: [
    "Warming the tortillas in a dry skillet or wrapped in a damp towel in the microwave keeps them from tearing.",
    "You can fill and roll the enchiladas a few hours ahead, cover, and refrigerate; add a few minutes to the bake if they go in cold.",
  ],
  pantryStaples: ["cooked chicken", "tortillas", "enchilada sauce", "cheese"],
  related: ["black-bean-tacos", "easy-lasagna", "leftover-turkey-sandwiches"],
};
