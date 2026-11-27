import type { Recipe } from "./types";

export const pigsInABlanket: Recipe = {
  slug: "pigs-in-a-blanket",
  title: "Pigs in a Blanket",
  seoTitle: "Easy Pigs in a Blanket for a Holiday Party",
  metaSummary: "Pigs in a blanket, about 30 minutes",
  intro:
    "These are pigs in a blanket that take about 30 minutes. Cocktail sausages are wrapped in refrigerated crescent dough and baked until the pastry is golden. They are a familiar holiday party appetizer, and you can use mustard or a little jam for dipping.",
  meal: "snack",
  tags: ["holiday"],
  servings: 8,
  prepMin: 15,
  cookMin: 15,
  datePublished: "2026-11-26",
  updated: "2026-11-26",
  image: "/recipes/pigs-in-a-blanket.webp",
  imageAlt: "AI-generated illustration of baked pigs in a blanket on a platter, not a photo of this dish",
  ingredients: [
    { qty: 1, unit: "can", size: "8 oz", item: "refrigerated crescent roll dough" },
    { qty: 24, item: "cocktail sausage", plural: "cocktail sausages", note: "about 14 ounces, patted dry" },
    { qty: 1, item: "egg", plural: "eggs", note: "beaten with 1 teaspoon water" },
    { qty: 1, unit: "tbsp", item: "everything bagel seasoning", note: "optional" },
    { qty: 0.25, unit: "cup", item: "Dijon mustard", note: "for serving" },
  ],
  steps: [
    "Heat the oven to 375°F (190°C). Line a baking sheet with parchment. Unroll the crescent dough and separate it into triangles. Cut each triangle into 3 long, thin strips.",
    "Wrap one strip around each sausage, starting at the tip and ending with the wide end underneath. Set them seam side down on the sheet, 1 inch apart.",
    "Brush the dough with the beaten egg. Sprinkle with everything bagel seasoning if you are using it.",
    "Bake for 12 to 15 minutes, until the pastry is puffed and deep golden brown.",
    "Cool for 5 minutes, then serve warm with Dijon mustard.",
  ],
  substitutions: [
    "Crescent dough: use puff pastry, thawed and cut into strips, and add 2 to 3 minutes to the bake if needed.",
    "Cocktail sausages: use regular hot dogs or smoked sausages, each cut into 3 or 4 pieces.",
    "Dijon mustard: serve with yellow mustard, ketchup, or a little cranberry sauce.",
    "Everything bagel seasoning: use sesame seeds, or skip the topping.",
  ],
  tips: [
    "Pat the sausages dry so the dough browns instead of steaming.",
    "These are best served soon after baking; reheat leftovers on a sheet at 350°F for 5 to 8 minutes.",
  ],
  pantryStaples: ["crescent dough", "cocktail sausages", "Dijon mustard"],
  related: ["sausage-cheese-balls", "spinach-artichoke-dip", "cranberry-cocktail-meatballs"],
};
