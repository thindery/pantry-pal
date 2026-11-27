import type { Recipe } from "./types";

export const slowCookerPulledPork: Recipe = {
  slug: "slow-cooker-pulled-pork",
  title: "Slow-Cooker Pulled Pork",
  seoTitle: "Slow-Cooker Pulled Pork Ready in 4 Hours",
  metaSummary: "Pulled pork in a slow cooker, 4 hours on high",
  intro:
    "This is slow-cooker pulled pork that takes about 4 hours on the high setting. A pork shoulder cooks with spices, onion, and a little broth until it shreds easily, then you toss it with barbecue sauce. Pile it on buns or serve it with cornbread.",
  meal: "dinner",
  tags: ["slow-cooker", "one-pot"],
  servings: 8,
  prepMin: 20,
  cookMin: 210,
  datePublished: "2026-11-26",
  updated: "2026-11-26",
  image: "/recipes/slow-cooker-pulled-pork.webp",
  imageAlt: "AI-generated illustration of shredded barbecue pulled pork on a bun, not a photo of this dish",
  ingredients: [
    { qty: 3, unit: "lb", item: "pork shoulder", note: "boneless, cut into large chunks" },
    { qty: 1, item: "yellow onion", plural: "yellow onions", note: "sliced" },
    { qty: 0.5, unit: "cup", item: "chicken broth" },
    { qty: 2, unit: "tsp", item: "brown sugar" },
    { qty: 2, unit: "tsp", item: "paprika" },
    { qty: 1, unit: "tsp", item: "garlic powder" },
    { qty: 1, unit: "tsp", item: "salt" },
    { qty: 0.5, unit: "tsp", item: "black pepper" },
    { qty: 1, unit: "cup", item: "barbecue sauce" },
  ],
  steps: [
    "Stir the brown sugar, paprika, garlic powder, salt, and black pepper together. Rub the mixture all over the pork.",
    "Place the onion in the bottom of a slow cooker. Set the pork on top and pour the broth around it.",
    "Cook on high until the pork shreds easily with two forks, about 3½ to 4 hours.",
    "Transfer the pork to a board, shred it, and discard large pieces of fat. Stir in the barbecue sauce, loosening with a spoonful of the cooking liquid if you want. Serve on buns or with a side.",
  ],
  substitutions: [
    "Pork shoulder: use pork butt; keep the pieces large so they stay moist.",
    "Barbecue sauce: use 1 cup of your usual sauce, or a mix of ketchup, a little vinegar, and brown sugar.",
    "Chicken broth: use water or apple juice.",
  ],
  tips: [
    "This recipe is written for the high setting so the total time stays at about 4 hours. The low setting takes 7 to 8 hours, which is longer than the time listed here.",
    "Leftover pulled pork keeps in the fridge for about 3 days; reheat it until steaming hot, with a splash of sauce or broth if it looks dry.",
  ],
  pantryStaples: ["pork shoulder", "barbecue sauce", "onion"],
  related: ["brown-sugar-glazed-ham", "herb-roasted-pork-loin", "sunday-pot-roast"],
};
