import type { Recipe } from "./types";

export const snickerdoodles: Recipe = {
  slug: "snickerdoodles",
  title: "Snickerdoodles",
  seoTitle: "Easy Snickerdoodle Cookies with Cinnamon Sugar",
  metaSummary: "Classic snickerdoodle cookies, about 35 minutes",
  intro:
    "These are classic snickerdoodle cookies that take about 35 minutes. A soft butter-and-sugar dough is rolled in cinnamon sugar and baked until the tops crack and the edges are set. The centers should still look slightly soft when you take them out of the oven.",
  meal: "snack",
  tags: ["vegetarian"],
  servings: 24,
  prepMin: 20,
  cookMin: 15,
  datePublished: "2026-11-26",
  updated: "2026-11-26",
  image: "/recipes/snickerdoodles.webp",
  imageAlt: "AI-generated illustration of cinnamon-sugar snickerdoodle cookies on a plate, not a photo of this dish",
  ingredients: [
    { qty: 1, unit: "cup", item: "butter", note: "softened" },
    { qty: 1.5, unit: "cup", item: "granulated sugar" },
    { qty: 2, item: "egg", plural: "eggs" },
    { qty: 2.75, unit: "cup", item: "all-purpose flour" },
    { qty: 2, unit: "tsp", item: "cream of tartar" },
    { qty: 1, unit: "tsp", item: "baking soda" },
    { qty: 0.5, unit: "tsp", item: "salt" },
    { qty: 1, unit: "tbsp", item: "ground cinnamon" },
  ],
  steps: [
    "Heat the oven to 375°F (190°C). Line two baking sheets with parchment. In a small bowl, stir 3 tablespoons of the sugar with the cinnamon for rolling.",
    "Beat the butter and the remaining sugar until creamy. Beat in the eggs.",
    "In a second bowl, whisk the flour, cream of tartar, baking soda, and salt. Mix the dry ingredients into the butter mixture just until a soft dough forms.",
    "Roll tablespoons of dough into balls, coat them in the cinnamon sugar, and set them 2 inches apart on the sheets.",
    "Bake for 8 to 10 minutes, until the tops are cracked and the edges are set. The centers should still look slightly soft. Cool on the sheet for 5 minutes, then move to a rack.",
  ],
  substitutions: [
    "Cream of tartar: use 2 teaspoons lemon juice in the dough and 2 teaspoons baking powder in place of the cream of tartar and baking soda; the tang will be milder.",
    "Butter: use an equal amount of plant butter.",
    "Granulated sugar: do not swap the dough sugar for brown sugar; the cookies will spread too much and lose the cracked top.",
    "Cinnamon: use a cinnamon–sugar blend you already have, about 3 tablespoons, for rolling.",
  ],
  tips: [
    "Cream of tartar is what gives snickerdoodles their slight tang and helps the tops crack.",
    "If the dough is sticky, chill it for 15 minutes before rolling.",
  ],
  pantryStaples: ["butter", "sugar", "flour", "cinnamon"],
  related: ["chocolate-chip-cookies", "easy-sugar-cookies", "oatmeal-cookies"],
};
