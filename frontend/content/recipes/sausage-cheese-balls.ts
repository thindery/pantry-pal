import type { Recipe } from "./types";

export const sausageCheeseBalls: Recipe = {
  slug: "sausage-cheese-balls",
  title: "Sausage Cheese Balls",
  seoTitle: "Sausage Cheese Balls, a Holiday Appetizer",
  metaSummary: "Sausage cheese balls, 35 minutes",
  intro:
    "These sausage cheese balls are a party appetizer you can bake in about 35 minutes. The mixture is breakfast sausage, shredded cheese, and all-purpose baking mix, rolled into small balls. They are good on their own or with a little mustard for dipping.",
  meal: "snack",
  tags: ["holiday"],
  servings: 8,
  prepMin: 15,
  cookMin: 20,
  datePublished: "2026-11-26",
  updated: "2026-11-26",
  image: "/recipes/sausage-cheese-balls.webp",
  imageAlt: "AI-generated illustration of baked sausage cheese balls on a platter, not a photo of this dish",
  ingredients: [
    { qty: 1, unit: "lb", item: "uncooked breakfast sausage" },
    { qty: 2, unit: "cup", item: "shredded cheddar cheese" },
    { qty: 1.5, unit: "cup", item: "all-purpose baking mix" },
    { qty: 0.25, unit: "cup", item: "milk", note: "only if the mixture seems dry" },
    { qty: 0.25, unit: "tsp", item: "garlic powder", note: "optional" },
    { qty: 0.25, unit: "tsp", item: "black pepper" },
    { qty: null, item: "mustard, for dipping", note: "optional", scalable: false },
  ],
  steps: [
    "Heat the oven to 375°F (190°C). Line a baking sheet with parchment.",
    "In a large bowl, mix the sausage, cheese, baking mix, garlic powder, and pepper with your hands until the ingredients are evenly combined. If the mixture does not hold together, add the milk a spoonful at a time.",
    "Roll the mixture into 1-inch balls and set them 1 inch apart on the baking sheet. You should get about 24 balls.",
    "Bake for 18 to 22 minutes, until the balls are browned and cooked through in the center.",
    "Let them sit for 5 minutes, then serve warm, with mustard if you like.",
  ],
  substitutions: [
    "Breakfast sausage: use hot sausage, Italian sausage with the casings removed, or a plant-based sausage that can be mixed raw.",
    "Cheddar: use Monterey Jack, a Mexican blend, or a mix of cheddar and Parmesan.",
    "All-purpose baking mix: whisk together 1½ cups all-purpose flour, 2 teaspoons baking powder, 1/2 teaspoon salt, and 2 tablespoons cold butter cut into the flour until it looks like coarse crumbs.",
    "Milk: a beaten egg can stand in for the milk if the mixture is dry.",
    "Garlic powder: use onion powder, a pinch of cayenne, or skip the extra seasoning if the sausage is already spicy.",
  ],
  tips: [
    "You can roll the balls, freeze them on a sheet, and then bag them. Bake from frozen at 375°F, adding a few minutes to the time.",
    "If the sausage is very lean, the balls can taste dry; a little milk in the mixture helps.",
  ],
  pantryStaples: ["breakfast sausage", "cheddar", "baking mix", "milk"],
  related: ["breakfast-casserole", "easy-chocolate-fudge", "green-bean-casserole"],
};
