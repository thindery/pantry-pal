import type { Recipe } from "./types";

export const garlicMashedPotatoes: Recipe = {
  slug: "garlic-mashed-potatoes",
  title: "Garlic Mashed Potatoes",
  seoTitle: "Creamy Garlic Mashed Potatoes Side Dish",
  metaSummary: "Creamy garlic mashed potatoes, about 35 minutes",
  intro:
    "These are creamy garlic mashed potatoes that take about 35 minutes. Potatoes simmer until tender, then you mash them with butter, milk, and cooked garlic. They are a side for roast chicken, pot roast, or a weeknight sausage dinner.",
  meal: "dinner",
  tags: ["vegetarian"],
  servings: 6,
  prepMin: 15,
  cookMin: 20,
  datePublished: "2026-11-26",
  updated: "2026-11-26",
  image: "/recipes/garlic-mashed-potatoes.webp",
  imageAlt: "AI-generated illustration of a bowl of creamy garlic mashed potatoes with butter and chives, not a photo of this dish",
  ingredients: [
    { qty: 3, unit: "lb", item: "Yukon Gold potatoes", note: "peeled and cut into chunks" },
    { qty: 4, unit: "clove", item: "garlic", plural: "garlic cloves", note: "peeled" },
    { qty: 4, unit: "tbsp", item: "butter" },
    { qty: 0.75, unit: "cup", item: "whole milk", note: "warmed" },
    { qty: 1, unit: "tsp", item: "salt", note: "plus more for the cooking water" },
    { qty: 0.25, unit: "tsp", item: "black pepper" },
  ],
  steps: [
    "Put the potatoes and garlic in a pot, cover with cold water, and add a generous pinch of salt. Bring to a boil, then simmer until the potatoes are very tender, 15 to 18 minutes.",
    "Drain well. Return the potatoes and garlic to the hot pot for a minute to steam off extra moisture.",
    "Mash with the butter, then beat in the warm milk until the potatoes are as creamy as you like. Season with the 1 teaspoon salt and the pepper.",
    "Serve hot, with a little extra butter on top if you want.",
  ],
  substitutions: [
    "Yukon Gold: use russet potatoes; they mash a little fluffier and may want a splash more milk.",
    "Whole milk: use half-and-half for a richer mash, or a plain unsweetened milk alternative.",
    "Butter: use olive oil, 3 tablespoons, if you need a dairy-free version and skip or swap the milk.",
  ],
  tips: [
    "Warm the milk so the potatoes stay hot and the butter melts evenly.",
    "Do not use a blender; it makes mashed potatoes gluey. A masher or ricer is enough.",
  ],
  pantryStaples: ["potatoes", "garlic", "butter", "milk"],
  related: ["shepherds-pie", "sunday-pot-roast", "classic-stuffing"],
};
