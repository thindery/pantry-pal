import type { Recipe } from "./types";

export const sheetPanLemonSalmon: Recipe = {
  slug: "sheet-pan-lemon-salmon",
  title: "Sheet-Pan Lemon Salmon",
  seoTitle: "Sheet-Pan Lemon Salmon with Vegetables",
  metaSummary: "Sheet-pan lemon salmon with vegetables, about 35 minutes",
  intro:
    "This is sheet-pan lemon salmon that takes about 35 minutes. Salmon fillets roast with lemon, potatoes, carrots, asparagus, and broccoli on one pan. It is a weeknight dinner with almost no extra dishes.",
  meal: "dinner",
  tags: ["sheet-pan"],
  servings: 4,
  prepMin: 15,
  cookMin: 20,
  datePublished: "2026-11-26",
  updated: "2026-11-26",
  image: "/recipes/sheet-pan-lemon-salmon.webp",
  imageAlt: "AI-generated illustration of roasted salmon fillets with lemon, potatoes, asparagus, and carrots on a sheet pan, not a photo of this dish",
  ingredients: [
    { qty: 1.5, unit: "lb", item: "salmon fillet", plural: "salmon fillets", note: "4 pieces, skin on or off" },
    { qty: 1, unit: "lb", item: "baby potatoes", note: "halved" },
    { qty: 3, item: "carrot", plural: "carrots", note: "cut into sticks" },
    { qty: 1, unit: "cup", item: "broccoli florets" },
    { qty: 8, unit: "oz", item: "asparagus", note: "trimmed" },
    { qty: 1, item: "lemon", plural: "lemons", note: "sliced, plus extra wedges for serving" },
    { qty: 3, unit: "tbsp", item: "olive oil" },
    { qty: 1, unit: "tsp", item: "salt" },
    { qty: 0.5, unit: "tsp", item: "black pepper" },
  ],
  steps: [
    "Heat the oven to 425°F (220°C). Toss the potatoes and carrots with 2 tablespoons of the oil, ½ teaspoon of the salt, and ¼ teaspoon of the pepper. Spread them on a rimmed sheet pan and roast for 12 minutes.",
    "Toss the broccoli and asparagus with the remaining 1 tablespoon oil. Push the potatoes and carrots aside, add the broccoli and asparagus, and make four spaces for the salmon. Set the fillets on the pan, season with the remaining salt and pepper, and lay lemon slices over the fish.",
    "Roast for 10 to 12 minutes more, until the salmon is opaque and flakes easily and the vegetables are tender.",
    "Serve with extra lemon wedges.",
  ],
  substitutions: [
    "Salmon: use another sturdy fish fillet such as trout or cod, and start checking a couple of minutes earlier if the pieces are thin.",
    "Baby potatoes: use Yukon Gold potatoes, cut into 1-inch pieces.",
    "Asparagus: use green beans, added with the broccoli.",
  ],
  tips: [
    "Starting the potatoes and carrots first keeps them from being underdone when the salmon is ready.",
    "If your fillets are very thick, give them 2 extra minutes and check that they flake in the center.",
  ],
  pantryStaples: ["salmon", "potatoes", "lemon"],
  related: ["sheet-pan-chicken-and-vegetables", "rosemary-roast-chicken", "sunday-chicken-and-rice"],
};
