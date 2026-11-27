import type { Recipe } from "./types";

export const slowCookerChickenTacos: Recipe = {
  slug: "slow-cooker-chicken-tacos",
  title: "Slow-Cooker Chicken Tacos",
  seoTitle: "Slow-Cooker Chicken Tacos Ready in 4 Hours",
  metaSummary: "Slow-cooker chicken tacos, 4 hours on high",
  intro:
    "These are slow-cooker chicken tacos that take about 4 hours on the high setting. Chicken cooks with salsa, peppers, and spices until it shreds, then you pile it into warm tortillas with lime. It is a hands-off dinner you can start in the afternoon.",
  meal: "dinner",
  tags: ["slow-cooker", "one-pot"],
  servings: 6,
  prepMin: 15,
  cookMin: 210,
  datePublished: "2026-11-26",
  updated: "2026-11-26",
  image: "/recipes/slow-cooker-chicken-tacos.webp",
  imageAlt: "AI-generated illustration of shredded chicken tacos with peppers and lime, not a photo of this dish",
  ingredients: [
    { qty: 2, unit: "lb", item: "boneless chicken thighs" },
    { qty: 1, unit: "cup", item: "salsa" },
    { qty: 2, item: "bell pepper", plural: "bell peppers", note: "sliced" },
    { qty: 1, item: "yellow onion", plural: "yellow onions", note: "sliced" },
    { qty: 12, item: "flour tortilla", plural: "flour tortillas", note: "taco size" },
    { qty: 1, unit: "tsp", item: "chili powder" },
    { qty: 1, unit: "tsp", item: "ground cumin" },
    { qty: 0.75, unit: "tsp", item: "salt" },
    { qty: 1, item: "lime", plural: "limes", note: "cut into wedges" },
  ],
  steps: [
    "Put the onion and peppers in a slow cooker. Add the chicken, chili powder, cumin, and salt, then pour the salsa over the top.",
    "Cook on high until the chicken shreds easily, about 3½ to 4 hours.",
    "Shred the chicken in the cooker and toss it with the peppers, onion, and juices.",
    "Warm the tortillas and serve the chicken with lime wedges.",
  ],
  substitutions: [
    "Chicken thighs: use boneless chicken breasts, and start checking 30 minutes earlier so they do not dry out.",
    "Flour tortillas: use corn tortillas, warmed so they are pliable.",
    "Salsa: use a 16-ounce jar of your usual salsa, or canned diced tomatoes plus a pinch of chili powder.",
  ],
  tips: [
    "This version is written for the high setting so the total time stays at about 4 hours. The low setting takes 6 to 7 hours, which is longer than the time listed here.",
    "Leftover filling keeps in the fridge for about 3 days; reheat it until steaming hot.",
  ],
  pantryStaples: ["chicken", "salsa", "tortillas"],
  related: ["chicken-fajitas", "chicken-enchiladas", "black-bean-tacos"],
};
