import type { Recipe } from "./types";

export const cannedTunaPasta: Recipe = {
  slug: "canned-tuna-pasta",
  title: "Canned Tuna Pasta",
  seoTitle: "Canned Tuna Pasta (20-Minute Pantry Dinner)",
  metaSummary: "Canned tuna pasta with tomato and garlic, 20 minutes",
  intro:
    "This is a canned tuna pasta with a quick tomato and garlic sauce, ready in about 20 minutes. It uses two cans of tuna, a box of short pasta, and a can of diced tomatoes. Everything comes from the pantry, and the sauce simmers while the pasta boils.",
  meal: "dinner",
  tags: ["quick"],
  servings: 4,
  prepMin: 5,
  cookMin: 15,
  datePublished: "2026-11-26",
  updated: "2026-11-26",
  image: "/recipes/canned-tuna-pasta.webp",
  imageAlt: "AI-generated illustration of a bowl of tuna pasta in tomato sauce, not a photo of this dish",
  ingredients: [
    { qty: 12, unit: "oz", item: "short pasta", note: "penne, rotini, or shells" },
    { qty: 2, unit: "tbsp", item: "olive oil" },
    { qty: 3, unit: "clove", item: "garlic", note: "thinly sliced" },
    { qty: 0.25, unit: "tsp", item: "red pepper flakes", note: "optional" },
    { qty: 1, unit: "can", size: "14.5 oz", item: "diced tomatoes", note: "with their juice" },
    { qty: 2, unit: "can", size: "5 oz", item: "tuna", note: "drained" },
    { qty: 1, unit: "tbsp", item: "lemon juice" },
    { qty: 0.5, unit: "tsp", item: "salt", note: "plus salt for the pasta water" },
    { qty: 0.25, unit: "tsp", item: "black pepper" },
  ],
  steps: [
    "Bring a large pot of salted water to a boil. Cook the pasta 1 minute less than the package says. Scoop out about ½ cup of the pasta water before draining.",
    "While the pasta cooks, warm the oil in a large skillet over medium heat. Add the garlic and red pepper flakes and cook for about 1 minute, until fragrant but not browned.",
    "Pour in the diced tomatoes with their juice, add the salt and pepper, and simmer for 8 to 10 minutes, until the sauce thickens slightly.",
    "Flake in the tuna and stir gently for 1 minute to warm it through.",
    "Add the drained pasta and a splash of the pasta water to the skillet. Toss over medium heat for 1 to 2 minutes, until the sauce clings to the pasta.",
    "Stir in the lemon juice, taste, and adjust the salt.",
  ],
  substitutions: [
    "Diced tomatoes: use crushed tomatoes or 1½ cups of marinara.",
    "Short pasta: spaghetti or any pasta you have works.",
    "Lemon juice: use a splash of vinegar, or skip it.",
    "Fresh garlic: use ½ teaspoon of garlic powder stirred in with the tomatoes.",
    "Add-ins: a spoonful of capers, a handful of olives, or frozen peas stirred in with the pasta.",
  ],
  tips: [
    "Pasta water helps the sauce cling. Add a little at a time.",
    "Refrigerate leftovers within 2 hours and eat them within 3 to 4 days.",
  ],
  faqs: [
    {
      question: "Can I use tuna packed in water instead of oil?",
      answer:
        "Yes. Drain it well and add an extra teaspoon or two of olive oil to the sauce for richness. Oil-packed tuna makes a slightly richer sauce, but both work in this recipe.",
    },
  ],
  pantryStaples: ["canned tuna", "pasta", "diced tomatoes", "garlic"],
  related: ["pasta-e-fagioli", "canned-chickpea-curry", "black-bean-tacos"],
};
