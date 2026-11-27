import type { Recipe } from "./types";

export const rosemaryRoastChicken: Recipe = {
  slug: "rosemary-roast-chicken",
  title: "Rosemary Roast Chicken",
  seoTitle: "Rosemary Roast Chicken for a Holiday Dinner",
  metaSummary: "Rosemary roast chicken, about 100 minutes",
  intro:
    "This is a rosemary roast chicken that takes about 100 minutes, most of it in the oven. A whole chicken is seasoned with rosemary, garlic, lemon, and butter, then roasted until the skin is browned and the juices run clear. It is a straightforward holiday dinner main when you are feeding a smaller table.",
  meal: "dinner",
  tags: ["holiday"],
  servings: 4,
  prepMin: 20,
  cookMin: 80,
  datePublished: "2026-11-26",
  updated: "2026-11-26",
  image: "/recipes/rosemary-roast-chicken.webp",
  imageAlt: "AI-generated illustration of a whole rosemary roast chicken on a platter, not a photo of this dish",
  ingredients: [
    { qty: 1, item: "whole chicken", note: "about 4 pounds", scalable: false },
    { qty: 3, unit: "tbsp", item: "butter", note: "softened" },
    { qty: 3, unit: "clove", item: "garlic", plural: "garlic cloves", note: "minced" },
    { qty: 2, unit: "tsp", item: "chopped fresh rosemary", note: "or 1 teaspoon dried" },
    { qty: 1, item: "lemon", note: "halved", scalable: false },
    { qty: 1, unit: "tsp", item: "kosher salt" },
    { qty: 0.5, unit: "tsp", item: "black pepper" },
  ],
  steps: [
    "Heat the oven to 425°F (220°C). Pat the chicken dry, including the cavity. Stir the butter, garlic, rosemary, salt, and pepper together.",
    "Loosen the skin over the breasts and rub some of the butter underneath. Rub the rest over the outside. Stuff the lemon halves in the cavity and tie the legs with twine.",
    "Set the chicken breast side up on a rack in a roasting pan. Roast for 70 to 85 minutes, until a thermometer in the thickest part of the thigh (not touching bone) reads 165°F (74°C) and the juices run clear.",
    "Rest the chicken for 15 minutes before carving.",
    "Carve into breasts, thighs, and drumsticks, and spoon pan juices over the meat.",
  ],
  substitutions: [
    "Whole chicken: use bone-in chicken pieces (about 3½ pounds) and start checking the temperature at 35 minutes.",
    "Butter: use olive oil, or a mix of oil and butter.",
    "Fresh rosemary: use 1 teaspoon dried rosemary plus ½ teaspoon dried thyme.",
    "Lemon: use a small orange, or skip the citrus and add 1 extra garlic clove.",
  ],
  tips: [
    "If the breast skin browns before the thighs are done, tent the breast with a piece of foil.",
    "Leftover roast chicken can stand in for turkey in leftover turkey sandwiches or leftover turkey soup.",
  ],
  pantryStaples: ["butter", "garlic", "rosemary", "lemon"],
  related: ["sunday-chicken-and-rice", "herb-roasted-pork-loin", "classic-stuffing"],
};
