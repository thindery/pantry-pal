import type { Recipe } from "./types";

export const applePie: Recipe = {
  slug: "apple-pie",
  title: "Apple Pie",
  seoTitle: "Homemade Apple Pie for Christmas Dinner",
  metaSummary: "Homemade double-crust apple pie, about 90 minutes",
  intro:
    "This is a homemade double-crust apple pie that takes about 90 minutes, most of it in the oven. Sliced apples are tossed with sugar, cinnamon, and a little flour, then baked between two crusts until the filling bubbles. Let it cool so the juices thicken before you slice it.",
  meal: "snack",
  tags: ["holiday", "vegetarian"],
  servings: 8,
  prepMin: 25,
  cookMin: 65,
  datePublished: "2026-11-26",
  updated: "2026-11-26",
  image: "/recipes/apple-pie.webp",
  imageAlt: "AI-generated illustration of a sliced double-crust apple pie, not a photo of this dish",
  ingredients: [
    { qty: 2, item: "refrigerated pie crust", plural: "refrigerated pie crusts", note: "for a 9-inch pie" },
    { qty: 6, unit: "cup", item: "sliced apples", note: "about 6 medium, peeled" },
    { qty: 0.75, unit: "cup", item: "granulated sugar" },
    { qty: 3, unit: "tbsp", item: "all-purpose flour" },
    { qty: 1, unit: "tsp", item: "ground cinnamon" },
    { qty: 1, unit: "tbsp", item: "lemon juice" },
    { qty: 2, unit: "tbsp", item: "butter", note: "cut into small pieces" },
    { qty: 0.25, unit: "tsp", item: "salt" },
  ],
  steps: [
    "Heat the oven to 425°F (220°C). Fit one crust into a 9-inch pie dish.",
    "In a large bowl, toss the apples with the sugar, flour, cinnamon, lemon juice, and salt until coated.",
    "Pile the filling into the crust and dot with the butter. Cover with the second crust, seal and crimp the edge, and cut a few slits in the top. Set the pie on a baking sheet.",
    "Bake for 20 minutes, then reduce the oven to 375°F (190°C) and bake 35 to 45 minutes more, until the crust is golden and the filling is bubbling through the slits. Tent the edge with foil if it browns too fast.",
    "Cool the pie on a rack for at least 2 hours before slicing.",
  ],
  substitutions: [
    "Apple variety: use a mix of Granny Smith and a sweeter apple such as Honeycrisp or Golden Delicious.",
    "Granulated sugar: use packed brown sugar, or a mix of both.",
    "Refrigerated crusts: use homemade double-crust pastry.",
    "Lemon juice: use apple cider vinegar, just 1 teaspoon, if that is what you have.",
  ],
  tips: [
    "A baking sheet under the pie catches drips and helps the bottom crust brown.",
    "If the filling is very juicy, add 1 extra tablespoon of flour.",
  ],
  pantryStaples: ["apples", "sugar", "cinnamon", "flour"],
  related: ["pumpkin-pie", "pecan-pie", "classic-stuffing"],
};
