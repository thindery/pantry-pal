import type { Recipe } from "./types";

export const noBakeEnergyBites: Recipe = {
  slug: "no-bake-energy-bites",
  title: "No-Bake Energy Bites",
  seoTitle: "No-Bake Oat and Peanut Butter Energy Bites",
  metaSummary: "No-bake oat peanut butter energy bites, about 20 minutes",
  intro:
    "These are no-bake energy bites that take about 20 minutes, plus a short chill. Oats, peanut butter, and a little honey mix into small balls you can keep in the fridge. They are a snack, not a dessert, and they travel well.",
  meal: "snack",
  tags: ["vegetarian", "make-ahead"],
  servings: 12,
  prepMin: 15,
  cookMin: 15,
  datePublished: "2026-11-26",
  updated: "2026-11-26",
  image: "/recipes/no-bake-energy-bites.webp",
  imageAlt: "AI-generated illustration of no-bake oatmeal peanut-butter energy bites on a plate, not a photo of this dish",
  ingredients: [
    { qty: 1.5, unit: "cup", item: "old-fashioned oats" },
    { qty: 0.75, unit: "cup", item: "peanut butter" },
    { qty: 0.33, unit: "cup", item: "honey" },
    { qty: 0.25, unit: "cup", item: "mini chocolate chips", note: "optional" },
    { qty: 2, unit: "tbsp", item: "ground flaxseed", note: "or chia seeds" },
    { qty: 1, unit: "tsp", item: "vanilla extract" },
    { qty: 0.25, unit: "tsp", item: "salt" },
  ],
  steps: [
    "Stir the oats, peanut butter, honey, flaxseed, vanilla, salt, and chocolate chips, if using, in a bowl until a thick dough forms.",
    "If the mixture is too sticky to roll, chill it for 10 to 15 minutes.",
    "Roll into about 20 one-inch balls and set them on a plate.",
    "Chill for at least 15 minutes so they firm up, then eat or store in the fridge.",
  ],
  substitutions: [
    "Peanut butter: use almond butter or sunflower seed butter.",
    "Honey: use maple syrup; the bites will be a little softer.",
    "Mini chocolate chips: leave them out, or use chopped raisins.",
  ],
  tips: [
    "Wet your hands lightly if the dough sticks while you roll.",
    "The bites keep in the fridge, covered, for about a week, or in the freezer for a month; thaw for a few minutes before eating.",
  ],
  pantryStaples: ["oats", "peanut butter", "honey"],
  related: ["oatmeal-cookies", "baked-oatmeal", "peanut-butter-noodles"],
};
