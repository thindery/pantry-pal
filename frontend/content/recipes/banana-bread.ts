import type { Recipe } from "./types";

export const bananaBread: Recipe = {
  slug: "banana-bread",
  title: "Banana Bread",
  seoTitle: "Easy Banana Bread with Overripe Bananas",
  metaSummary: "Classic banana bread, about 75 minutes",
  intro:
    "This is a classic banana bread that takes about 75 minutes, most of it in the oven. Very ripe bananas, flour, sugar, butter, and eggs bake into a moist loaf with a golden crust. It is a good use for bananas that are too soft to eat out of hand.",
  meal: "breakfast",
  tags: ["vegetarian"],
  servings: 10,
  prepMin: 15,
  cookMin: 60,
  datePublished: "2026-11-26",
  updated: "2026-11-26",
  image: "/recipes/banana-bread.webp",
  imageAlt: "AI-generated illustration of a sliced loaf of banana bread, not a photo of this dish",
  ingredients: [
    { qty: 3, item: "very ripe banana", plural: "very ripe bananas", note: "mashed, about 1¼ cups" },
    { qty: 1 / 3, unit: "cup", item: "butter", note: "melted" },
    { qty: 0.75, unit: "cup", item: "granulated sugar" },
    { qty: 1, item: "egg", plural: "eggs", note: "beaten" },
    { qty: 1, unit: "tsp", item: "vanilla extract" },
    { qty: 1.5, unit: "cup", item: "all-purpose flour" },
    { qty: 1, unit: "tsp", item: "baking soda" },
    { qty: 0.5, unit: "tsp", item: "salt" },
  ],
  steps: [
    "Heat the oven to 350°F (175°C). Grease a 9×5-inch loaf pan or line it with parchment.",
    "In a large bowl, mash the bananas. Stir in the melted butter, sugar, egg, and vanilla.",
    "In a second bowl, whisk the flour, baking soda, and salt. Fold the dry ingredients into the banana mixture just until combined. Do not overmix.",
    "Scrape the batter into the pan and smooth the top. Bake for 55 to 65 minutes, until a toothpick in the center comes out clean or with a few moist crumbs.",
    "Cool in the pan for 10 minutes, then turn the loaf out onto a rack and cool before slicing.",
  ],
  substitutions: [
    "Butter: use an equal amount of neutral oil or melted coconut oil.",
    "Granulated sugar: use packed brown sugar for a slightly darker loaf.",
    "Add-ins: fold in ½ cup chopped walnuts or chocolate chips.",
    "If you have only 2 bananas, add ¼ cup unsweetened applesauce to make up the volume.",
  ],
  tips: [
    "The bananas should be heavily speckled or black; underripe bananas will not sweeten the loaf enough.",
    "If the top browns before the center is done, tent the loaf with foil for the last 15 minutes.",
  ],
  pantryStaples: ["bananas", "flour", "sugar", "butter"],
  related: ["baked-oatmeal", "apple-crisp", "chocolate-chip-cookies"],
};
