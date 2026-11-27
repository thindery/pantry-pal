import type { Recipe } from "./types";

export const peachCobbler: Recipe = {
  slug: "peach-cobbler",
  title: "Peach Cobbler",
  seoTitle: "Easy Peach Cobbler with Canned Peaches",
  metaSummary: "Peach cobbler with canned peaches, about 55 minutes",
  intro:
    "This is a peach cobbler that takes about 55 minutes, most of it in the oven. Canned peaches bake under a simple batter of flour, sugar, milk, and butter that puffs and browns as it cooks. It is a pantry dessert you can make when fresh peaches are not in season.",
  meal: "snack",
  tags: ["vegetarian"],
  servings: 8,
  prepMin: 15,
  cookMin: 40,
  datePublished: "2026-11-26",
  updated: "2026-11-26",
  image: "/recipes/peach-cobbler.webp",
  imageAlt: "AI-generated illustration of peach cobbler in a baking dish, not a photo of this dish",
  ingredients: [
    { qty: 2, unit: "can", size: "15 oz", item: "sliced peaches in juice", note: "drained, juice reserved" },
    { qty: 0.5, unit: "cup", item: "butter" },
    { qty: 1, unit: "cup", item: "all-purpose flour" },
    { qty: 1, unit: "cup", item: "granulated sugar" },
    { qty: 1, unit: "cup", item: "milk" },
    { qty: 1.5, unit: "tsp", item: "baking powder" },
    { qty: 0.5, unit: "tsp", item: "ground cinnamon" },
    { qty: 0.25, unit: "tsp", item: "salt" },
  ],
  steps: [
    "Heat the oven to 350°F (175°C). Put the butter in a 9×13-inch or 2-quart baking dish and set the dish in the oven until the butter melts. Take the dish out.",
    "In a bowl, whisk the flour, ¾ cup of the sugar, the baking powder, and the salt. Whisk in the milk just until a thick batter forms.",
    "Pour the batter over the melted butter in the dish. Do not stir. Spoon the drained peaches over the batter, then drizzle on ¼ cup of the reserved peach juice. Sprinkle the remaining ¼ cup sugar and the cinnamon on top.",
    "Bake for 35 to 45 minutes, until the topping is puffed and deep golden and the fruit is bubbling at the edges.",
    "Cool for at least 15 minutes before serving. The batter rises around the peaches as it bakes.",
  ],
  substitutions: [
    "Canned peaches: use 4 cups sliced fresh or thawed frozen peaches; add 2 tablespoons extra sugar if they are tart, and skip the reserved juice.",
    "Milk: use whole, 2%, or unsweetened plant milk.",
    "Butter: use an equal amount of melted plant butter or coconut oil.",
    "Cinnamon: use a pinch of nutmeg, or skip the extra spice.",
  ],
  tips: [
    "Draining the peaches keeps the cobbler from turning watery; a little of the juice is enough for flavor.",
    "The batter looks thin in the dish and thickens in the oven; do not mix it with the fruit.",
  ],
  pantryStaples: ["canned peaches", "flour", "sugar", "butter"],
  related: ["apple-crisp", "apple-pie", "bread-pudding"],
};
