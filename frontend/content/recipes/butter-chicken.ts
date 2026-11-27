import type { Recipe } from "./types";

export const butterChicken: Recipe = {
  slug: "butter-chicken",
  title: "Butter Chicken",
  seoTitle: "Easy Butter Chicken with Tomato and Cream",
  metaSummary: "Butter chicken in a tomato-cream sauce, 40 minutes",
  intro:
    "This is a weeknight butter chicken that takes about 40 minutes. Bite-size chicken simmers in a tomato-butter sauce finished with cream and warm spices. Serve it with rice or naan.",
  meal: "dinner",
  tags: ["one-pot"],
  servings: 4,
  prepMin: 15,
  cookMin: 25,
  datePublished: "2026-11-26",
  updated: "2026-11-26",
  image: "/recipes/butter-chicken.webp",
  imageAlt: "AI-generated illustration of butter chicken in a creamy orange tomato sauce with rice and naan, not a photo of this dish",
  ingredients: [
    { qty: 1.5, unit: "lb", item: "boneless chicken thighs", note: "cut into bite-size pieces" },
    { qty: 1, unit: "can", size: "15 oz", item: "tomato sauce" },
    { qty: 0.5, unit: "cup", item: "heavy cream" },
    { qty: 3, unit: "tbsp", item: "butter" },
    { qty: 1, item: "yellow onion", plural: "yellow onions", note: "finely chopped" },
    { qty: 3, unit: "clove", item: "garlic", plural: "garlic cloves", note: "minced" },
    { qty: 1, unit: "tbsp", item: "garam masala" },
    { qty: 1, unit: "tsp", item: "ground cumin" },
    { qty: 1, unit: "tsp", item: "paprika" },
    { qty: 0.75, unit: "tsp", item: "salt" },
  ],
  steps: [
    "Melt 1 tablespoon of the butter in a wide pot over medium-high heat. Add the chicken and ¼ teaspoon of the salt and cook until the pieces are opaque and lightly browned, about 6 minutes. Transfer the chicken to a plate.",
    "Melt the remaining 2 tablespoons butter in the same pot. Add the onion and cook until soft, about 5 minutes. Stir in the garlic, garam masala, cumin, and paprika and cook for 30 seconds.",
    "Pour in the tomato sauce and the remaining salt. Return the chicken and any juices. Simmer for 10 to 12 minutes, until the chicken is cooked through and the sauce has thickened slightly.",
    "Stir in the cream and simmer 2 minutes more. Taste for salt and serve with rice or naan.",
  ],
  substitutions: [
    "Chicken thighs: use boneless chicken breast, and do not simmer them past cooked through so they stay tender.",
    "Heavy cream: use ½ cup plain yogurt, stirred in off the heat so it does not curdle.",
    "Garam masala: use 2 teaspoons curry powder plus ½ teaspoon cinnamon if that is what you have.",
    "Tomato sauce: use a 15-ounce can of crushed tomatoes, simmered a few minutes longer.",
  ],
  tips: [
    "If the sauce is sharper than you like, a pinch of sugar balances the tomatoes.",
    "Leftovers keep in the fridge for about 3 days; reheat gently until steaming hot.",
  ],
  pantryStaples: ["chicken", "tomato sauce", "cream"],
  related: ["canned-chickpea-curry", "sunday-chicken-and-rice", "rice-and-beans-with-canned-beans"],
};
