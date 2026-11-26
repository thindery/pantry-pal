import type { Recipe } from "./types";

export const leftoverTurkeySoup: Recipe = {
  slug: "leftover-turkey-soup",
  title: "Leftover Turkey Soup",
  seoTitle: "Leftover Turkey Soup (Pantry Vegetables)",
  metaSummary: "Easy leftover turkey soup, about 1 hour",
  intro:
    "This is a simple soup that turns leftover roast turkey into a new meal in about an hour. It uses the carcass or diced turkey, onions, carrots, celery, and noodles or rice from the pantry. A squeeze of lemon at the end keeps the broth bright.",
  meal: "dinner",
  tags: ["one-pot", "leftovers", "freezer-friendly"],
  servings: 6,
  prepMin: 15,
  cookMin: 45,
  datePublished: "2026-11-26",
  updated: "2026-11-26",
  image: "/recipes/leftover-turkey-soup.webp",
  imageAlt: "AI-generated illustration of a bowl of leftover turkey soup with vegetables and noodles, not a photo of this dish",
  ingredients: [
    { qty: 1, unit: "tbsp", item: "olive oil or butter" },
    { qty: 1, item: "yellow onion", plural: "yellow onions", note: "diced" },
    { qty: 3, item: "carrot", plural: "carrots", note: "sliced" },
    { qty: 3, unit: "stalk", item: "celery", note: "sliced" },
    { qty: 3, unit: "clove", item: "garlic", note: "minced" },
    { qty: 8, unit: "cup", item: "turkey or chicken broth", note: "or water plus the carcass" },
    { qty: 2, unit: "cup", item: "diced cooked turkey" },
    { qty: 1, unit: "cup", item: "egg noodles or uncooked rice" },
    { qty: 1, unit: "tsp", item: "dried thyme" },
    { qty: 1, unit: "tsp", item: "salt", note: "plus more to taste" },
    { qty: 0.5, unit: "tsp", item: "black pepper" },
    { qty: 1, unit: "tbsp", item: "lemon juice", note: "optional" },
  ],
  steps: [
    "Warm the oil or butter in a large pot over medium heat. Cook the onion, carrots, and celery for about 8 minutes, until the onion is soft.",
    "Stir in the garlic and thyme and cook for 30 seconds.",
    "Pour in the broth and bring it to a boil. If you have the turkey carcass, add it now, lower the heat, and simmer for 20 minutes, then lift out the bones and any skin.",
    "Add the diced turkey, noodles or rice, salt, and pepper. Simmer until the noodles are tender, about 8 minutes, or until the rice is cooked, about 15 minutes.",
    "Taste and add more salt if it needs it. Stir in the lemon juice just before serving.",
  ],
  substitutions: [
    "Cooked turkey: use leftover roast chicken or a rotisserie chicken, shredded.",
    "Egg noodles: use any short pasta, leftover cooked rice stirred in at the end, or skip the starch and serve with bread.",
    "Broth: use homemade stock from the carcass, boxed broth, or water plus a little extra salt.",
    "Thyme: use a bay leaf, parsley, or leftover gravy stirred in at the end.",
    "Carrots and celery: use leftover roasted vegetables, chopped, and add them with the turkey so they do not overcook.",
  ],
  tips: [
    "Refrigerate leftover soup within 2 hours. It keeps in the fridge for 3 to 4 days, or freeze it without the noodles for up to three months.",
    "If you simmer the carcass, skim off extra fat before adding the noodles.",
  ],
  faqs: [
    {
      question: "How long is leftover turkey safe to use in soup?",
      answer:
        "USDA guidance is to refrigerate cooked leftovers within 2 hours (1 hour if it is over 90°F), use them within 3 to 4 days, and reheat leftovers to 165°F. If the turkey has been in the fridge longer than that, freeze it or throw it out instead of making soup.",
    },
  ],
  faqSource: {
    label: "USDA FSIS: Leftovers and Food Safety",
    url: "https://www.fsis.usda.gov/food-safety/safe-food-handling-and-preparation/food-safety-basics/leftovers-and-food-safety",
  },
  pantryStaples: ["cooked turkey", "broth", "egg noodles or rice", "carrots and celery"],
  related: ["easy-vegetable-soup", "sunday-chicken-and-rice", "leftover-vegetable-frittata"],
};
