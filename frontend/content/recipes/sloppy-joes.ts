import type { Recipe } from "./types";

export const sloppyJoes: Recipe = {
  slug: "sloppy-joes",
  title: "Sloppy Joes",
  seoTitle: "Easy Homemade Sloppy Joes for a Weeknight",
  metaSummary: "Homemade sloppy joes, about 30 minutes",
  intro:
    "These are homemade sloppy joes that take about 30 minutes. Ground beef simmers in a pantry sauce of ketchup, brown sugar, and Worcestershire, then gets spooned onto toasted buns. They are a weeknight lunch or dinner you can keep warm and assemble at the table.",
  meal: "lunch",
  tags: [],
  servings: 6,
  prepMin: 10,
  cookMin: 20,
  datePublished: "2026-11-26",
  updated: "2026-11-26",
  image: "/recipes/sloppy-joes.webp",
  imageAlt: "AI-generated illustration of sloppy joe sandwiches on a plate, not a photo of this dish",
  ingredients: [
    { qty: 1.5, unit: "lb", item: "ground beef" },
    { qty: 1, item: "onion", note: "finely chopped", plural: "onions" },
    { qty: 0.75, unit: "cup", item: "ketchup" },
    { qty: 2, unit: "tbsp", item: "packed brown sugar" },
    { qty: 1, unit: "tbsp", item: "Worcestershire sauce" },
    { qty: 1, unit: "tbsp", item: "yellow mustard" },
    { qty: 0.5, unit: "tsp", item: "salt" },
    { qty: 6, item: "hamburger bun", plural: "hamburger buns", note: "toasted" },
  ],
  steps: [
    "In a large skillet over medium heat, cook the ground beef and onion, breaking up the meat, until the beef is no longer pink and the onion is softened, about 8 minutes. Drain extra fat.",
    "Stir in the ketchup, brown sugar, Worcestershire sauce, mustard, and salt.",
    "Simmer, stirring occasionally, for 8 to 10 minutes, until the sauce is thick and clings to the meat.",
    "Toast the buns.",
    "Spoon the meat onto the buns and serve warm.",
  ],
  substitutions: [
    "Ground beef: use ground turkey; add 1 teaspoon oil to the skillet if the turkey is very lean.",
    "Ketchup: use ½ cup ketchup plus ¼ cup tomato sauce if you want a slightly less sweet filling.",
    "Hamburger buns: use slider buns and make 10 to 12 smaller sandwiches, or serve the meat over rice.",
    "Worcestershire sauce: use 1 teaspoon soy sauce plus 1 teaspoon vinegar.",
  ],
  tips: [
    "Let the sauce simmer long enough to thicken; a watery filling will soak the buns.",
    "Toasting the buns helps them hold up under the sauce.",
  ],
  pantryStaples: ["ground beef", "ketchup", "brown sugar", "hamburger buns"],
  related: ["classic-meatloaf", "weeknight-chili", "leftover-turkey-sandwiches"],
};
