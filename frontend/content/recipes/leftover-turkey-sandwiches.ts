import type { Recipe } from "./types";

export const leftoverTurkeySandwiches: Recipe = {
  slug: "leftover-turkey-sandwiches",
  title: "Leftover Turkey Sandwiches",
  seoTitle: "Leftover Turkey Sandwiches, 15 Minutes",
  metaSummary: "Leftover turkey sandwiches, 15 minutes",
  intro:
    "These leftover turkey sandwiches take about 15 minutes and use sliced cooked turkey, bread, and a few condiments from the fridge. A little mayonnaise, mustard, and cranberry sauce (if you have it) keep the turkey from tasting dry. They are a quiet next-day lunch, not a project.",
  meal: "lunch",
  tags: ["holiday", "leftovers"],
  servings: 4,
  prepMin: 15,
  cookMin: 0,
  datePublished: "2026-11-26",
  updated: "2026-11-26",
  image: "/recipes/leftover-turkey-sandwiches.webp",
  imageAlt: "AI-generated illustration of leftover turkey sandwiches on a cutting board, not a photo of this dish",
  ingredients: [
    { qty: 8, unit: "slice", item: "sandwich bread", note: "or 4 soft rolls, split" },
    { qty: 1, unit: "lb", item: "sliced cooked turkey" },
    { qty: 4, unit: "tbsp", item: "mayonnaise" },
    { qty: 2, unit: "tsp", item: "yellow or Dijon mustard" },
    { qty: 4, unit: "tbsp", item: "cranberry sauce", note: "optional" },
    { qty: 4, unit: "slice", item: "cheese", plural: "slices of cheese", note: "optional" },
    { qty: 4, unit: "slice", item: "lettuce leaf", plural: "lettuce leaves", note: "optional" },
    { qty: null, item: "salt and black pepper", scalable: false },
  ],
  steps: [
    "If you want the bread toasted, toast it lightly. Stir the mayonnaise and mustard together in a small bowl.",
    "Spread the mayonnaise mixture on one side of each slice of bread or on the cut sides of the rolls.",
    "Pile the turkey on four of the slices. Spread cranberry sauce over the turkey if you are using it, and add cheese and lettuce.",
    "Sprinkle with a little salt and pepper, close the sandwiches, and cut them in half.",
    "Serve right away, or wrap them tightly and refrigerate if you are packing lunch.",
  ],
  substitutions: [
    "Sliced turkey: use leftover roast chicken, or warm the turkey in a skillet with a splash of broth if it seems dry.",
    "Mayonnaise: use softened butter, leftover gravy, or a little plain yogurt mixed with mustard.",
    "Cranberry sauce: use jam, chutney, or skip it and add sliced pickles.",
    "Sandwich bread: use rolls, leftover dinner rolls, or pita.",
    "Cheese and lettuce: use whatever is in the fridge, or skip both and keep the sandwich simple.",
  ],
  tips: [
    "Refrigerate leftover turkey within 2 hours of the meal, and use it in sandwiches within 3 to 4 days.",
    "If you are packing the sandwiches, put the cranberry sauce and lettuce between meat and bread so the bread does not go soggy as quickly.",
  ],
  faqs: [
    {
      question: "How long is leftover turkey safe to use in sandwiches?",
      answer:
        "USDA guidance is to refrigerate cooked leftovers within 2 hours (1 hour if it is over 90°F), use them within 3 to 4 days, and keep cold sandwiches cold until you eat them. If the turkey has been in the fridge longer than that, freeze it or throw it out instead of making sandwiches.",
    },
  ],
  faqSource: {
    label: "USDA FSIS: Leftovers and Food Safety",
    url: "https://www.fsis.usda.gov/food-safety/safe-food-handling-and-preparation/food-safety-basics/leftovers-and-food-safety",
  },
  pantryStaples: ["cooked turkey", "sandwich bread", "mayonnaise", "cranberry sauce"],
  related: ["leftover-turkey-soup", "leftover-turkey-pot-pie", "leftover-rice-fried-rice"],
};
