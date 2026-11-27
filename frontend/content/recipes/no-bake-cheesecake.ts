import type { Recipe } from "./types";

export const noBakeCheesecake: Recipe = {
  slug: "no-bake-cheesecake",
  title: "No-Bake Cheesecake",
  seoTitle: "Easy No-Bake Cheesecake with a Cracker Crust",
  metaSummary: "No-bake cheesecake with a 3-hour chill",
  intro:
    "This is a no-bake cheesecake that takes about 20 minutes of hands-on time, plus at least 3 hours in the refrigerator. A graham cracker crust is pressed into a pan and filled with a cream cheese, sugar, and whipped cream filling. It sets in the fridge instead of the oven.",
  meal: "snack",
  tags: ["vegetarian"],
  servings: 8,
  prepMin: 20,
  cookMin: 180,
  datePublished: "2026-11-26",
  updated: "2026-11-26",
  image: "/recipes/no-bake-cheesecake.webp",
  imageAlt: "AI-generated illustration of a sliced no-bake cheesecake with a graham cracker crust, not a photo of this dish",
  ingredients: [
    { qty: 1.5, unit: "cup", item: "graham cracker crumbs" },
    { qty: 5, unit: "tbsp", item: "butter", note: "melted" },
    { qty: 2, unit: "tbsp", item: "granulated sugar", note: "for the crust" },
    { qty: 16, unit: "oz", item: "cream cheese", note: "softened" },
    { qty: 0.75, unit: "cup", item: "powdered sugar" },
    { qty: 1, unit: "tsp", item: "vanilla extract" },
    { qty: 1, unit: "cup", item: "heavy cream", note: "cold" },
    { qty: 1, unit: "tbsp", item: "lemon juice" },
  ],
  steps: [
    "Stir the graham cracker crumbs, melted butter, and 2 tablespoons granulated sugar until the crumbs are evenly moistened. Press the mixture firmly into the bottom and slightly up the sides of a 9-inch springform pan or pie dish. Chill the crust while you make the filling.",
    "Beat the cream cheese, powdered sugar, vanilla, and lemon juice until completely smooth, with no lumps.",
    "In a separate bowl, beat the cold heavy cream to medium-stiff peaks. Fold the whipped cream into the cream cheese mixture until no streaks remain.",
    "Spread the filling in the chilled crust and smooth the top. Cover and refrigerate for at least 3 hours, or overnight, until the filling is set.",
    "Run a knife around the edge, release the springform if you used one, and slice with a warm knife.",
  ],
  substitutions: [
    "Graham crackers: use crushed digestive biscuits, vanilla wafers, or gingersnaps in the same amount.",
    "Heavy cream: use 8 ounces of thawed frozen whipped topping, folded in as you would the whipped cream.",
    "Lemon juice: use ½ teaspoon lemon zest, or skip the citrus for a plainer vanilla filling.",
    "Cream cheese: use full-fat blocks, not whipped or spreadable tub cream cheese, so the filling sets.",
  ],
  tips: [
    "The 3-hour chill is required for a clean slice; overnight is even firmer. The cook time in the recipe is that chill, not oven time.",
    "For neater slices, wipe the knife with a warm, damp cloth between cuts.",
  ],
  pantryStaples: ["cream cheese", "graham crackers", "powdered sugar", "butter"],
  related: ["easy-chocolate-cake", "lemon-bars", "pumpkin-pie"],
};
