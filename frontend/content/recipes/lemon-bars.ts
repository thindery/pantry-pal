import type { Recipe } from "./types";

export const lemonBars: Recipe = {
  slug: "lemon-bars",
  title: "Lemon Bars",
  seoTitle: "Easy Lemon Bars with a Shortbread Crust",
  metaSummary: "Lemon bars with a shortbread crust, about 55 minutes",
  intro:
    "These are lemon bars that take about 55 minutes, including time in the oven. A shortbread crust of butter, flour, and sugar is baked, then topped with a tangy lemon filling of eggs, sugar, and lemon juice. Cool them completely and dust with powdered sugar before you cut them.",
  meal: "snack",
  tags: ["vegetarian"],
  servings: 16,
  prepMin: 15,
  cookMin: 40,
  datePublished: "2026-11-26",
  updated: "2026-11-26",
  image: "/recipes/lemon-bars.webp",
  imageAlt: "AI-generated illustration of lemon bars dusted with powdered sugar, not a photo of this dish",
  ingredients: [
    { qty: 1, unit: "cup", item: "butter", note: "softened, for the crust" },
    { qty: 2, unit: "cup", item: "all-purpose flour", note: "divided" },
    { qty: 0.5, unit: "cup", item: "powdered sugar", note: "plus more for dusting" },
    { qty: 4, item: "egg", plural: "eggs" },
    { qty: 1.5, unit: "cup", item: "granulated sugar" },
    { qty: 1 / 3, unit: "cup", item: "fresh lemon juice", note: "from about 2 lemons" },
    { qty: 1, unit: "tsp", item: "lemon zest", note: "optional" },
    { qty: 0.5, unit: "tsp", item: "baking powder" },
  ],
  steps: [
    "Heat the oven to 350°F (175°C). Grease a 9×13-inch pan or line it with parchment.",
    "Mix 1½ cups of the flour with the butter and powdered sugar until a soft dough forms. Press it evenly into the pan. Bake for 15 to 18 minutes, until the edges are just beginning to color.",
    "While the crust bakes, whisk the eggs, granulated sugar, lemon juice, lemon zest, baking powder, and the remaining ½ cup flour until smooth.",
    "Pour the filling over the hot crust. Bake for 20 to 25 minutes more, until the filling is set and no longer jiggles in the center.",
    "Cool completely in the pan. Dust with powdered sugar and cut into 16 bars.",
  ],
  substitutions: [
    "Fresh lemon juice: bottled lemon juice works in the same amount; add the zest only if you have a fresh lemon.",
    "Powdered sugar in the crust: use ⅓ cup granulated sugar; the crust will be a little more crumbly.",
    "Butter: use an equal amount of plant butter for a dairy-free crust.",
    "9×13-inch pan: an 8-inch square pan makes thicker bars; add 5 minutes to the filling bake and check the center.",
  ],
  tips: [
    "Cool the bars completely before cutting or the filling will smear.",
    "Dust with powdered sugar just before serving so it does not dissolve into the filling.",
  ],
  pantryStaples: ["lemons", "butter", "flour", "sugar"],
  related: ["no-bake-cheesecake", "fudgy-brownies", "easy-sugar-cookies"],
};
