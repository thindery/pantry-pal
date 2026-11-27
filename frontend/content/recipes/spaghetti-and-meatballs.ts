import type { Recipe } from "./types";

export const spaghettiAndMeatballs: Recipe = {
  slug: "spaghetti-and-meatballs",
  title: "Spaghetti and Meatballs",
  seoTitle: "Classic Spaghetti and Meatballs for Dinner",
  metaSummary: "Spaghetti and meatballs, about 50 minutes",
  intro:
    "This is classic spaghetti and meatballs that takes about 50 minutes. Pantry breadcrumbs, ground beef, and a jar of marinara make a weeknight version of the Sunday dish. The meatballs simmer in the sauce while the pasta boils, and everything is tossed together at the end.",
  meal: "dinner",
  tags: [],
  servings: 6,
  prepMin: 20,
  cookMin: 30,
  datePublished: "2026-11-26",
  updated: "2026-11-26",
  image: "/recipes/spaghetti-and-meatballs.webp",
  imageAlt: "AI-generated illustration of spaghetti and meatballs in a bowl, not a photo of this dish",
  ingredients: [
    { qty: 1, unit: "lb", item: "ground beef" },
    { qty: 0.5, unit: "cup", item: "plain breadcrumbs" },
    { qty: 0.25, unit: "cup", item: "grated Parmesan", note: "plus more for serving" },
    { qty: 1, item: "egg", plural: "eggs" },
    { qty: 2, unit: "clove", item: "garlic", plural: "garlic cloves", note: "minced" },
    { qty: 1, unit: "tsp", item: "Italian seasoning" },
    { qty: 0.75, unit: "tsp", item: "salt" },
    { qty: 24, unit: "oz", item: "marinara sauce" },
    { qty: 12, unit: "oz", item: "spaghetti" },
  ],
  steps: [
    "In a bowl, mix the ground beef, breadcrumbs, Parmesan, egg, garlic, Italian seasoning, and salt just until combined. Roll into 16 to 18 meatballs, about 1½ inches each.",
    "Heat a little oil in a large skillet over medium heat. Brown the meatballs on all sides, about 6 to 8 minutes. They do not need to cook through yet.",
    "Pour in the marinara, bring to a simmer, and cook, stirring occasionally, for 15 to 20 minutes, until the meatballs are cooked through.",
    "Meanwhile, cook the spaghetti in a large pot of salted boiling water until al dente. Drain, reserving ½ cup of the pasta water.",
    "Toss the spaghetti with the sauce and meatballs, loosening with a splash of pasta water if needed. Serve with more Parmesan.",
  ],
  substitutions: [
    "Ground beef: use a mix of beef and pork, or ground turkey; start checking the turkey meatballs a few minutes earlier.",
    "Marinara: use 3 cups homemade tomato sauce, or crushed tomatoes simmered with garlic and oregano.",
    "Spaghetti: use linguine or spaghetti thin; cook according to the package.",
    "Plain breadcrumbs: use panko, or ½ cup crushed crackers.",
  ],
  tips: [
    "Do not pack the meatball mixture or the meatballs will be dense; mix just until it holds together.",
    "If the sauce is thicker than you like after simmering, add a splash of the pasta water.",
  ],
  pantryStaples: ["ground beef", "spaghetti", "marinara", "breadcrumbs"],
  related: ["baked-ziti", "easy-lasagna", "classic-meatloaf"],
};
