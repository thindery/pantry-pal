import type { Recipe } from "./types";

export const chocolateCrinkleCookies: Recipe = {
  slug: "chocolate-crinkle-cookies",
  title: "Chocolate Crinkle Cookies",
  seoTitle: "Easy Chocolate Crinkle Cookies for Christmas",
  metaSummary: "Chocolate crinkle cookies, about 50 minutes",
  intro:
    "These are chocolate crinkle cookies that take about 50 minutes, including a short chill. The dough is cocoa, sugar, oil, and eggs, rolled in powdered sugar so the cookies bake with a cracked, snowy top. They stay fudgy in the center when you pull them as soon as the tops are set.",
  meal: "snack",
  tags: ["holiday", "vegetarian"],
  servings: 24,
  prepMin: 25,
  cookMin: 25,
  datePublished: "2026-11-26",
  updated: "2026-11-26",
  image: "/recipes/chocolate-crinkle-cookies.webp",
  imageAlt: "AI-generated illustration of chocolate crinkle cookies with powdered sugar, not a photo of this dish",
  ingredients: [
    { qty: 1, unit: "cup", item: "granulated sugar" },
    { qty: 0.5, unit: "cup", item: "vegetable oil" },
    { qty: 0.75, unit: "cup", item: "unsweetened cocoa powder" },
    { qty: 2, item: "egg", plural: "eggs" },
    { qty: 1, unit: "tsp", item: "vanilla extract" },
    { qty: 1, unit: "cup", item: "all-purpose flour" },
    { qty: 1, unit: "tsp", item: "baking powder" },
    { qty: 0.25, unit: "tsp", item: "salt" },
    { qty: 0.5, unit: "cup", item: "powdered sugar", note: "for rolling" },
  ],
  steps: [
    "Stir the granulated sugar, oil, and cocoa until a thick paste forms. Beat in the eggs and vanilla.",
    "In a second bowl, whisk the flour, baking powder, and salt. Mix the dry ingredients into the cocoa mixture just until a soft dough forms. Cover and refrigerate for 20 minutes so the dough is easier to roll.",
    "Heat the oven to 350°F (175°C). Put the powdered sugar in a shallow bowl. Roll tablespoons of dough into balls, coat them well in powdered sugar, and set them 2 inches apart on parchment-lined baking sheets.",
    "Bake for 10 to 12 minutes, until the cookies have spread, the tops are cracked, and the edges are set. The centers should still look slightly soft.",
    "Cool on the sheet for 5 minutes, then move to a rack.",
  ],
  substitutions: [
    "Vegetable oil: use melted coconut oil, cooled slightly, or a mild olive oil.",
    "Unsweetened cocoa: use Dutch-process or natural cocoa in this recipe.",
    "Granulated sugar: do not swap this for brown sugar; the dough will spread too much.",
    "Vanilla: use ½ teaspoon almond extract for a different flavor.",
  ],
  tips: [
    "Roll the balls generously in powdered sugar; a thin coat disappears in the oven.",
    "If the dough is sticky after the chill, dust your hands with cocoa or flour.",
  ],
  pantryStaples: ["cocoa powder", "sugar", "flour", "eggs"],
  related: ["easy-sugar-cookies", "easy-chocolate-fudge", "gingerbread-cookies"],
};
