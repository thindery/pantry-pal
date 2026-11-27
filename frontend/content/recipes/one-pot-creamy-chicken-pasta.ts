import type { Recipe } from "./types";

export const onePotCreamyChickenPasta: Recipe = {
  slug: "one-pot-creamy-chicken-pasta",
  title: "One-Pot Creamy Chicken Pasta",
  seoTitle: "One-Pot Creamy Chicken Pasta for Dinner",
  metaSummary: "Creamy chicken pasta cooked in one pot, about 35 minutes",
  intro:
    "This is a one-pot creamy chicken pasta that takes about 35 minutes. Penne simmers in broth with diced chicken, then cream and Parmesan finish the sauce in the same pot. It is a weeknight dinner with only one pot to wash.",
  meal: "dinner",
  tags: ["one-pot"],
  servings: 4,
  prepMin: 10,
  cookMin: 25,
  datePublished: "2026-11-26",
  updated: "2026-11-26",
  image: "/recipes/one-pot-creamy-chicken-pasta.webp",
  imageAlt: "AI-generated illustration of creamy chicken penne pasta in a skillet, not a photo of this dish",
  ingredients: [
    { qty: 12, unit: "oz", item: "penne pasta" },
    { qty: 1, unit: "lb", item: "boneless chicken breast", note: "cut into bite-size pieces" },
    { qty: 3, unit: "cup", item: "chicken broth" },
    { qty: 0.75, unit: "cup", item: "heavy cream" },
    { qty: 0.75, unit: "cup", item: "grated Parmesan" },
    { qty: 2, unit: "clove", item: "garlic", plural: "garlic cloves", note: "minced" },
    { qty: 1, unit: "tbsp", item: "olive oil" },
    { qty: 0.5, unit: "tsp", item: "salt" },
    { qty: 0.25, unit: "tsp", item: "black pepper" },
  ],
  steps: [
    "Heat the olive oil in a wide pot or deep skillet over medium-high heat. Add the chicken, salt, and pepper, and cook until the pieces are opaque and lightly browned, about 5 minutes. Stir in the garlic for 30 seconds.",
    "Add the penne and chicken broth. Bring to a boil, then reduce the heat to a steady simmer. Cook, stirring often, until the pasta is tender and most of the broth is absorbed, 12 to 15 minutes.",
    "Stir in the cream and Parmesan and cook for 2 to 3 minutes more, until the sauce is creamy and coats the pasta. Add a splash of broth or water if it looks tight.",
    "Taste for salt and pepper, then serve hot.",
  ],
  substitutions: [
    "Penne: use another short pasta such as rigatoni or rotini; add a little broth if it needs more time.",
    "Heavy cream: use ¾ cup half-and-half, and let it simmer a minute longer to thicken.",
    "Chicken breast: use boneless chicken thighs, or 2 cups leftover cooked chicken added with the cream.",
    "Parmesan: use Romano or another hard grating cheese.",
  ],
  tips: [
    "Stir often once the pasta is in so it does not stick to the bottom of the pot.",
    "The sauce thickens as it stands; loosen leftovers with a splash of broth when you reheat them until steaming hot.",
  ],
  pantryStaples: ["penne", "chicken", "cream", "Parmesan"],
  related: ["canned-tuna-pasta", "lasagna-soup", "peanut-butter-noodles"],
};
