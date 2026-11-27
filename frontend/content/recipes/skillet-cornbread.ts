import type { Recipe } from "./types";

export const skilletCornbread: Recipe = {
  slug: "skillet-cornbread",
  title: "Skillet Cornbread",
  seoTitle: "Golden Skillet Cornbread in a Cast-Iron Pan",
  metaSummary: "Skillet cornbread baked in cast iron, about 35 minutes",
  intro:
    "This is skillet cornbread that takes about 35 minutes. A buttermilk batter bakes in a hot, buttered cast-iron skillet until the top is golden and the edges are crisp. It is a side for chili, pulled pork, or a pot of beans.",
  meal: "dinner",
  tags: ["vegetarian"],
  servings: 8,
  prepMin: 10,
  cookMin: 25,
  datePublished: "2026-11-26",
  updated: "2026-11-26",
  image: "/recipes/skillet-cornbread.webp",
  imageAlt: "AI-generated illustration of golden cornbread in a cast-iron skillet with one wedge cut, not a photo of this dish",
  ingredients: [
    { qty: 1, unit: "cup", item: "yellow cornmeal" },
    { qty: 1, unit: "cup", item: "all-purpose flour" },
    { qty: 1.25, unit: "cup", item: "buttermilk" },
    { qty: 1, item: "large egg", plural: "large eggs" },
    { qty: 4, unit: "tbsp", item: "butter", note: "melted, plus 1 tablespoon for the skillet" },
    { qty: 2, unit: "tbsp", item: "sugar" },
    { qty: 1, unit: "tbsp", item: "baking powder" },
    { qty: 0.5, unit: "tsp", item: "salt" },
  ],
  steps: [
    "Heat the oven to 400°F (200°C). Put a 10-inch cast-iron skillet in the oven to heat.",
    "Whisk the cornmeal, flour, sugar, baking powder, and salt in a bowl. In another bowl, whisk the buttermilk, egg, and 4 tablespoons melted butter. Stir the wet ingredients into the dry ones just until combined.",
    "Carefully take the hot skillet out of the oven and add 1 tablespoon butter, swirling to coat. Pour in the batter and spread it evenly.",
    "Bake for 20 to 25 minutes, until the top is golden and a toothpick in the center comes out clean. Cool for 5 minutes, then cut into wedges.",
  ],
  substitutions: [
    "Buttermilk: use 1¼ cups milk mixed with 1 tablespoon lemon juice or vinegar, left to stand for 5 minutes.",
    "Cast-iron skillet: use a 9-inch square metal pan; the edges will be a little less crisp.",
    "Sugar: leave it out for a more savory cornbread, or use honey, 2 tablespoons, in the wet ingredients.",
  ],
  tips: [
    "Heating the skillet before the batter goes in is what gives you a crisp bottom crust.",
    "Leftover wedges keep at room temperature, well wrapped, for about 2 days; warm them in a 300°F (150°C) oven.",
  ],
  pantryStaples: ["cornmeal", "buttermilk", "flour"],
  related: ["weeknight-chili", "hoppin-john", "banana-bread"],
};
