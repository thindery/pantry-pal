import type { Recipe } from "./types";

export const thumbprintCookies: Recipe = {
  slug: "thumbprint-cookies",
  title: "Thumbprint Cookies",
  seoTitle: "Holiday Thumbprint Cookies with Jam Centers",
  metaSummary: "Jam thumbprint cookies, about 40 minutes",
  intro:
    "These are holiday thumbprint cookies that take about 40 minutes. A shortbread-style dough of butter, sugar, and flour is rolled into balls, pressed in the center, and filled with jam before baking. Use whatever jam you have in the pantry; raspberry and apricot both work well.",
  meal: "snack",
  tags: ["holiday", "vegetarian"],
  servings: 24,
  prepMin: 20,
  cookMin: 20,
  datePublished: "2026-11-26",
  updated: "2026-11-26",
  image: "/recipes/thumbprint-cookies.webp",
  imageAlt: "AI-generated illustration of jam thumbprint cookies on a plate, not a photo of this dish",
  ingredients: [
    { qty: 1, unit: "cup", item: "butter", note: "softened" },
    { qty: 2 / 3, unit: "cup", item: "granulated sugar" },
    { qty: 2, unit: "cup", item: "all-purpose flour" },
    { qty: 1, item: "egg yolk", plural: "egg yolks" },
    { qty: 1, unit: "tsp", item: "vanilla extract" },
    { qty: 0.25, unit: "tsp", item: "salt" },
    { qty: 1 / 3, unit: "cup", item: "jam", note: "raspberry, apricot, or strawberry" },
  ],
  steps: [
    "Heat the oven to 350°F (175°C). Beat the butter and sugar until creamy. Beat in the egg yolk and vanilla.",
    "Mix in the flour and salt just until a soft dough forms.",
    "Roll tablespoons of dough into balls and set them 2 inches apart on parchment-lined baking sheets. Press a deep thumbprint into the center of each ball.",
    "Fill each indent with about ½ teaspoon of jam. Bake for 12 to 15 minutes, until the edges are lightly golden.",
    "Cool on the sheet for 5 minutes, then move to a rack. The jam will set as the cookies cool.",
  ],
  substitutions: [
    "Jam: use lemon curd, chocolate-hazelnut spread, or mincemeat in the same amount.",
    "Butter: use an equal amount of plant butter for a dairy-free cookie.",
    "Granulated sugar: use ⅔ cup powdered sugar for a slightly more tender cookie.",
    "Vanilla: use ¼ teaspoon almond extract plus ¾ teaspoon vanilla.",
  ],
  tips: [
    "If the dough cracks when you press it, roll the ball again and press more gently, or patch the crack with a pinch of dough.",
    "If a jam well overflows, let the cookies cool, then trim the edge with a knife.",
  ],
  pantryStaples: ["butter", "sugar", "flour", "jam"],
  related: ["easy-sugar-cookies", "gingerbread-cookies", "peppermint-bark"],
};
