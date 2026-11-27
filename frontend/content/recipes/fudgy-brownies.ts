import type { Recipe } from "./types";

export const fudgyBrownies: Recipe = {
  slug: "fudgy-brownies",
  title: "Fudgy Brownies",
  seoTitle: "Homemade Fudgy Brownies from Pantry Cocoa",
  metaSummary: "Fudgy cocoa brownies, about 45 minutes",
  intro:
    "These are fudgy cocoa brownies that take about 45 minutes, including time in the oven. The batter is cocoa, butter, sugar, eggs, and flour, mixed in one bowl and baked in an 8-inch pan. Pull them when the center is just set so they stay moist as they cool.",
  meal: "snack",
  tags: ["vegetarian"],
  servings: 16,
  prepMin: 15,
  cookMin: 30,
  datePublished: "2026-11-26",
  updated: "2026-11-26",
  image: "/recipes/fudgy-brownies.webp",
  imageAlt: "AI-generated illustration of fudgy brownies cut into squares, not a photo of this dish",
  ingredients: [
    { qty: 0.5, unit: "cup", item: "butter" },
    { qty: 1, unit: "cup", item: "granulated sugar" },
    { qty: 2, item: "egg", plural: "eggs" },
    { qty: 1, unit: "tsp", item: "vanilla extract" },
    { qty: 1 / 3, unit: "cup", item: "unsweetened cocoa powder" },
    { qty: 0.5, unit: "cup", item: "all-purpose flour" },
    { qty: 0.25, unit: "tsp", item: "salt" },
    { qty: 0.25, unit: "tsp", item: "baking powder" },
  ],
  steps: [
    "Heat the oven to 350°F (175°C). Line an 8-inch square pan with parchment, leaving an overhang on two sides.",
    "Melt the butter in a saucepan or in the microwave. Whisk in the sugar, then the eggs and vanilla, until the mixture is glossy.",
    "Stir in the cocoa, flour, salt, and baking powder just until no dry streaks remain. Spread the batter in the pan.",
    "Bake for 22 to 28 minutes, until the top looks dry and a toothpick inserted near the center comes out with a few moist crumbs, not wet batter.",
    "Cool completely in the pan, then lift out with the parchment and cut into 16 squares.",
  ],
  substitutions: [
    "Butter: use an equal amount of melted coconut oil or a neutral oil.",
    "Unsweetened cocoa: use Dutch-process or natural cocoa in this recipe.",
    "Granulated sugar: use packed brown sugar for a slightly chewier brownie.",
    "Add-ins: fold in ½ cup chocolate chips or chopped walnuts if you like.",
  ],
  tips: [
    "Do not overbake; the brownies finish setting as they cool.",
    "For cleaner cuts, chill the cooled slab for 20 minutes and wipe the knife between slices.",
  ],
  pantryStaples: ["cocoa powder", "butter", "sugar", "flour"],
  related: ["easy-chocolate-cake", "chocolate-chip-cookies", "easy-chocolate-fudge"],
};
