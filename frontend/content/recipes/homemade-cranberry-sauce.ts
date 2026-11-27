import type { Recipe } from "./types";

export const homemadeCranberrySauce: Recipe = {
  slug: "homemade-cranberry-sauce",
  title: "Homemade Cranberry Sauce",
  seoTitle: "Homemade Cranberry Sauce in 20 Minutes",
  metaSummary: "Homemade cranberry sauce, 20 minutes",
  intro:
    "This is a stovetop cranberry sauce that takes about 20 minutes and uses a bag of fresh or frozen cranberries, sugar, and water. A strip of orange zest and a pinch of salt keep it from tasting flat. It thickens as it cools, so pull it off the heat while it is still a little loose.",
  meal: "dinner",
  tags: ["holiday", "make-ahead"],
  servings: 8,
  prepMin: 5,
  cookMin: 15,
  datePublished: "2026-11-26",
  updated: "2026-11-26",
  image: "/recipes/homemade-cranberry-sauce.webp",
  imageAlt: "AI-generated illustration of a bowl of homemade cranberry sauce, not a photo of this dish",
  ingredients: [
    { qty: 12, unit: "oz", item: "fresh or frozen cranberries" },
    { qty: 0.75, unit: "cup", item: "granulated sugar" },
    { qty: 0.75, unit: "cup", item: "water" },
    { qty: 1, unit: "tsp", item: "orange zest", note: "optional, or a 2-inch strip of peel" },
    { qty: 1, unit: "pinch", item: "salt" },
    { qty: 0.25, unit: "tsp", item: "ground cinnamon", note: "optional" },
  ],
  steps: [
    "Rinse the cranberries and pick out any that are soft or shriveled. Frozen berries can go in without thawing.",
    "Combine the cranberries, sugar, water, orange zest, salt, and cinnamon in a medium saucepan.",
    "Bring the mixture to a simmer over medium heat, stirring until the sugar dissolves. Cook, stirring now and then, until most of the berries have burst and the sauce looks syrupy, about 10 to 12 minutes.",
    "Taste and add a little more sugar if it is too tart for you. Remove the strip of peel if you used one.",
    "Cool the sauce to room temperature. It will thicken as it sits. Refrigerate until you serve it.",
  ],
  substitutions: [
    "Granulated sugar: use honey or maple syrup, starting with 1/2 cup and adding more to taste; the sauce may stay a little looser.",
    "Orange zest: use a splash of orange juice in place of some of the water, or skip the citrus.",
    "Cinnamon: use a pinch of allspice, ginger, or skip the spice.",
    "Fresh cranberries: frozen cranberries work the same way and do not need to be thawed first.",
    "Water: use orange juice or a mix of water and apple juice.",
  ],
  tips: [
    "The sauce keeps in the fridge for about a week, so you can make it a day or two before the meal.",
    "If it sets up thicker than you like once it is cold, stir in a spoonful of water or orange juice before serving.",
  ],
  pantryStaples: ["cranberries", "sugar", "orange zest", "cinnamon"],
  related: ["classic-stuffing", "leftover-turkey-sandwiches", "pumpkin-pie"],
};
