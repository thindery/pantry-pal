import type { Recipe } from "./types";

export const chocolateChipCookies: Recipe = {
  slug: "chocolate-chip-cookies",
  title: "Chocolate Chip Cookies",
  seoTitle: "Easy Chocolate Chip Cookies from the Pantry",
  metaSummary: "Chocolate chip cookies, about 30 minutes",
  intro:
    "These are classic chocolate chip cookies that take about 30 minutes. The dough is butter, brown sugar, flour, and chocolate chips, and the cookies bake until the edges are golden and the centers still look slightly soft. They firm up as they cool on the sheet.",
  meal: "snack",
  tags: ["vegetarian"],
  servings: 24,
  prepMin: 15,
  cookMin: 15,
  datePublished: "2026-11-26",
  updated: "2026-11-26",
  image: "/recipes/chocolate-chip-cookies.webp",
  imageAlt: "AI-generated illustration of chocolate chip cookies on a plate, not a photo of this dish",
  ingredients: [
    { qty: 1, unit: "cup", item: "butter", note: "softened" },
    { qty: 0.75, unit: "cup", item: "packed brown sugar" },
    { qty: 0.5, unit: "cup", item: "granulated sugar" },
    { qty: 2, item: "egg", plural: "eggs" },
    { qty: 2, unit: "tsp", item: "vanilla extract" },
    { qty: 2.25, unit: "cup", item: "all-purpose flour" },
    { qty: 1, unit: "tsp", item: "baking soda" },
    { qty: 0.75, unit: "tsp", item: "salt" },
    { qty: 2, unit: "cup", item: "semisweet chocolate chips" },
  ],
  steps: [
    "Heat the oven to 375°F (190°C). Line two baking sheets with parchment.",
    "Beat the butter, brown sugar, and granulated sugar until creamy. Beat in the eggs and vanilla.",
    "In a second bowl, whisk the flour, baking soda, and salt. Mix the dry ingredients into the butter mixture just until combined, then stir in the chocolate chips.",
    "Drop rounded tablespoons of dough 2 inches apart on the sheets. Bake for 9 to 11 minutes, until the edges are golden and the centers still look slightly soft.",
    "Cool on the sheet for 5 minutes, then move to a rack.",
  ],
  substitutions: [
    "Butter: use an equal amount of plant butter for a dairy-free cookie.",
    "Semisweet chocolate chips: use dark chocolate chips, or 1 cup chips plus 1 cup chopped walnuts.",
    "Brown sugar: use all granulated sugar; the cookies will be a little crisper and less chewy.",
    "Vanilla: use 1 teaspoon vanilla plus 1 teaspoon water if you are short.",
  ],
  tips: [
    "For thicker cookies, chill the scooped dough for 20 minutes before baking.",
    "If you only have one baking sheet, let it cool between batches so the dough does not spread too fast.",
  ],
  pantryStaples: ["chocolate chips", "brown sugar", "flour", "butter"],
  related: ["snickerdoodles", "oatmeal-cookies", "fudgy-brownies"],
};
