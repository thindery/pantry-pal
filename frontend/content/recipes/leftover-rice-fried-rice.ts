import type { Recipe } from "./types";

export const leftoverRiceFriedRice: Recipe = {
  slug: "leftover-rice-fried-rice",
  title: "Fried Rice with Leftover Rice",
  seoTitle: "Fried Rice with Leftover Rice (25 Minutes)",
  metaSummary: "Egg fried rice from leftover rice, 25 minutes",
  intro:
    "This is egg fried rice made from cold leftover rice, ready in about 25 minutes. It uses cooked rice from the fridge, eggs, frozen peas and carrots, and soy sauce. Cold rice stays separate and browns in the pan instead of turning mushy.",
  meal: "dinner",
  tags: ["vegetarian", "quick", "leftovers"],
  servings: 4,
  prepMin: 10,
  cookMin: 15,
  datePublished: "2026-11-26",
  updated: "2026-11-26",
  image: "/recipes/leftover-rice-fried-rice.webp",
  imageAlt: "AI-generated illustration of a skillet of egg fried rice with peas, not a photo of this dish",
  ingredients: [
    { qty: 3, unit: "cup", item: "cooked rice", note: "cold, from the fridge" },
    { qty: 2, unit: "tbsp", item: "neutral oil", note: "divided" },
    { qty: 3, item: "large egg", plural: "large eggs", note: "beaten" },
    { qty: 3, item: "green onion", plural: "green onions", note: "sliced, whites and greens kept apart" },
    { qty: 2, unit: "clove", item: "garlic", note: "minced" },
    { qty: 1, unit: "cup", item: "frozen peas and carrots" },
    { qty: 2, unit: "tbsp", item: "soy sauce" },
    { qty: 1, unit: "tsp", item: "toasted sesame oil" },
    { qty: 0.25, unit: "tsp", item: "black pepper" },
  ],
  steps: [
    "Break up any clumps in the cold rice with your fingers so it heats evenly.",
    "Heat a large skillet or wok over medium-high heat and add 1 tablespoon of the oil. Pour in the eggs and scramble for about a minute, until just set. Move them to a plate.",
    "Add the remaining oil, the green onion whites, and the garlic. Stir for 30 seconds.",
    "Add the frozen peas and carrots and cook for 2 minutes.",
    "Add the rice and spread it out. Cook for 3 to 4 minutes, stirring now and then, until the rice is steaming hot and some grains look toasted.",
    "Pour in the soy sauce and sesame oil, add the pepper, and stir to coat. Fold the eggs back in, scatter the green onion tops over the top, and serve.",
  ],
  substitutions: [
    "Peas and carrots: use any frozen vegetable mix, or chopped broccoli, corn, or bell pepper.",
    "Protein: stir in 1 cup of diced leftover chicken, ham, or cooked shrimp with the vegetables.",
    "Soy sauce: use tamari for gluten-free, or add a little extra salt if you are out.",
    "Sesame oil: skip it, or finish with a little more neutral oil.",
    "Green onions: use a small diced yellow onion cooked with the garlic.",
    "Day-old rice: any long-grain white rice works, including leftover takeout rice.",
  ],
  tips: [
    "No leftover rice? Cook a batch, spread it on a baking sheet to cool quickly, and refrigerate it within 2 hours before frying.",
    "A spoonful of chili crisp or a splash of rice vinegar at the end wakes the flavors up.",
  ],
  faqs: [
    {
      question: "Is it safe to use leftover rice for fried rice?",
      answer:
        "Yes, if the rice was cooled and stored properly. USDA guidance is to refrigerate cooked food within 2 hours (1 hour if it is over 90°F), keep it in shallow containers so it cools quickly, use it within 3 to 4 days, and reheat leftovers to 165°F. Throw away rice that has sat out longer than that.",
    },
  ],
  faqSource: {
    label: "USDA FSIS: Leftovers and Food Safety",
    url: "https://www.fsis.usda.gov/food-safety/safe-food-handling-and-preparation/food-safety-basics/leftovers-and-food-safety",
  },
  pantryStaples: ["cooked rice", "eggs", "frozen vegetables", "soy sauce"],
  related: ["leftover-vegetable-frittata", "rice-and-beans-with-canned-beans", "sheet-pan-chicken-and-vegetables"],
};
