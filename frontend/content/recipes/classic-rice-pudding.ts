import type { Recipe } from "./types";

export const classicRicePudding: Recipe = {
  slug: "classic-rice-pudding",
  title: "Classic Rice Pudding",
  seoTitle: "Classic Stovetop Rice Pudding from the Pantry",
  metaSummary: "Stovetop rice pudding, about 45 minutes",
  intro:
    "This is a classic stovetop rice pudding that takes about 45 minutes, mostly hands-off at a gentle simmer. White rice cooks slowly in milk with sugar and vanilla until it is creamy and the grains are tender. Serve it warm or chilled, with a little cinnamon on top.",
  meal: "snack",
  tags: ["vegetarian"],
  servings: 6,
  prepMin: 5,
  cookMin: 40,
  datePublished: "2026-11-26",
  updated: "2026-11-26",
  image: "/recipes/classic-rice-pudding.webp",
  imageAlt: "AI-generated illustration of a bowl of creamy rice pudding with cinnamon, not a photo of this dish",
  ingredients: [
    { qty: 0.5, unit: "cup", item: "uncooked long-grain white rice" },
    { qty: 4, unit: "cup", item: "milk" },
    { qty: 1 / 3, unit: "cup", item: "granulated sugar" },
    { qty: 0.25, unit: "tsp", item: "salt" },
    { qty: 1, unit: "tsp", item: "vanilla extract" },
    { qty: 0.5, unit: "tsp", item: "ground cinnamon", note: "plus more for serving" },
  ],
  steps: [
    "In a medium saucepan, combine the rice, milk, sugar, and salt. Bring the mixture just to a simmer over medium heat, stirring often so the milk does not scorch.",
    "Reduce the heat to low and cook, uncovered, at a gentle simmer for 30 to 40 minutes, stirring often, until the rice is tender and the pudding is thick and creamy. It will thicken a little more as it cools.",
    "Take the pan off the heat. Stir in the vanilla and cinnamon.",
    "Spoon into bowls and serve warm, or cool and refrigerate until chilled.",
    "Dust with a little more cinnamon just before serving.",
  ],
  substitutions: [
    "Long-grain white rice: use medium-grain or arborio rice; the pudding will be a little starchier. Do not use instant rice.",
    "Milk: use whole milk for the creamiest result, or a mix of milk and half-and-half. Unsweetened plant milk works, though the pudding may be a little thinner.",
    "Granulated sugar: use packed brown sugar or 3 tablespoons honey, stirred in at the end if you use honey.",
    "Add-ins: stir in ⅓ cup raisins during the last 10 minutes of cooking.",
  ],
  tips: [
    "Stir regularly and keep the heat low; milk scorches easily on the bottom of the pan.",
    "If the pudding gets thicker than you like, loosen it with a splash of milk when you reheat it.",
  ],
  pantryStaples: ["white rice", "milk", "sugar", "cinnamon"],
  related: ["bread-pudding", "baked-oatmeal", "leftover-rice-fried-rice"],
};
