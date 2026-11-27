import type { Recipe } from "./types";

export const spinachArtichokeDip: Recipe = {
  slug: "spinach-artichoke-dip",
  title: "Spinach Artichoke Dip",
  seoTitle: "Spinach Artichoke Dip for a Holiday Party",
  metaSummary: "Spinach artichoke dip, about 35 minutes",
  intro:
    "This is a baked spinach artichoke dip that takes about 35 minutes. Frozen spinach, canned artichokes, cream cheese, sour cream, and mozzarella bake until the edges bubble and the top is lightly browned. Serve it warm with crackers, sliced baguette, or tortilla chips at a holiday party.",
  meal: "snack",
  tags: ["holiday", "vegetarian"],
  servings: 8,
  prepMin: 15,
  cookMin: 20,
  datePublished: "2026-11-26",
  updated: "2026-11-26",
  image: "/recipes/spinach-artichoke-dip.webp",
  imageAlt: "AI-generated illustration of baked spinach artichoke dip in a dish, not a photo of this dish",
  ingredients: [
    { qty: 10, unit: "oz", item: "frozen chopped spinach", note: "thawed and squeezed dry" },
    { qty: 1, unit: "can", size: "14 oz", item: "artichoke hearts", note: "drained and chopped" },
    { qty: 8, unit: "oz", item: "cream cheese", note: "softened" },
    { qty: 0.5, unit: "cup", item: "sour cream" },
    { qty: 0.5, unit: "cup", item: "mayonnaise" },
    { qty: 1.5, unit: "cup", item: "shredded mozzarella" },
    { qty: 0.25, unit: "cup", item: "grated Parmesan" },
    { qty: 2, unit: "clove", item: "garlic", plural: "garlic cloves", note: "minced" },
  ],
  steps: [
    "Heat the oven to 375°F (190°C). Squeeze the thawed spinach very dry in a clean towel.",
    "In a large bowl, stir the cream cheese, sour cream, and mayonnaise until smooth. Fold in the spinach, artichokes, 1 cup of the mozzarella, the Parmesan, and the garlic.",
    "Spread the mixture in a 1-quart baking dish and sprinkle the remaining ½ cup mozzarella on top.",
    "Bake for 18 to 22 minutes, until the edges bubble and the top is lightly browned.",
    "Rest for 5 minutes, then serve warm with crackers, baguette slices, or tortilla chips.",
  ],
  substitutions: [
    "Sour cream: use plain Greek yogurt in the same amount.",
    "Mayonnaise: use an extra ½ cup sour cream; the dip will be a little tangier.",
    "Mozzarella: use shredded Monterey Jack or a mozzarella–provolone blend.",
    "Frozen spinach: use 1 pound fresh spinach, wilted, cooled, and squeezed dry.",
  ],
  tips: [
    "Squeezing the spinach dry keeps the dip from turning watery in the oven.",
    "You can assemble the dip a few hours ahead, cover, and refrigerate; add a few minutes to the bake if it goes in cold.",
  ],
  pantryStaples: ["frozen spinach", "canned artichokes", "cream cheese"],
  related: ["sausage-cheese-balls", "stuffed-mushrooms", "pigs-in-a-blanket"],
};
