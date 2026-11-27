import type { Recipe } from "./types";

export const breadPudding: Recipe = {
  slug: "bread-pudding",
  title: "Bread Pudding",
  seoTitle: "Classic Bread Pudding from Leftover Bread",
  metaSummary: "Classic baked bread pudding, about 60 minutes",
  intro:
    "This is a classic baked bread pudding that takes about 60 minutes. Cubes of leftover bread soak in a custard of milk, eggs, sugar, and vanilla, then bake until the top is golden and the center is just set. It is a dessert, not a savory casserole, and it is a good use for bread that has gone a little stale.",
  meal: "snack",
  tags: ["vegetarian"],
  servings: 8,
  prepMin: 15,
  cookMin: 45,
  datePublished: "2026-11-26",
  updated: "2026-11-26",
  image: "/recipes/bread-pudding.webp",
  imageAlt: "AI-generated illustration of baked bread pudding in a dish, not a photo of this dish",
  ingredients: [
    { qty: 6, unit: "cup", item: "cubed stale bread", note: "about 8 ounces, packed lightly" },
    { qty: 2, unit: "cup", item: "milk" },
    { qty: 3, item: "egg", plural: "eggs" },
    { qty: 0.5, unit: "cup", item: "granulated sugar" },
    { qty: 0.25, unit: "cup", item: "butter", note: "melted" },
    { qty: 2, unit: "tsp", item: "vanilla extract" },
    { qty: 1, unit: "tsp", item: "ground cinnamon" },
    { qty: 0.25, unit: "tsp", item: "salt" },
    { qty: 0.5, unit: "cup", item: "raisins", note: "optional" },
  ],
  steps: [
    "Heat the oven to 350°F (175°C). Grease an 8-inch square or 2-quart baking dish. Spread the bread cubes in the dish.",
    "In a large bowl, whisk the milk, eggs, sugar, melted butter, vanilla, cinnamon, and salt until smooth.",
    "Scatter the raisins over the bread if you are using them. Pour the custard over the bread and press the cubes down gently so they soak. Let the dish sit for 10 minutes.",
    "Bake for 40 to 50 minutes, until the top is golden and the center is just set. A knife inserted in the center should come out mostly clean.",
    "Cool for at least 15 minutes before serving warm.",
  ],
  substitutions: [
    "Bread: use French bread, sandwich bread, or challah; slightly stale bread soaks up the custard better than fresh.",
    "Milk: use half-and-half for a richer pudding, or unsweetened plant milk.",
    "Add-ins: scatter ½ cup raisins or chocolate chips over the bread before pouring on the custard.",
    "Granulated sugar: use packed brown sugar for a deeper flavor.",
  ],
  tips: [
    "If the bread is very fresh, toast the cubes in a 300°F oven for 10 minutes so they do not turn mushy.",
    "The pudding will puff in the oven and settle as it cools.",
  ],
  pantryStaples: ["bread", "milk", "eggs", "sugar"],
  related: ["peach-cobbler", "classic-rice-pudding", "banana-bread"],
};
