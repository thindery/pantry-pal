import type { Recipe } from "./types";

export const brownSugarGlazedHam: Recipe = {
  slug: "brown-sugar-glazed-ham",
  title: "Brown Sugar Glazed Ham",
  seoTitle: "Brown Sugar Glazed Ham for Christmas Dinner",
  metaSummary: "Brown sugar glazed ham, about 2 hours",
  intro:
    "This is a brown sugar glazed ham that takes about 2 hours, most of it in the oven. A fully cooked ham is warmed through, then brushed with a pantry glaze of brown sugar, Dijon mustard, and apple cider vinegar. Slice it at the table for Christmas dinner, and use the leftovers in sandwiches or soup.",
  meal: "dinner",
  tags: ["holiday"],
  servings: 10,
  prepMin: 15,
  cookMin: 105,
  datePublished: "2026-11-26",
  updated: "2026-11-26",
  image: "/recipes/brown-sugar-glazed-ham.webp",
  imageAlt: "AI-generated illustration of a brown sugar glazed ham on a platter, not a photo of this dish",
  ingredients: [
    { qty: 1, item: "fully cooked bone-in ham", note: "about 8 pounds", scalable: false },
    { qty: 1, unit: "cup", item: "packed brown sugar" },
    { qty: 0.25, unit: "cup", item: "Dijon mustard" },
    { qty: 2, unit: "tbsp", item: "apple cider vinegar" },
    { qty: 0.25, unit: "tsp", item: "ground cloves" },
    { qty: 0.25, unit: "tsp", item: "black pepper" },
  ],
  steps: [
    "Heat the oven to 325°F (165°C). Place the ham, cut side down, in a roasting pan. Score the fat in a shallow diamond pattern and pour 1 cup of water into the pan. Cover tightly with foil.",
    "Bake for about 12 to 15 minutes per pound, until a thermometer in the thickest part (not touching bone) reads 140°F (60°C).",
    "Meanwhile, stir the brown sugar, Dijon mustard, vinegar, cloves, and pepper into a thick glaze.",
    "Uncover the ham for the last 25 minutes. Brush on half of the glaze and return it to the oven. Brush on the rest after 15 minutes and bake until the glaze is bubbling and browned in spots.",
    "Rest the ham for 15 minutes, then slice and spoon pan juices over the meat.",
  ],
  substitutions: [
    "Bone-in ham: use a fully cooked boneless ham of similar weight and start checking the temperature 20 minutes earlier.",
    "Dijon mustard: use yellow mustard, or 2 tablespoons mustard plus 2 tablespoons honey.",
    "Apple cider vinegar: use orange juice or pineapple juice; the glaze will be a little sweeter.",
    "Ground cloves: use a pinch of allspice, or skip them if you prefer a milder glaze.",
  ],
  tips: [
    "A spiral-sliced ham works here; keep it covered so the slices do not dry out, and brush glaze between the cuts.",
    "Save the bone for leftover turkey soup or a pot of beans.",
  ],
  pantryStaples: ["brown sugar", "Dijon mustard", "apple cider vinegar"],
  related: ["classic-stuffing", "homemade-cranberry-sauce", "sweet-potato-casserole"],
};
