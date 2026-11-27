import type { Recipe } from "./types";

export const leftoverTurkeyPotPie: Recipe = {
  slug: "leftover-turkey-pot-pie",
  title: "Leftover Turkey Pot Pie",
  seoTitle: "Leftover Turkey Pot Pie from the Fridge",
  metaSummary: "Leftover turkey pot pie, about 1 hour",
  intro:
    "This is a leftover turkey pot pie you can put together in about an hour. It uses diced cooked turkey, a bag of frozen mixed vegetables, and a store-bought pie crust or puff pastry from the freezer. A simple gravy from butter, flour, and broth holds the filling together.",
  meal: "dinner",
  tags: ["holiday", "leftovers", "make-ahead"],
  servings: 6,
  prepMin: 25,
  cookMin: 40,
  datePublished: "2026-11-26",
  updated: "2026-11-26",
  image: "/recipes/leftover-turkey-pot-pie.webp",
  imageAlt: "AI-generated illustration of a leftover turkey pot pie with a golden crust, not a photo of this dish",
  ingredients: [
    { qty: 2, unit: "tbsp", item: "butter" },
    { qty: 1, item: "yellow onion", plural: "yellow onions", note: "diced" },
    { qty: 2, unit: "tbsp", item: "all-purpose flour" },
    { qty: 1.5, unit: "cup", item: "chicken or turkey broth" },
    { qty: 0.5, unit: "cup", item: "milk" },
    { qty: 2.5, unit: "cup", item: "diced cooked turkey" },
    { qty: 2, unit: "cup", item: "frozen mixed vegetables", note: "no need to thaw" },
    { qty: 0.5, unit: "tsp", item: "dried thyme" },
    { qty: 0.75, unit: "tsp", item: "salt", note: "plus more to taste" },
    { qty: 0.25, unit: "tsp", item: "black pepper" },
    { qty: 1, item: "refrigerated pie crust", plural: "refrigerated pie crusts", note: "or one sheet of puff pastry, thawed" },
    { qty: 1, item: "egg", plural: "eggs", note: "beaten with 1 teaspoon of water, optional, for the crust" },
  ],
  steps: [
    "Heat the oven to 400°F (200°C). Melt the butter in a large skillet over medium heat and cook the onion for about 5 minutes, until it is soft.",
    "Stir in the flour and cook for 1 minute. Whisk in the broth and milk and simmer until the gravy thickens, about 3 minutes.",
    "Stir in the turkey, frozen vegetables, thyme, salt, and pepper. Taste and add more salt if it needs it. Pour the filling into a 9-inch pie dish.",
    "Lay the crust over the filling, tuck the edges, and cut a few slits in the top so steam can escape. Brush with the egg wash if you are using it.",
    "Bake for 35 to 40 minutes, until the crust is golden and the filling is bubbling. Let it rest for 10 minutes before serving.",
  ],
  substitutions: [
    "Cooked turkey: use leftover roast chicken or a rotisserie chicken, diced.",
    "Frozen mixed vegetables: use leftover cooked vegetables, chopped, or a mix of frozen peas and carrots.",
    "Pie crust: use a sheet of puff pastry, or drop biscuit dough over the filling and bake until the biscuits are cooked through.",
    "Milk: use more broth, or a splash of cream if you have it.",
    "Thyme: use poultry seasoning, sage, or leftover gravy in place of some of the broth.",
  ],
  tips: [
    "Refrigerate leftover turkey within 2 hours of cooking, and use it in the pie within 3 to 4 days, or freeze it.",
    "You can assemble the pie earlier in the day, cover it, and refrigerate it. Add about 10 minutes to the bake if it goes into the oven cold.",
  ],
  faqs: [
    {
      question: "How long is leftover turkey safe to use in pot pie?",
      answer:
        "USDA guidance is to refrigerate cooked leftovers within 2 hours (1 hour if it is over 90°F), use them within 3 to 4 days, and reheat leftovers to 165°F. If the turkey has been in the fridge longer than that, freeze it or throw it out instead of making pot pie.",
    },
  ],
  faqSource: {
    label: "USDA FSIS: Leftovers and Food Safety",
    url: "https://www.fsis.usda.gov/food-safety/safe-food-handling-and-preparation/food-safety-basics/leftovers-and-food-safety",
  },
  pantryStaples: ["cooked turkey", "frozen vegetables", "pie crust", "broth"],
  related: ["leftover-turkey-soup", "leftover-turkey-sandwiches", "classic-stuffing"],
};
