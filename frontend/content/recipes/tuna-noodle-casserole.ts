import type { Recipe } from "./types";

export const tunaNoodleCasserole: Recipe = {
  slug: "tuna-noodle-casserole",
  title: "Tuna Noodle Casserole",
  seoTitle: "Easy Tuna Noodle Casserole from the Pantry",
  metaSummary: "Tuna noodle casserole, about 45 minutes",
  intro:
    "This is a tuna noodle casserole that takes about 45 minutes. Canned tuna, egg noodles, peas, and a creamy sauce bake under a breadcrumb topping until the top is golden. It is a pantry dinner that uses ingredients you are likely to already have.",
  meal: "dinner",
  tags: [],
  servings: 6,
  prepMin: 15,
  cookMin: 30,
  datePublished: "2026-11-26",
  updated: "2026-11-26",
  image: "/recipes/tuna-noodle-casserole.webp",
  imageAlt: "AI-generated illustration of tuna noodle casserole with a breadcrumb topping, not a photo of this dish",
  ingredients: [
    { qty: 12, unit: "oz", item: "egg noodles" },
    { qty: 2, unit: "can", size: "5 oz", item: "tuna in water", note: "drained" },
    { qty: 1, unit: "cup", item: "frozen peas" },
    { qty: 1, unit: "can", size: "10.5 oz", item: "cream of mushroom soup" },
    { qty: 1, unit: "cup", item: "milk" },
    { qty: 1, unit: "cup", item: "shredded cheddar" },
    { qty: 0.75, unit: "cup", item: "plain breadcrumbs" },
    { qty: 2, unit: "tbsp", item: "butter", note: "melted" },
    { qty: 0.25, unit: "tsp", item: "black pepper" },
  ],
  steps: [
    "Heat the oven to 375°F (190°C). Grease a 2-quart or 8-inch square baking dish. Cook the egg noodles in salted boiling water until just shy of al dente. Drain.",
    "In a large bowl, stir the soup, milk, cheddar, and pepper until combined. Fold in the noodles, tuna, and peas. Spread the mixture in the dish.",
    "Stir the breadcrumbs with the melted butter and sprinkle them over the top.",
    "Bake for 20 to 25 minutes, until the casserole is bubbling and the topping is golden.",
    "Cool for 5 minutes before serving.",
  ],
  substitutions: [
    "Cream of mushroom soup: use cream of celery or cream of chicken, or 1 cup thick white sauce.",
    "Egg noodles: use 12 ounces of any short pasta.",
    "Frozen peas: use frozen mixed vegetables, thawed.",
    "Cheddar: use Swiss or skip the cheese in the sauce and just use the breadcrumb topping.",
  ],
  tips: [
    "Drain the tuna well so the casserole does not turn watery.",
    "If you do not have breadcrumbs, crush a handful of crackers or potato chips for the topping.",
  ],
  pantryStaples: ["canned tuna", "egg noodles", "cream of mushroom soup", "peas"],
  related: ["canned-tuna-pasta", "baked-mac-and-cheese", "leftover-turkey-pot-pie"],
};
