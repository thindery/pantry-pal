import type { Recipe } from "./types";

export const chickenPotPie: Recipe = {
  slug: "chicken-pot-pie",
  title: "Chicken Pot Pie",
  seoTitle: "Easy Chicken Pot Pie with a Flaky Crust",
  metaSummary: "Homemade chicken pot pie, about 75 minutes",
  intro:
    "This is a homemade chicken pot pie that takes about 75 minutes, most of it in the oven. Cooked chicken, mixed vegetables, and a simple gravy bake under a flaky crust until the filling bubbles. It is a classic dinner you can make with leftover chicken or a rotisserie bird.",
  meal: "dinner",
  tags: [],
  servings: 6,
  prepMin: 25,
  cookMin: 50,
  datePublished: "2026-11-26",
  updated: "2026-11-26",
  image: "/recipes/chicken-pot-pie.webp",
  imageAlt: "AI-generated illustration of a sliced chicken pot pie, not a photo of this dish",
  ingredients: [
    { qty: 2, item: "refrigerated pie crust", plural: "refrigerated pie crusts", note: "for a 9-inch pie" },
    { qty: 2, unit: "cup", item: "cooked shredded chicken" },
    { qty: 2, unit: "cup", item: "frozen mixed vegetables", note: "thawed" },
    { qty: 1 / 3, unit: "cup", item: "butter" },
    { qty: 1 / 3, unit: "cup", item: "all-purpose flour" },
    { qty: 1.75, unit: "cup", item: "chicken broth" },
    { qty: 0.5, unit: "cup", item: "milk" },
    { qty: 0.5, unit: "tsp", item: "salt" },
    { qty: 0.25, unit: "tsp", item: "black pepper" },
  ],
  steps: [
    "Heat the oven to 425°F (220°C). Fit one crust into a 9-inch pie dish.",
    "Melt the butter in a saucepan over medium heat. Whisk in the flour and cook for 1 minute. Gradually whisk in the broth and milk and simmer, stirring, until the gravy is thick, about 5 minutes. Season with the salt and pepper.",
    "Stir in the chicken and mixed vegetables. Pour the filling into the bottom crust.",
    "Cover with the second crust, seal and crimp the edge, and cut a few slits in the top. Set the dish on a baking sheet.",
    "Bake for 30 to 35 minutes, until the crust is golden and the filling is bubbling through the slits. Cool for 10 minutes before slicing.",
  ],
  substitutions: [
    "Cooked chicken: use leftover turkey, or a rotisserie chicken, shredded.",
    "Frozen mixed vegetables: use 2 cups of diced cooked carrots, peas, and corn.",
    "Refrigerated crusts: use homemade double-crust pastry, or a single top crust over a greased dish.",
    "Milk: use half-and-half for a richer gravy, or unsweetened plant milk.",
  ],
  tips: [
    "A baking sheet under the pie catches drips if the filling bubbles over.",
    "If the crust edge browns too fast, tent it with a ring of foil for the last 10 minutes.",
  ],
  pantryStaples: ["cooked chicken", "frozen vegetables", "chicken broth", "flour"],
  related: ["leftover-turkey-pot-pie", "chicken-and-dumplings", "chicken-noodle-soup"],
};
