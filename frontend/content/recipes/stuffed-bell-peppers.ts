import type { Recipe } from "./types";

export const stuffedBellPeppers: Recipe = {
  slug: "stuffed-bell-peppers",
  title: "Stuffed Bell Peppers",
  seoTitle: "Baked Stuffed Bell Peppers with Beef and Rice",
  metaSummary: "Stuffed peppers with beef and rice, 60 minutes",
  intro:
    "These are baked stuffed bell peppers that take about 60 minutes. Pepper halves are filled with seasoned ground beef, rice, and tomato, then baked under cheese until tender. They are a complete weeknight dinner in one dish.",
  meal: "dinner",
  tags: [],
  servings: 6,
  prepMin: 20,
  cookMin: 40,
  datePublished: "2026-11-26",
  updated: "2026-11-26",
  image: "/recipes/stuffed-bell-peppers.webp",
  imageAlt: "AI-generated illustration of baked stuffed red and yellow bell peppers topped with melted cheese, not a photo of this dish",
  ingredients: [
    { qty: 6, item: "bell pepper", plural: "bell peppers", note: "halved lengthwise and seeded" },
    { qty: 1, unit: "lb", item: "ground beef" },
    { qty: 1, unit: "cup", item: "cooked rice" },
    { qty: 1, unit: "can", size: "15 oz", item: "tomato sauce" },
    { qty: 1, item: "yellow onion", plural: "yellow onions", note: "chopped" },
    { qty: 1, unit: "cup", item: "shredded cheddar" },
    { qty: 2, unit: "clove", item: "garlic", plural: "garlic cloves", note: "minced" },
    { qty: 1, unit: "tsp", item: "Italian seasoning" },
    { qty: 0.75, unit: "tsp", item: "salt" },
  ],
  steps: [
    "Heat the oven to 375°F (190°C). Arrange the pepper halves cut side up in a 9×13-inch baking dish. If they wobble, trim a thin slice from the bottom so they sit flat, without cutting through.",
    "Cook the beef and onion in a skillet over medium-high heat until the beef is browned, about 8 minutes. Stir in the garlic, Italian seasoning, and salt for 30 seconds. Take the pan off the heat and stir in the rice and ½ cup of the tomato sauce.",
    "Spoon the filling into the peppers. Pour the remaining tomato sauce around and over them, then sprinkle on the cheese.",
    "Cover with foil and bake for 25 minutes. Uncover and bake 10 to 15 minutes more, until the peppers are tender and the cheese is melted. Rest 5 minutes, then serve.",
  ],
  substitutions: [
    "Ground beef: use ground turkey, or 2 cups cooked lentils for a vegetarian filling.",
    "Cooked rice: use leftover rice, or cooked quinoa.",
    "Cheddar: use mozzarella or Monterey Jack, or skip the cheese.",
  ],
  tips: [
    "A little water or sauce in the bottom of the dish keeps the peppers from scorching.",
    "Leftover peppers keep in the fridge for about 3 days; reheat, covered, until steaming hot.",
  ],
  pantryStaples: ["bell peppers", "ground beef", "rice"],
  related: ["shepherds-pie", "weeknight-chili", "chicken-enchiladas"],
};
