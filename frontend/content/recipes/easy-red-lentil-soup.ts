import type { Recipe } from "./types";

export const easyRedLentilSoup: Recipe = {
  slug: "easy-red-lentil-soup",
  title: "Easy Red Lentil Soup",
  seoTitle: "Easy Red Lentil Soup (No Soaking, 40 Minutes)",
  metaSummary: "Easy vegan red lentil soup, no soaking, 40 minutes",
  intro:
    "This is a smooth, lightly spiced red lentil soup that takes about 40 minutes and needs no soaking. It uses dried red lentils, canned tomato paste, and cumin and turmeric from the spice shelf. It is vegan, and a squeeze of lemon at the end keeps it bright.",
  meal: "lunch",
  tags: ["vegan", "vegetarian", "one-pot", "freezer-friendly"],
  servings: 6,
  prepMin: 10,
  cookMin: 30,
  datePublished: "2026-11-26",
  updated: "2026-11-26",
  image: "/recipes/easy-red-lentil-soup.webp",
  imageAlt: "AI-generated illustration of a bowl of orange red lentil soup with a lemon wedge, not a photo of this dish",
  ingredients: [
    { qty: 2, unit: "tbsp", item: "olive oil" },
    { qty: 1, item: "yellow onion", plural: "yellow onions", note: "diced" },
    { qty: 2, item: "carrot", plural: "carrots", note: "diced" },
    { qty: 3, unit: "clove", item: "garlic", note: "minced" },
    { qty: 1, unit: "tbsp", item: "tomato paste" },
    { qty: 1.5, unit: "tsp", item: "ground cumin" },
    { qty: 1, unit: "tsp", item: "ground turmeric" },
    { qty: 1.5, unit: "cup", item: "dried red lentils", note: "rinsed" },
    { qty: 6, unit: "cup", item: "vegetable broth or water" },
    { qty: 1, unit: "tsp", item: "salt", note: "plus more to taste" },
    { qty: 0.5, item: "lemon", plural: "lemons", note: "juiced" },
  ],
  steps: [
    "Warm the oil in a large pot over medium heat. Cook the onion and carrots for about 6 minutes, until the onion is soft.",
    "Stir in the garlic, tomato paste, cumin, and turmeric and cook for 1 minute.",
    "Add the rinsed lentils and the broth. Bring to a boil, then lower the heat and simmer, partly covered, for 20 to 25 minutes, until the lentils have fallen apart.",
    "For a smoother soup, blend about half of it with an immersion blender, or leave it chunky.",
    "Stir in the salt and lemon juice. Taste and add more of either if the soup needs it.",
  ],
  substitutions: [
    "Red lentils: green or brown lentils work, but need 30 to 40 minutes and stay firmer.",
    "Vegetable broth: use water plus an extra ½ teaspoon of salt.",
    "Carrots: use diced sweet potato or celery.",
    "Turmeric: skip it, or add ½ teaspoon of curry powder instead.",
    "Lemon juice: use a splash of vinegar.",
  ],
  tips: [
    "The soup thickens as it rests. Add a splash of water when reheating.",
    "A pinch of red pepper flakes with the spices adds heat.",
    "It freezes well in portions for up to three months.",
  ],
  faqs: [
    {
      question: "Do red lentils need to be soaked?",
      answer:
        "No. Red lentils are split, so they cook in about 20 to 25 minutes without soaking. Rinse them in a strainer first to remove dust, then simmer them in the broth until they fall apart.",
    },
  ],
  pantryStaples: ["red lentils", "tomato paste", "cumin", "turmeric", "vegetable broth"],
  related: ["canned-chickpea-curry", "pasta-e-fagioli", "weeknight-chili"],
};
