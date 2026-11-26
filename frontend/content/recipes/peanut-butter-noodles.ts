import type { Recipe } from "./types";

export const peanutButterNoodles: Recipe = {
  slug: "peanut-butter-noodles",
  title: "Peanut Butter Noodles",
  seoTitle: "Peanut Butter Noodles (15-Minute Pantry Dinner)",
  metaSummary: "Quick peanut butter noodles, 15 minutes",
  intro:
    "These are savory peanut butter noodles you can make in about 15 minutes, in the time it takes the pasta to boil. The sauce is pantry peanut butter, soy sauce, and a little vinegar or lime, loosened with hot pasta water. Add a handful of frozen vegetables if you want something green in the bowl.",
  meal: "dinner",
  tags: ["vegetarian", "vegan", "quick"],
  servings: 4,
  prepMin: 5,
  cookMin: 10,
  datePublished: "2026-11-26",
  updated: "2026-11-26",
  image: "/recipes/peanut-butter-noodles.webp",
  imageAlt: "AI-generated illustration of a bowl of peanut butter noodles with green onion, not a photo of this dish",
  ingredients: [
    { qty: 12, unit: "oz", item: "spaghetti or ramen-style noodles" },
    { qty: 1 / 3, unit: "cup", item: "creamy peanut butter" },
    { qty: 3, unit: "tbsp", item: "soy sauce" },
    { qty: 1, unit: "tbsp", item: "rice vinegar or lime juice" },
    { qty: 1, unit: "tbsp", item: "brown sugar or honey" },
    { qty: 1, unit: "tsp", item: "toasted sesame oil", note: "optional" },
    { qty: 1, unit: "clove", item: "garlic", note: "minced or grated" },
    { qty: 0.25, unit: "tsp", item: "red pepper flakes", note: "optional" },
    { qty: 2, item: "green onion", plural: "green onions", note: "sliced" },
  ],
  steps: [
    "Bring a large pot of salted water to a boil and cook the noodles until tender. Scoop out about ¾ cup of the pasta water before you drain them.",
    "While the noodles cook, whisk the peanut butter, soy sauce, vinegar, sugar, sesame oil, garlic, and red pepper flakes in a large bowl. Add ¼ cup of the hot pasta water and whisk until the sauce is smooth.",
    "Add the drained noodles to the bowl and toss, adding more pasta water a little at a time until the sauce coats the noodles and looks glossy.",
    "Top with the green onions and serve warm.",
  ],
  substitutions: [
    "Peanut butter: use almond butter or tahini, and add a splash more soy sauce if the sauce tastes flat.",
    "Soy sauce: use tamari for a gluten-free bowl, and check that the noodles are gluten-free too.",
    "Honey: use maple syrup or brown sugar to keep the recipe vegan.",
    "Noodles: spaghetti, linguine, udon, or leftover cooked noodles all work. Warm leftover noodles in the sauce with a little water.",
    "Add-ins: frozen peas or edamame, stirred into the pasta water for the last 2 minutes, or leftover cooked chicken on top.",
  ],
  tips: [
    "The sauce thickens as it sits. Toss leftovers with a splash of water when you reheat them.",
    "If the peanut butter is very thick, warm it for a few seconds so it whiskes more easily.",
  ],
  pantryStaples: ["peanut butter", "soy sauce", "pasta or noodles", "garlic"],
  related: ["canned-tuna-pasta", "leftover-rice-fried-rice", "canned-chickpea-curry"],
};
