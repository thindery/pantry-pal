import type { Recipe } from "./types";

export const appleCrisp: Recipe = {
  slug: "apple-crisp",
  title: "Apple Crisp",
  seoTitle: "Easy Apple Crisp with a Pantry Oat Topping",
  metaSummary: "Baked apple crisp, about 55 minutes",
  intro:
    "This is a baked apple crisp that takes about 55 minutes, most of it in the oven. Sliced apples are tossed with sugar and cinnamon, then covered with a pantry topping of oats, flour, brown sugar, and butter. There is no pie crust; the crisp bakes in a plain baking dish until the fruit bubbles and the topping is golden.",
  meal: "snack",
  tags: ["vegetarian"],
  servings: 8,
  prepMin: 15,
  cookMin: 40,
  datePublished: "2026-11-26",
  updated: "2026-11-26",
  image: "/recipes/apple-crisp.webp",
  imageAlt: "AI-generated illustration of baked apple crisp with an oat topping, not a photo of this dish",
  ingredients: [
    { qty: 6, unit: "cup", item: "sliced apples", note: "about 6 medium, peeled" },
    { qty: 0.5, unit: "cup", item: "granulated sugar" },
    { qty: 1, unit: "tsp", item: "ground cinnamon" },
    { qty: 1, unit: "tbsp", item: "lemon juice" },
    { qty: 1, unit: "cup", item: "old-fashioned rolled oats" },
    { qty: 0.75, unit: "cup", item: "packed brown sugar" },
    { qty: 0.5, unit: "cup", item: "all-purpose flour" },
    { qty: 0.5, unit: "cup", item: "butter", note: "cold, cut into pieces" },
    { qty: 0.25, unit: "tsp", item: "salt" },
  ],
  steps: [
    "Heat the oven to 350°F (175°C). Grease an 8-inch square baking dish or a similar 2-quart dish.",
    "Toss the apples with the granulated sugar, cinnamon, and lemon juice. Spread them in the dish.",
    "In a bowl, combine the oats, brown sugar, flour, and salt. Cut in the butter with a pastry blender or your fingers until the mixture is clumpy. Sprinkle it evenly over the apples.",
    "Bake for 35 to 45 minutes, until the topping is golden and the apples are bubbling at the edges.",
    "Cool for at least 15 minutes before serving so the juices thicken.",
  ],
  substitutions: [
    "Apple variety: use a mix of Granny Smith and a sweeter apple such as Honeycrisp or Golden Delicious.",
    "Old-fashioned oats: use quick oats; the topping will be a little finer.",
    "Butter: use an equal amount of cold plant butter or coconut oil.",
    "Lemon juice: use 1 teaspoon apple cider vinegar if that is what you have.",
  ],
  tips: [
    "If the apples are very juicy, toss them with 1 tablespoon of flour along with the sugar.",
    "This is a crisp, not a pie: there is no bottom crust, only the oat topping.",
  ],
  pantryStaples: ["apples", "rolled oats", "brown sugar", "butter"],
  related: ["apple-pie", "peach-cobbler", "oatmeal-cookies"],
};
